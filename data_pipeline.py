import pandas as pd
import numpy as np
import boto3
import json
from datetime import datetime, timedelta
import logging
from concurrent.futures import ThreadPoolExecutor
import asyncio
import aioboto3

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataPipeline:
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.s3_client = boto3.client('s3')
        self.lambda_client = boto3.client('lambda')
        
    def extract_work_orders_data(self, days_back=90):
        """Extract work orders data from DynamoDB"""
        logger.info(f"Extracting work orders data for last {days_back} days...")
        
        table = self.dynamodb.Table('condoconnectai-work-orders')
        cutoff_date = datetime.now() - timedelta(days=days_back)
        
        response = table.scan(
            FilterExpression='createdAt >= :cutoff_date',
            ExpressionAttributeValues={':cutoff_date': cutoff_date.isoformat()}
        )
        
        items = response['Items']
        
        # Handle pagination
        while 'LastEvaluatedKey' in response:
            response = table.scan(
                ExclusiveStartKey=response['LastEvaluatedKey'],
                FilterExpression='createdAt >= :cutoff_date',
                ExpressionAttributeValues={':cutoff_date': cutoff_date.isoformat()}
            )
            items.extend(response['Items'])
        
        logger.info(f"Extracted {len(items)} work orders")
        return items
    
    def extract_resident_data(self):
        """Extract resident data from multiple tables"""
        logger.info("Extracting resident data...")
        
        # Extract residents
        residents_table = self.dynamodb.Table('condoconnectai-residents')
        residents_response = residents_table.scan()
        residents = residents_response['Items']
        
        # Extract access logs
        access_table = self.dynamodb.Table('condoconnectai-access-logs')
        cutoff_date = datetime.now() - timedelta(days=30)
        
        access_response = access_table.scan(
            FilterExpression='#timestamp >= :cutoff_date',
            ExpressionAttributeNames={'#timestamp': 'timestamp'},
            ExpressionAttributeValues={':cutoff_date': cutoff_date.isoformat()}
        )
        access_logs = access_response['Items']
        
        # Extract payments
        payments_table = self.dynamodb.Table('condoconnectai-payments')
        payments_response = payments_table.scan()
        payments = payments_response['Items']
        
        logger.info(f"Extracted {len(residents)} residents, {len(access_logs)} access logs, {len(payments)} payments")
        
        return {
            'residents': residents,
            'access_logs': access_logs,
            'payments': payments
        }
    
    def extract_security_data(self, days_back=30):
        """Extract security events and access logs"""
        logger.info(f"Extracting security data for last {days_back} days...")
        
        cutoff_date = datetime.now() - timedelta(days=days_back)
        
        # Security events
        security_table = self.dynamodb.Table('condoconnectai-security-events')
        security_response = security_table.scan(
            FilterExpression='#timestamp >= :cutoff_date',
            ExpressionAttributeNames={'#timestamp': 'timestamp'},
            ExpressionAttributeValues={':cutoff_date': cutoff_date.isoformat()}
        )
        security_events = security_response['Items']
        
        # Access logs
        access_table = self.dynamodb.Table('condoconnectai-access-logs')
        access_response = access_table.scan(
            FilterExpression='#timestamp >= :cutoff_date',
            ExpressionAttributeNames={'#timestamp': 'timestamp'},
            ExpressionAttributeValues={':cutoff_date': cutoff_date.isoformat()}
        )
        access_logs = access_response['Items']
        
        logger.info(f"Extracted {len(security_events)} security events, {len(access_logs)} access logs")
        
        return {
            'security_events': security_events,
            'access_logs': access_logs
        }
    
    def extract_cost_data(self, days_back=90):
        """Extract cost and usage data from CloudWatch and Cost Explorer"""
        logger.info(f"Extracting cost data for last {days_back} days...")
        
        # This would integrate with AWS Cost Explorer API
        # For now, return mock data structure
        cost_data = []
        usage_data = []
        
        # In real implementation, you would:
        # 1. Use Cost Explorer API to get cost data
        # 2. Use CloudWatch API to get usage metrics
        # 3. Combine and structure the data
        
        logger.info(f"Extracted {len(cost_data)} cost records, {len(usage_data)} usage records")
        
        return {
            'cost_data': cost_data,
            'usage_data': usage_data
        }
    
    def transform_work_orders_data(self, raw_data):
        """Transform work orders data for ML training"""
        logger.info("Transforming work orders data...")
        
        df = pd.DataFrame(raw_data)
        
        if df.empty:
            return df
        
        # Convert timestamps
        df['createdAt'] = pd.to_datetime(df['createdAt'])
        if 'completedDate' in df.columns:
            df['completedDate'] = pd.to_datetime(df['completedDate'], errors='coerce')
        if 'scheduledDate' in df.columns:
            df['scheduledDate'] = pd.to_datetime(df['scheduledDate'], errors='coerce')
        
        # Calculate derived features
        df['completion_time_hours'] = (df['completedDate'] - df['createdAt']).dt.total_seconds() / 3600
        df['is_overdue'] = df['completedDate'] > df['scheduledDate']
        
        # Clean and standardize categorical data
        df['priority'] = df['priority'].str.lower()
        df['type'] = df['type'].str.lower()
        df['status'] = df['status'].str.lower()
        
        # Handle missing values
        df['completedDate'] = df['completedDate'].fillna(df['createdAt'])
        df['scheduledDate'] = df['scheduledDate'].fillna(df['createdAt'])
        df['completion_time_hours'] = df['completion_time_hours'].fillna(0)
        
        # Remove outliers
        if 'completion_time_hours' in df.columns:
            Q1 = df['completion_time_hours'].quantile(0.25)
            Q3 = df['completion_time_hours'].quantile(0.75)
            IQR = Q3 - Q1
            df = df[
                (df['completion_time_hours'] >= Q1 - 1.5 * IQR) &
                (df['completion_time_hours'] <= Q3 + 1.5 * IQR)
            ]
        
        logger.info(f"Transformed work orders data: {len(df)} records")
        return df
    
    def transform_resident_data(self, raw_data):
        """Transform resident behavior data for ML training"""
        logger.info("Transforming resident behavior data...")
        
        residents_df = pd.DataFrame(raw_data['residents'])
        access_df = pd.DataFrame(raw_data['access_logs'])
        payments_df = pd.DataFrame(raw_data['payments'])
        
        if residents_df.empty:
            return pd.DataFrame()
        
        # Process access logs
        if not access_df.empty:
            access_df['timestamp'] = pd.to_datetime(access_df['timestamp'])
            
            # Aggregate access patterns
            access_features = access_df.groupby('userId').agg({
                'timestamp': ['count', 'nunique'],
                'location': 'nunique',
                'action': lambda x: (x == 'entry').sum() / len(x) if len(x) > 0 else 0
            }).reset_index()
            
            access_features.columns = ['id', 'total_access_events', 'unique_access_days', 
                                     'unique_locations', 'entry_ratio']
            
            # Merge with residents
            residents_df = residents_df.merge(access_features, on='id', how='left')
        
        # Process payments
        if not payments_df.empty:
            payments_df['date'] = pd.to_datetime(payments_df['date'])
            payments_df['amount'] = pd.to_numeric(payments_df['amount'], errors='coerce')
            
            # Aggregate payment patterns
            payment_features = payments_df.groupby('residentId').agg({
                'amount': ['mean', 'sum', 'count'],
                'status': lambda x: (x == 'completed').sum() / len(x) if len(x) > 0 else 0
            }).reset_index()
            
            payment_features.columns = ['id', 'avg_payment', 'total_payments', 
                                      'payment_count', 'payment_success_rate']
            
            # Merge with residents
            residents_df = residents_df.merge(payment_features, on='id', how='left')
        
        # Fill missing values
        numeric_columns = residents_df.select_dtypes(include=[np.number]).columns
        residents_df[numeric_columns] = residents_df[numeric_columns].fillna(0)
        
        logger.info(f"Transformed resident data: {len(residents_df)} records")
        return residents_df
    
    def transform_security_data(self, raw_data):
        """Transform security data for anomaly detection"""
        logger.info("Transforming security data...")
        
        security_df = pd.DataFrame(raw_data['security_events'])
        access_df = pd.DataFrame(raw_data['access_logs'])
        
        # Combine security events and access logs
        combined_events = []
        
        if not security_df.empty:
            security_df['timestamp'] = pd.to_datetime(security_df['timestamp'])
            security_df['event_source'] = 'security'
            combined_events.append(security_df)
        
        if not access_df.empty:
            access_df['timestamp'] = pd.to_datetime(access_df['timestamp'])
            access_df['event_source'] = 'access'
            combined_events.append(access_df)
        
        if not combined_events:
            return pd.DataFrame()
        
        combined_df = pd.concat(combined_events, ignore_index=True, sort=False)
        
        # Create time-based features
        combined_df['hour'] = combined_df['timestamp'].dt.hour
        combined_df['day_of_week'] = combined_df['timestamp'].dt.dayofweek
        combined_df['is_weekend'] = combined_df['day_of_week'].isin([5, 6]).astype(int)
        combined_df['is_night'] = combined_df['hour'].isin(list(range(22, 24)) + list(range(0, 6))).astype(int)
        
        # Aggregate by time windows
        combined_df['time_window'] = combined_df['timestamp'].dt.floor('H')
        
        aggregated_df = combined_df.groupby('time_window').agg({
            'id': 'count',
            'userId': 'nunique',
            'location': 'nunique',
            'event_source': lambda x: (x == 'security').sum(),
            'hour': 'first',
            'day_of_week': 'first',
            'is_weekend': 'first',
            'is_night': 'first'
        }).reset_index()
        
        aggregated_df.columns = ['time_window', 'total_events', 'unique_users', 
                               'unique_locations', 'security_events', 'hour', 
                               'day_of_week', 'is_weekend', 'is_night']
        
        logger.info(f"Transformed security data: {len(aggregated_df)} time windows")
        return aggregated_df
    
    def load_to_s3(self, data, dataset_name, bucket_name):
        """Load transformed data to S3"""
        logger.info(f"Loading {dataset_name} to S3...")
        
        if isinstance(data, pd.DataFrame):
            if data.empty:
                logger.warning(f"No data to load for {dataset_name}")
                return None
            
            # Convert to JSON
            data_json = data.to_json(orient='records', date_format='iso')
        else:
            data_json = json.dumps(data, default=str)
        
        # Generate S3 key
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        s3_key = f'processed_data/{dataset_name}/{timestamp}.json'
        
        # Upload to S3
        self.s3_client.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=data_json,
            ContentType='application/json'
        )
        
        s3_path = f's3://{bucket_name}/{s3_key}'
        logger.info(f"Data loaded to {s3_path}")
        
        return s3_path
    
    def trigger_training_pipeline(self, dataset_paths):
        """Trigger ML training pipeline with processed data"""
        logger.info("Triggering training pipeline...")
        
        payload = {
            'action': 'train_all_models',
            'dataset_paths': dataset_paths,
            'timestamp': datetime.now().isoformat()
        }
        
        # Invoke training Lambda function
        response = self.lambda_client.invoke(
            FunctionName='condoconnectai-model-training',
            InvocationType='Event',  # Asynchronous
            Payload=json.dumps(payload)
        )
        
        logger.info(f"Training pipeline triggered. Response: {response['StatusCode']}")
        return response
    
    def run_full_pipeline(self, bucket_name='condoconnectai-data'):
        """Run the complete data pipeline"""
        logger.info("Starting full data pipeline...")
        
        dataset_paths = {}
        
        try:
            # Extract and transform work orders data
            work_orders_raw = self.extract_work_orders_data()
            work_orders_transformed = self.transform_work_orders_data(work_orders_raw)
            work_orders_path = self.load_to_s3(work_orders_transformed, 'work_orders', bucket_name)
            if work_orders_path:
                dataset_paths['work_orders'] = work_orders_path
            
            # Extract and transform resident data
            resident_raw = self.extract_resident_data()
            resident_transformed = self.transform_resident_data(resident_raw)
            resident_path = self.load_to_s3(resident_transformed, 'resident_behavior', bucket_name)
            if resident_path:
                dataset_paths['resident_behavior'] = resident_path
            
            # Extract and transform security data
            security_raw = self.extract_security_data()
            security_transformed = self.transform_security_data(security_raw)
            security_path = self.load_to_s3(security_transformed, 'security_events', bucket_name)
            if security_path:
                dataset_paths['security_events'] = security_path
            
            # Extract and transform cost data
            cost_raw = self.extract_cost_data()
            cost_path = self.load_to_s3(cost_raw, 'cost_optimization', bucket_name)
            if cost_path:
                dataset_paths['cost_optimization'] = cost_path
            
            # Trigger training pipeline if we have data
            if dataset_paths:
                self.trigger_training_pipeline(dataset_paths)
            
            logger.info("Full data pipeline completed successfully!")
            return dataset_paths
            
        except Exception as e:
            logger.error(f"Data pipeline failed: {str(e)}")
            raise
    
    def schedule_pipeline(self, schedule_expression='rate(1 day)'):
        """Schedule the data pipeline to run automatically"""
        logger.info(f"Scheduling pipeline with expression: {schedule_expression}")
        
        # This would set up CloudWatch Events rule to trigger the pipeline
        # Implementation depends on your deployment setup
        
        return {
            'schedule_expression': schedule_expression,
            'status': 'scheduled'
        }

def lambda_handler(event, context):
    """Lambda handler for the data pipeline"""
    pipeline = DataPipeline()
    
    try:
        # Check if this is a scheduled run or manual trigger
        if event.get('source') == 'aws.events':
            # Scheduled run
            result = pipeline.run_full_pipeline()
        else:
            # Manual trigger with specific parameters
            bucket_name = event.get('bucket_name', 'condoconnectai-data')
            result = pipeline.run_full_pipeline(bucket_name)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Data pipeline completed successfully',
                'dataset_paths': result
            })
        }
        
    except Exception as e:
        logger.error(f"Pipeline execution failed: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }

def main():
    """Main function for local testing"""
    pipeline = DataPipeline()
    
    try:
        result = pipeline.run_full_pipeline()
        print(f"Pipeline completed successfully. Dataset paths: {result}")
        
    except Exception as e:
        print(f"Pipeline failed: {str(e)}")
        raise

if __name__ == "__main__":
    main()
