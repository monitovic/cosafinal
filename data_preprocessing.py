import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import boto3
import json
import logging
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder
from sklearn.impute import SimpleImputer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataPreprocessor:
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.s3_client = boto3.client('s3')
        
    def preprocess_work_orders(self, raw_data):
        """Preprocess work orders data for ML training"""
        logger.info("Preprocessing work orders data...")
        
        df = pd.DataFrame(raw_data)
        
        if df.empty:
            logger.warning("No work orders data to preprocess")
            return df
        
        # Convert timestamps
        timestamp_columns = ['createdAt', 'completedDate', 'scheduledDate']
        for col in timestamp_columns:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors='coerce')
        
        # Handle missing values
        df['completedDate'] = df['completedDate'].fillna(df['createdAt'])
        df['scheduledDate'] = df['scheduledDate'].fillna(df['createdAt'])
        
        # Create derived features
        df['completion_time_hours'] = (df['completedDate'] - df['createdAt']).dt.total_seconds() / 3600
        df['scheduled_delay_hours'] = (df['completedDate'] - df['scheduledDate']).dt.total_seconds() / 3600
        
        # Time-based features
        df['created_month'] = df['createdAt'].dt.month
        df['created_day_of_week'] = df['createdAt'].dt.dayofweek
        df['created_hour'] = df['createdAt'].dt.hour
        df['is_weekend'] = df['created_day_of_week'].isin([5, 6]).astype(int)
        
        # Categorical encoding
        categorical_columns = ['priority', 'type', 'status']
        for col in categorical_columns:
            if col in df.columns:
                le = LabelEncoder()
                df[f'{col}_encoded'] = le.fit_transform(df[col].astype(str))
        
        # Location-based features
        if 'location' in df.columns:
            location_stats = df.groupby('location').agg({
                'id': 'count',
                'completion_time_hours': 'mean',
                'priority_encoded': 'mean'
            }).rename(columns={
                'id': 'location_frequency',
                'completion_time_hours': 'location_avg_completion_time',
                'priority_encoded': 'location_avg_priority'
            })
            
            df = df.merge(location_stats, left_on='location', right_index=True, how='left')
        
        # Remove outliers
        df = self._remove_outliers(df, ['completion_time_hours'], method='iqr')
        
        logger.info(f"Preprocessed {len(df)} work orders")
        return df
    
    def preprocess_resident_behavior(self, access_data, payment_data, resident_data):
        """Preprocess resident behavior data"""
        logger.info("Preprocessing resident behavior data...")
        
        access_df = pd.DataFrame(access_data)
        payment_df = pd.DataFrame(payment_data)
        resident_df = pd.DataFrame(resident_data)
        
        if resident_df.empty:
            logger.warning("No resident data to preprocess")
            return pd.DataFrame()
        
        # Process access data
        if not access_df.empty:
            access_df['timestamp'] = pd.to_datetime(access_df['timestamp'])
            
            # Aggregate access patterns by resident
            access_features = access_df.groupby('userId').agg({
                'timestamp': ['count', 'nunique'],
                'location': 'nunique',
                'action': lambda x: (x == 'entry').sum() / len(x) if len(x) > 0 else 0
            }).reset_index()
            
            access_features.columns = ['id', 'total_access_events', 'unique_access_days', 
                                     'unique_locations_accessed', 'entry_ratio']
            
            # Time-based access patterns
            access_df['hour'] = access_df['timestamp'].dt.hour
            access_df['day_of_week'] = access_df['timestamp'].dt.dayofweek
            
            # Peak usage patterns
            peak_hours = access_df.groupby('userId')['hour'].apply(
                lambda x: x.mode().iloc[0] if not x.mode().empty else 12
            ).reset_index()
            peak_hours.columns = ['id', 'peak_access_hour']
            
            access_features = access_features.merge(peak_hours, on='id', how='left')
        else:
            access_features = pd.DataFrame(columns=['id'])
        
        # Process payment data
        if not payment_df.empty:
            payment_df['date'] = pd.to_datetime(payment_df['date'])
            payment_df['amount'] = pd.to_numeric(payment_df['amount'], errors='coerce')
            
            # Aggregate payment patterns by resident
            payment_features = payment_df.groupby('residentId').agg({
                'amount': ['mean', 'std', 'sum', 'count'],
                'status': lambda x: (x == 'completed').sum() / len(x) if len(x) > 0 else 0,
                'date': lambda x: (x.max() - x.min()).days if len(x) > 1 else 0
            }).reset_index()
            
            payment_features.columns = ['id', 'avg_payment_amount', 'payment_amount_std',
                                      'total_payment_amount', 'payment_count',
                                      'payment_success_rate', 'payment_span_days']
            
            # Payment frequency
            payment_features['payment_frequency'] = payment_features['payment_span_days'] / payment_features['payment_count']
            payment_features['payment_frequency'] = payment_features['payment_frequency'].fillna(0)
        else:
            payment_features = pd.DataFrame(columns=['id'])
        
        # Merge all features
        result_df = resident_df.copy()
        
        if not access_features.empty:
            result_df = result_df.merge(access_features, on='id', how='left')
        
        if not payment_features.empty:
            result_df = result_df.merge(payment_features, on='id', how='left')
        
        # Fill missing values
        numeric_columns = result_df.select_dtypes(include=[np.number]).columns
        result_df[numeric_columns] = result_df[numeric_columns].fillna(0)
        
        # Create engagement score
        result_df['engagement_score'] = self._calculate_engagement_score(result_df)
        
        # Categorize engagement
        result_df['engagement_level'] = pd.cut(
            result_df['engagement_score'],
            bins=[0, 25, 50, 75, 100],
            labels=['very_low', 'low', 'medium', 'high'],
            include_lowest=True
        )
        
        logger.info(f"Preprocessed behavior data for {len(result_df)} residents")
        return result_df
    
    def preprocess_security_events(self, security_data, access_data):
        """Preprocess security events for anomaly detection"""
        logger.info("Preprocessing security events data...")
        
        security_df = pd.DataFrame(security_data)
        access_df = pd.DataFrame(access_data)
        
        if security_df.empty and access_df.empty:
            logger.warning("No security data to preprocess")
            return pd.DataFrame()
        
        combined_events = []
        
        # Process security events
        if not security_df.empty:
            security_df['timestamp'] = pd.to_datetime(security_df['timestamp'])
            security_df['event_type'] = 'security'
            combined_events.append(security_df)
        
        # Process access logs as security events
        if not access_df.empty:
            access_df['timestamp'] = pd.to_datetime(access_df['timestamp'])
            access_df['event_type'] = 'access'
            combined_events.append(access_df)
        
        if not combined_events:
            return pd.DataFrame()
        
        # Combine all events
        all_events = pd.concat(combined_events, ignore_index=True, sort=False)
        
        # Time-based features
        all_events['hour'] = all_events['timestamp'].dt.hour
        all_events['day_of_week'] = all_events['timestamp'].dt.dayofweek
        all_events['is_weekend'] = all_events['day_of_week'].isin([5, 6]).astype(int)
        all_events['is_night'] = all_events['hour'].isin(range(22, 24) + range(0, 6)).astype(int)
        
        # Aggregate by time windows
        all_events['date'] = all_events['timestamp'].dt.date
        all_events['hour_window'] = all_events['timestamp'].dt.floor('H')
        
        # Event frequency features
        hourly_counts = all_events.groupby(['date', 'hour']).size().reset_index(name='events_per_hour')
        daily_counts = all_events.groupby('date').size().reset_index(name='events_per_day')
        
        # User-based features
        if 'userId' in all_events.columns:
            user_features = all_events.groupby('userId').agg({
                'timestamp': 'count',
                'hour': lambda x: x.std(),
                'is_weekend': 'mean',
                'is_night': 'mean'
            }).reset_index()
            
            user_features.columns = ['userId', 'total_events', 'hour_variance', 
                                   'weekend_ratio', 'night_ratio']
        
        logger.info(f"Preprocessed {len(all_events)} security events")
        return all_events
    
    def preprocess_cost_data(self, cost_data, usage_data):
        """Preprocess cost and usage data for optimization"""
        logger.info("Preprocessing cost optimization data...")
        
        cost_df = pd.DataFrame(cost_data)
        usage_df = pd.DataFrame(usage_data)
        
        if cost_df.empty:
            logger.warning("No cost data to preprocess")
            return pd.DataFrame()
        
        # Convert date columns
        if 'date' in cost_df.columns:
            cost_df['date'] = pd.to_datetime(cost_df['date'])
        
        if 'date' in usage_df.columns:
            usage_df['date'] = pd.to_datetime(usage_df['date'])
        
        # Merge cost and usage data
        if not usage_df.empty:
            merged_df = cost_df.merge(usage_df, on=['date', 'service'], how='left')
        else:
            merged_df = cost_df.copy()
        
        # Fill missing usage data
        usage_columns = ['requests', 'data_transfer', 'storage', 'compute_time']
        for col in usage_columns:
            if col in merged_df.columns:
                merged_df[col] = merged_df[col].fillna(0)
        
        # Calculate efficiency metrics
        if 'cost' in merged_df.columns and 'requests' in merged_df.columns:
            merged_df['cost_per_request'] = merged_df['cost'] / (merged_df['requests'] + 1)
        
        if 'cost' in merged_df.columns and 'storage' in merged_df.columns:
            merged_df['cost_per_gb'] = merged_df['cost'] / (merged_df['storage'] + 1)
        
        # Time-based features
        if 'date' in merged_df.columns:
            merged_df['month'] = merged_df['date'].dt.month
            merged_df['day_of_week'] = merged_df['date'].dt.dayofweek
            merged_df['is_weekend'] = merged_df['day_of_week'].isin([5, 6]).astype(int)
        
        # Service-based features
        if 'service' in merged_df.columns:
            service_stats = merged_df.groupby('service')['cost'].agg(['mean', 'std']).reset_index()
            service_stats.columns = ['service', 'service_avg_cost', 'service_cost_std']
            merged_df = merged_df.merge(service_stats, on='service', how='left')
        
        # Remove outliers
        if 'cost' in merged_df.columns:
            merged_df = self._remove_outliers(merged_df, ['cost'], method='iqr')
        
        logger.info(f"Preprocessed cost data for {len(merged_df)} records")
        return merged_df
    
    def _calculate_engagement_score(self, df):
        """Calculate engagement score based on access and payment patterns"""
        score = 0
        
        # Access-based scoring (0-50 points)
        if 'total_access_events' in df.columns:
            access_score = np.minimum(df['total_access_events'] / 10 * 25, 25)
            score += access_score
        
        if 'unique_access_days' in df.columns:
            consistency_score = np.minimum(df['unique_access_days'] / 30 * 25, 25)
            score += consistency_score
        
        # Payment-based scoring (0-50 points)
        if 'payment_success_rate' in df.columns:
            payment_score = df['payment_success_rate'] * 30
            score += payment_score
        
        if 'payment_count' in df.columns:
            frequency_score = np.minimum(df['payment_count'] / 12 * 20, 20)
            score += frequency_score
        
        return np.minimum(score, 100)
    
    def _remove_outliers(self, df, columns, method='iqr'):
        """Remove outliers from specified columns"""
        df_clean = df.copy()
        
        for col in columns:
            if col not in df_clean.columns:
                continue
                
            if method == 'iqr':
                Q1 = df_clean[col].quantile(0.25)
                Q3 = df_clean[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                
                df_clean = df_clean[
                    (df_clean[col] >= lower_bound) & 
                    (df_clean[col] <= upper_bound)
                ]
            
            elif method == 'zscore':
                z_scores = np.abs((df_clean[col] - df_clean[col].mean()) / df_clean[col].std())
                df_clean = df_clean[z_scores < 3]
        
        removed_count = len(df) - len(df_clean)
        if removed_count > 0:
            logger.info(f"Removed {removed_count} outliers from {columns}")
        
        return df_clean
    
    def save_preprocessed_data(self, data, dataset_name, s3_bucket):
        """Save preprocessed data to S3"""
        if data.empty:
            logger.warning(f"No data to save for {dataset_name}")
            return None
        
        # Convert to JSON for storage
        data_json = data.to_json(orient='records', date_format='iso')
        
        # Save to S3
        s3_key = f'preprocessed_data/{dataset_name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        
        self.s3_client.put_object(
            Bucket=s3_bucket,
            Key=s3_key,
            Body=data_json,
            ContentType='application/json'
        )
        
        logger.info(f"Saved preprocessed data to s3://{s3_bucket}/{s3_key}")
        return f's3://{s3_bucket}/{s3_key}'

def main():
    """Main preprocessing pipeline"""
    preprocessor = DataPreprocessor()
    
    # Load raw data (this would come from your data sources)
    work_orders_raw = load_raw_work_orders()
    access_raw = load_raw_access_logs()
    payment_raw = load_raw_payments()
    resident_raw = load_raw_residents()
    security_raw = load_raw_security_events()
    cost_raw = load_raw_cost_data()
    usage_raw = load_raw_usage_data()
    
    s3_bucket = 'condoconnectai-data'
    
    try:
        # Preprocess work orders
        work_orders_processed = preprocessor.preprocess_work_orders(work_orders_raw)
        preprocessor.save_preprocessed_data(work_orders_processed, 'work_orders', s3_bucket)
        
        # Preprocess resident behavior
        resident_behavior_processed = preprocessor.preprocess_resident_behavior(
            access_raw, payment_raw, resident_raw
        )
        preprocessor.save_preprocessed_data(resident_behavior_processed, 'resident_behavior', s3_bucket)
        
        # Preprocess security events
        security_processed = preprocessor.preprocess_security_events(security_raw, access_raw)
        preprocessor.save_preprocessed_data(security_processed, 'security_events', s3_bucket)
        
        # Preprocess cost data
        cost_processed = preprocessor.preprocess_cost_data(cost_raw, usage_raw)
        preprocessor.save_preprocessed_data(cost_processed, 'cost_optimization', s3_bucket)
        
        logger.info("All data preprocessing completed successfully!")
        
    except Exception as e:
        logger.error(f"Preprocessing pipeline failed: {str(e)}")
        raise

def load_raw_work_orders():
    """Load raw work orders data"""
    return []

def load_raw_access_logs():
    """Load raw access logs data"""
    return []

def load_raw_payments():
    """Load raw payments data"""
    return []

def load_raw_residents():
    """Load raw residents data"""
    return []

def load_raw_security_events():
    """Load raw security events data"""
    return []

def load_raw_cost_data():
    """Load raw cost data"""
    return []

def load_raw_usage_data():
    """Load raw usage data"""
    return []

if __name__ == "__main__":
    main()
