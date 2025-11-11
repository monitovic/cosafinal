# ============= PREDICTIVE MAINTENANCE AI SERVICE =============
import json
import boto3
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import joblib
from sklearn.ensemble import RandomForestRegressor, IsolationForest
from sklearn.preprocessing import StandardScaler
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS clients
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
sns = boto3.client('sns')

# Environment variables
WORK_ORDERS_TABLE = os.environ.get('WORK_ORDERS_TABLE')
PREDICTIONS_TABLE = os.environ.get('PREDICTIONS_TABLE')
MODEL_BUCKET = os.environ.get('MODEL_BUCKET')
SNS_TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN')

def lambda_handler(event, context):
    """
    Main handler for predictive maintenance AI service
    """
    try:
        # Parse the event
        action = event.get('action', 'predict')
        
        if action == 'predict':
            return predict_maintenance_needs(event)
        elif action == 'train':
            return train_maintenance_model(event)
        elif action == 'analyze_anomalies':
            return analyze_maintenance_anomalies(event)
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid action specified'})
            }
            
    except Exception as e:
        logger.error(f"Error in predictive maintenance service: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def predict_maintenance_needs(event):
    """
    Predict future maintenance needs based on historical data
    """
    try:
        # Load historical work orders
        work_orders_df = load_work_orders_data()
        
        if work_orders_df.empty:
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'predictions': [],
                    'message': 'No historical data available for predictions'
                })
            }
        
        # Load trained model
        model = load_maintenance_model()
        
        # Prepare features for prediction
        features_df = prepare_maintenance_features(work_orders_df)
        
        # Make predictions
        predictions = model.predict(features_df)
        
        # Generate maintenance recommendations
        recommendations = generate_maintenance_recommendations(features_df, predictions)
        
        # Store predictions in database
        store_predictions(recommendations)
        
        # Send alerts for high-priority predictions
        send_maintenance_alerts(recommendations)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'predictions': recommendations,
                'total_predictions': len(recommendations),
                'timestamp': datetime.now().isoformat()
            })
        }
        
    except Exception as e:
        logger.error(f"Error in maintenance prediction: {str(e)}")
        raise

def train_maintenance_model(event):
    """
    Train the predictive maintenance model with latest data
    """
    try:
        # Load training data
        work_orders_df = load_work_orders_data()
        
        if len(work_orders_df) < 100:  # Minimum data requirement
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Insufficient data for training (minimum 100 records required)'
                })
            }
        
        # Prepare training features and targets
        X, y = prepare_training_data(work_orders_df)
        
        # Train the model
        model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        
        model.fit(X, y)
        
        # Evaluate model performance
        score = model.score(X, y)
        feature_importance = dict(zip(X.columns, model.feature_importances_))
        
        # Save model to S3
        model_key = save_model_to_s3(model, 'maintenance_predictor')
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Model trained successfully',
                'model_score': score,
                'feature_importance': feature_importance,
                'model_location': model_key,
                'training_samples': len(X)
            })
        }
        
    except Exception as e:
        logger.error(f"Error in model training: {str(e)}")
        raise

def analyze_maintenance_anomalies(event):
    """
    Detect anomalies in maintenance patterns
    """
    try:
        # Load recent work orders
        work_orders_df = load_recent_work_orders(days=30)
        
        if work_orders_df.empty:
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'anomalies': [],
                    'message': 'No recent data available for anomaly detection'
                })
            }
        
        # Prepare features for anomaly detection
        features_df = prepare_anomaly_features(work_orders_df)
        
        # Train isolation forest for anomaly detection
        isolation_forest = IsolationForest(
            contamination=0.1,
            random_state=42
        )
        
        anomaly_scores = isolation_forest.fit_predict(features_df)
        
        # Identify anomalies
        anomalies = identify_anomalies(work_orders_df, anomaly_scores)
        
        # Send alerts for critical anomalies
        send_anomaly_alerts(anomalies)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'anomalies': anomalies,
                'total_anomalies': len(anomalies),
                'analysis_period': '30 days'
            })
        }
        
    except Exception as e:
        logger.error(f"Error in anomaly analysis: {str(e)}")
        raise

def load_work_orders_data():
    """
    Load work orders data from DynamoDB
    """
    table = dynamodb.Table(WORK_ORDERS_TABLE)
    
    response = table.scan()
    items = response['Items']
    
    # Handle pagination
    while 'LastEvaluatedKey' in response:
        response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        items.extend(response['Items'])
    
    # Convert to DataFrame
    df = pd.DataFrame(items)
    
    if not df.empty:
        # Convert date strings to datetime
        df['createdAt'] = pd.to_datetime(df['createdAt'])
        if 'completedDate' in df.columns:
            df['completedDate'] = pd.to_datetime(df['completedDate'])
        if 'scheduledDate' in df.columns:
            df['scheduledDate'] = pd.to_datetime(df['scheduledDate'])
    
    return df

def load_recent_work_orders(days=30):
    """
    Load recent work orders for anomaly detection
    """
    cutoff_date = datetime.now() - timedelta(days=days)
    
    table = dynamodb.Table(WORK_ORDERS_TABLE)
    
    # Use scan with filter for recent items
    response = table.scan(
        FilterExpression='createdAt >= :cutoff_date',
        ExpressionAttributeValues={
            ':cutoff_date': cutoff_date.isoformat()
        }
    )
    
    items = response['Items']
    df = pd.DataFrame(items)
    
    if not df.empty:
        df['createdAt'] = pd.to_datetime(df['createdAt'])
    
    return df

def prepare_maintenance_features(df):
    """
    Prepare features for maintenance prediction
    """
    # Create time-based features
    df['month'] = df['createdAt'].dt.month
    df['day_of_week'] = df['createdAt'].dt.dayofweek
    df['hour'] = df['createdAt'].dt.hour
    
    # Create categorical encodings
    priority_mapping = {'low': 1, 'medium': 2, 'high': 3, 'critical': 4}
    df['priority_encoded'] = df['priority'].map(priority_mapping)
    
    type_mapping = {
        'plumbing': 1, 'electrical': 2, 'hvac': 3, 'cleaning': 4,
        'painting': 5, 'landscaping': 6, 'security': 7, 'other': 8
    }
    df['type_encoded'] = df['type'].map(type_mapping)
    
    # Calculate maintenance frequency by location
    location_counts = df['location'].value_counts()
    df['location_frequency'] = df['location'].map(location_counts)
    
    # Calculate average completion time by type
    if 'completedDate' in df.columns:
        df['completion_time'] = (df['completedDate'] - df['createdAt']).dt.total_seconds() / 3600
        type_avg_time = df.groupby('type')['completion_time'].mean()
        df['type_avg_completion'] = df['type'].map(type_avg_time)
    
    # Select features for prediction
    feature_columns = [
        'month', 'day_of_week', 'hour', 'priority_encoded', 
        'type_encoded', 'location_frequency'
    ]
    
    if 'type_avg_completion' in df.columns:
        feature_columns.append('type_avg_completion')
    
    return df[feature_columns].fillna(0)

def prepare_training_data(df):
    """
    Prepare training data with features and targets
    """
    # Prepare features
    X = prepare_maintenance_features(df)
    
    # Create target variable (days until next maintenance)
    df_sorted = df.sort_values(['location', 'createdAt'])
    df_sorted['next_maintenance_days'] = df_sorted.groupby('location')['createdAt'].diff().dt.days
    
    # Remove rows without target values
    valid_indices = df_sorted['next_maintenance_days'].notna()
    X = X[valid_indices]
    y = df_sorted[valid_indices]['next_maintenance_days']
    
    return X, y

def prepare_anomaly_features(df):
    """
    Prepare features for anomaly detection
    """
    # Aggregate by day and location
    daily_stats = df.groupby([df['createdAt'].dt.date, 'location']).agg({
        'id': 'count',  # Number of work orders
        'priority': lambda x: (x == 'critical').sum(),  # Critical issues
        'type': 'nunique'  # Variety of issue types
    }).reset_index()
    
    daily_stats.columns = ['date', 'location', 'work_order_count', 'critical_count', 'type_variety']
    
    # Calculate rolling averages
    daily_stats['work_order_avg_7d'] = daily_stats.groupby('location')['work_order_count'].rolling(7).mean().values
    daily_stats['critical_avg_7d'] = daily_stats.groupby('location')['critical_count'].rolling(7).mean().values
    
    # Fill NaN values
    feature_columns = ['work_order_count', 'critical_count', 'type_variety', 'work_order_avg_7d', 'critical_avg_7d']
    return daily_stats[feature_columns].fillna(0)

def load_maintenance_model():
    """
    Load trained model from S3
    """
    try:
        # Download model from S3
        model_key = 'models/maintenance_predictor.joblib'
        local_path = '/tmp/maintenance_model.joblib'
        
        s3.download_file(MODEL_BUCKET, model_key, local_path)
        
        # Load model
        model = joblib.load(local_path)
        return model
        
    except Exception as e:
        logger.warning(f"Could not load existing model: {str(e)}")
        # Return a simple default model
        return RandomForestRegressor(n_estimators=10, random_state=42)

def save_model_to_s3(model, model_name):
    """
    Save trained model to S3
    """
    local_path = f'/tmp/{model_name}.joblib'
    s3_key = f'models/{model_name}.joblib'
    
    # Save model locally
    joblib.dump(model, local_path)
    
    # Upload to S3
    s3.upload_file(local_path, MODEL_BUCKET, s3_key)
    
    return s3_key

def generate_maintenance_recommendations(features_df, predictions):
    """
    Generate maintenance recommendations based on predictions
    """
    recommendations = []
    
    for i, prediction in enumerate(predictions):
        if prediction < 7:  # Maintenance needed within 7 days
            priority = 'high' if prediction < 3 else 'medium'
            
            recommendation = {
                'id': f'pred_{i}_{int(datetime.now().timestamp())}',
                'predicted_days': float(prediction),
                'priority': priority,
                'recommendation': get_maintenance_recommendation(prediction),
                'confidence': calculate_confidence(features_df.iloc[i]),
                'created_at': datetime.now().isoformat()
            }
            
            recommendations.append(recommendation)
    
    return recommendations

def get_maintenance_recommendation(days):
    """
    Get maintenance recommendation based on predicted days
    """
    if days < 1:
        return "Immediate maintenance required - schedule emergency repair"
    elif days < 3:
        return "Urgent maintenance needed - schedule within 24-48 hours"
    elif days < 7:
        return "Preventive maintenance recommended - schedule within the week"
    else:
        return "Monitor condition - maintenance may be needed soon"

def calculate_confidence(features):
    """
    Calculate confidence score for prediction
    """
    # Simple confidence calculation based on feature completeness
    non_zero_features = (features != 0).sum()
    total_features = len(features)
    
    confidence = (non_zero_features / total_features) * 100
    return min(confidence, 95.0)  # Cap at 95%

def identify_anomalies(df, anomaly_scores):
    """
    Identify and format anomalies
    """
    anomalies = []
    
    anomaly_indices = np.where(anomaly_scores == -1)[0]
    
    for idx in anomaly_indices:
        row = df.iloc[idx]
        
        anomaly = {
            'id': row['id'],
            'type': row['type'],
            'location': row['location'],
            'priority': row['priority'],
            'created_at': row['createdAt'].isoformat(),
            'anomaly_type': determine_anomaly_type(row),
            'severity': 'high' if row['priority'] == 'critical' else 'medium'
        }
        
        anomalies.append(anomaly)
    
    return anomalies

def determine_anomaly_type(row):
    """
    Determine the type of anomaly
    """
    if row['priority'] == 'critical':
        return 'critical_issue_spike'
    elif row['type'] in ['electrical', 'plumbing']:
        return 'infrastructure_anomaly'
    else:
        return 'maintenance_pattern_anomaly'

def store_predictions(predictions):
    """
    Store predictions in DynamoDB
    """
    if not predictions:
        return
    
    table = dynamodb.Table(PREDICTIONS_TABLE)
    
    with table.batch_writer() as batch:
        for prediction in predictions:
            batch.put_item(Item=prediction)

def send_maintenance_alerts(recommendations):
    """
    Send alerts for high-priority maintenance recommendations
    """
    high_priority_recs = [r for r in recommendations if r['priority'] == 'high']
    
    if not high_priority_recs:
        return
    
    message = {
        'alert_type': 'maintenance_prediction',
        'priority': 'high',
        'count': len(high_priority_recs),
        'recommendations': high_priority_recs[:5],  # Send top 5
        'timestamp': datetime.now().isoformat()
    }
    
    sns.publish(
        TopicArn=SNS_TOPIC_ARN,
        Message=json.dumps(message),
        Subject='High Priority Maintenance Predictions'
    )

def send_anomaly_alerts(anomalies):
    """
    Send alerts for detected anomalies
    """
    critical_anomalies = [a for a in anomalies if a['severity'] == 'high']
    
    if not critical_anomalies:
        return
    
    message = {
        'alert_type': 'maintenance_anomaly',
        'severity': 'high',
        'count': len(critical_anomalies),
        'anomalies': critical_anomalies[:3],  # Send top 3
        'timestamp': datetime.now().isoformat()
    }
    
    sns.publish(
        TopicArn=SNS_TOPIC_ARN,
        Message=json.dumps(message),
        Subject='Maintenance Anomalies Detected'
    )

# ============= RESIDENT BEHAVIOR ANALYSIS SERVICE =============
import json
import boto3
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS clients
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')

# Environment variables
RESIDENTS_TABLE = os.environ.get('RESIDENTS_TABLE')
ACCESS_LOGS_TABLE = os.environ.get('ACCESS_LOGS_TABLE')
PAYMENTS_TABLE = os.environ.get('PAYMENTS_TABLE')
INSIGHTS_TABLE = os.environ.get('INSIGHTS_TABLE')

def analyze_resident_behavior(event, context):
    """
    Analyze resident behavior patterns and generate insights
    """
    try:
        analysis_type = event.get('analysis_type', 'comprehensive')
        
        if analysis_type == 'access_patterns':
            return analyze_access_patterns()
        elif analysis_type == 'payment_behavior':
            return analyze_payment_behavior()
        elif analysis_type == 'engagement_score':
            return calculate_engagement_scores()
        elif analysis_type == 'comprehensive':
            return comprehensive_behavior_analysis()
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid analysis type'})
            }
            
    except Exception as e:
        logger.error(f"Error in behavior analysis: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def analyze_access_patterns():
    """
    Analyze resident access patterns
    """
    # Load access logs
    access_logs_df = load_access_logs()
    
    if access_logs_df.empty:
        return {
            'statusCode': 200,
            'body': json.dumps({
                'patterns': [],
                'message': 'No access data available'
            })
        }
    
    # Analyze patterns
    patterns = []
    
    # Group by resident and analyze
    for resident_id in access_logs_df['userId'].unique():
        resident_logs = access_logs_df[access_logs_df['userId'] == resident_id]
        
        pattern = analyze_individual_access_pattern(resident_logs, resident_id)
        patterns.append(pattern)
    
    # Store insights
    store_behavior_insights(patterns, 'access_patterns')
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'patterns': patterns,
            'total_residents_analyzed': len(patterns)
        })
    }

def analyze_payment_behavior():
    """
    Analyze resident payment behavior
    """
    # Load payment data
    payments_df = load_payments_data()
    
    if payments_df.empty:
        return {
            'statusCode': 200,
            'body': json.dumps({
                'behavior': [],
                'message': 'No payment data available'
            })
        }
    
    # Analyze payment patterns
    behavior_analysis = []
    
    for resident_id in payments_df['residentId'].unique():
        resident_payments = payments_df[payments_df['residentId'] == resident_id]
        
        behavior = analyze_individual_payment_behavior(resident_payments, resident_id)
        behavior_analysis.append(behavior)
    
    # Store insights
    store_behavior_insights(behavior_analysis, 'payment_behavior')
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'behavior': behavior_analysis,
            'total_residents_analyzed': len(behavior_analysis)
        })
    }

def calculate_engagement_scores():
    """
    Calculate resident engagement scores
    """
    # Load all relevant data
    residents_df = load_residents_data()
    access_logs_df = load_access_logs()
    payments_df = load_payments_data()
    
    engagement_scores = []
    
    for _, resident in residents_df.iterrows():
        resident_id = resident['id']
        
        # Calculate engagement components
        access_score = calculate_access_engagement(access_logs_df, resident_id)
        payment_score = calculate_payment_engagement(payments_df, resident_id)
        
        # Overall engagement score
        overall_score = (access_score + payment_score) / 2
        
        engagement = {
            'resident_id': resident_id,
            'resident_name': resident['name'],
            'unit_number': resident['unitNumber'],
            'access_engagement': access_score,
            'payment_engagement': payment_score,
            'overall_engagement': overall_score,
            'engagement_level': categorize_engagement(overall_score),
            'calculated_at': datetime.now().isoformat()
        }
        
        engagement_scores.append(engagement)
    
    # Store insights
    store_behavior_insights(engagement_scores, 'engagement_scores')
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'engagement_scores': engagement_scores,
            'total_residents': len(engagement_scores)
        })
    }

def comprehensive_behavior_analysis():
    """
    Perform comprehensive behavior analysis
    """
    # Run all analysis types
    access_result = analyze_access_patterns()
    payment_result = analyze_payment_behavior()
    engagement_result = calculate_engagement_scores()
    
    # Perform clustering analysis
    clustering_result = perform_resident_clustering()
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'access_patterns': json.loads(access_result['body']),
            'payment_behavior': json.loads(payment_result['body']),
            'engagement_scores': json.loads(engagement_result['body']),
            'clustering': clustering_result,
            'analysis_timestamp': datetime.now().isoformat()
        })
    }

def load_access_logs():
    """
    Load access logs from DynamoDB
    """
    table = dynamodb.Table(ACCESS_LOGS_TABLE)
    
    # Get logs from last 30 days
    cutoff_date = datetime.now() - timedelta(days=30)
    
    response = table.scan(
        FilterExpression='#timestamp >= :cutoff_date',
        ExpressionAttributeNames={'#timestamp': 'timestamp'},
        ExpressionAttributeValues={':cutoff_date': cutoff_date.isoformat()}
    )
    
    items = response['Items']
    df = pd.DataFrame(items)
    
    if not df.empty:
        df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    return df

def load_payments_data():
    """
    Load payments data from DynamoDB
    """
    table = dynamodb.Table(PAYMENTS_TABLE)
    
    response = table.scan()
    items = response['Items']
    
    df = pd.DataFrame(items)
    
    if not df.empty:
        df['date'] = pd.to_datetime(df['date'])
        df['amount'] = pd.to_numeric(df['amount'])
    
    return df

def load_residents_data():
    """
    Load residents data from DynamoDB
    """
    table = dynamodb.Table(RESIDENTS_TABLE)
    
    response = table.scan()
    items = response['Items']
    
    return pd.DataFrame(items)

def analyze_individual_access_pattern(logs_df, resident_id):
    """
    Analyze access pattern for individual resident
    """
    # Calculate access frequency
    daily_access = logs_df.groupby(logs_df['timestamp'].dt.date).size()
    avg_daily_access = daily_access.mean()
    
    # Calculate peak hours
    hourly_access = logs_df.groupby(logs_df['timestamp'].dt.hour).size()
    peak_hour = hourly_access.idxmax() if not hourly_access.empty else 0
    
    # Calculate access consistency
    access_variance = daily_access.var()
    consistency_score = max(0, 100 - (access_variance * 10))
    
    return {
        'resident_id': resident_id,
        'avg_daily_access': float(avg_daily_access),
        'peak_access_hour': int(peak_hour),
        'consistency_score': float(consistency_score),
        'total_access_events': len(logs_df),
        'pattern_type': classify_access_pattern(avg_daily_access, consistency_score)
    }

def analyze_individual_payment_behavior(payments_df, resident_id):
    """
    Analyze payment behavior for individual resident
    """
    # Calculate payment timeliness
    on_time_payments = len(payments_df[payments_df['status'] == 'completed'])
    total_payments = len(payments_df)
    timeliness_score = (on_time_payments / total_payments * 100) if total_payments > 0 else 0
    
    # Calculate average payment amount
    avg_payment = payments_df['amount'].mean() if not payments_df.empty else 0
    
    # Calculate payment frequency
    payment_frequency = calculate_payment_frequency(payments_df)
    
    return {
        'resident_id': resident_id,
        'timeliness_score': float(timeliness_score),
        'avg_payment_amount': float(avg_payment),
        'payment_frequency': payment_frequency,
        'total_payments': total_payments,
        'behavior_type': classify_payment_behavior(timeliness_score, payment_frequency)
    }

def calculate_access_engagement(access_logs_df, resident_id):
    """
    Calculate access-based engagement score
    """
    resident_logs = access_logs_df[access_logs_df['userId'] == resident_id]
    
    if resident_logs.empty:
        return 0
    
    # Factors: frequency, consistency, recent activity
    days_active = len(resident_logs.groupby(resident_logs['timestamp'].dt.date))
    total_days = 30  # Analysis period
    
    frequency_score = min(100, (days_active / total_days) * 100)
    
    # Recent activity bonus
    recent_logs = resident_logs[resident_logs['timestamp'] >= datetime.now() - timedelta(days=7)]
    recent_activity_bonus = min(20, len(recent_logs) * 2)
    
    return min(100, frequency_score + recent_activity_bonus)

def calculate_payment_engagement(payments_df, resident_id):
    """
    Calculate payment-based engagement score
    """
    resident_payments = payments_df[payments_df['residentId'] == resident_id]
    
    if resident_payments.empty:
        return 0
    
    # Factors: timeliness, consistency
    completed_payments = len(resident_payments[resident_payments['status'] == 'completed'])
    total_payments = len(resident_payments)
    
    timeliness_score = (completed_payments / total_payments * 100) if total_payments > 0 else 0
    
    return timeliness_score

def categorize_engagement(score):
    """
    Categorize engagement level based on score
    """
    if score >= 80:
        return 'high'
    elif score >= 60:
        return 'medium'
    elif score >= 40:
        return 'low'
    else:
        return 'very_low'

def classify_access_pattern(avg_daily_access, consistency_score):
    """
    Classify access pattern type
    """
    if avg_daily_access >= 3 and consistency_score >= 70:
        return 'regular_high'
    elif avg_daily_access >= 1 and consistency_score >= 50:
        return 'regular_moderate'
    elif consistency_score < 30:
        return 'irregular'
    else:
        return 'low_activity'

def classify_payment_behavior(timeliness_score, frequency):
    """
    Classify payment behavior type
    """
    if timeliness_score >= 90:
        return 'excellent'
    elif timeliness_score >= 70:
        return 'good'
    elif timeliness_score >= 50:
        return 'fair'
    else:
        return 'needs_attention'

def calculate_payment_frequency(payments_df):
    """
    Calculate payment frequency
    """
    if payments_df.empty:
        return 'no_data'
    
    # Calculate days between payments
    payments_sorted = payments_df.sort_values('date')
    if len(payments_sorted) < 2:
        return 'insufficient_data'
    
    date_diffs = payments_sorted['date'].diff().dt.days.dropna()
    avg_days_between = date_diffs.mean()
    
    if avg_days_between <= 35:
        return 'monthly'
    elif avg_days_between <= 95:
        return 'quarterly'
    else:
        return 'irregular'

def perform_resident_clustering():
    """
    Perform clustering analysis on residents
    """
    try:
        # Load all data
        residents_df = load_residents_data()
        access_logs_df = load_access_logs()
        payments_df = load_payments_data()
        
        # Prepare features for clustering
        features_list = []
        
        for _, resident in residents_df.iterrows():
            resident_id = resident['id']
            
            # Calculate features
            access_score = calculate_access_engagement(access_logs_df, resident_id)
            payment_score = calculate_payment_engagement(payments_df, resident_id)
            
            # Additional features
            resident_payments = payments_df[payments_df['residentId'] == resident_id]
            avg_payment = resident_payments['amount'].mean() if not resident_payments.empty else 0
            
            features_list.append([access_score, payment_score, avg_payment])
        
        if len(features_list) < 3:
            return {'clusters': [], 'message': 'Insufficient data for clustering'}
        
        # Perform clustering
        features_array = np.array(features_list)
        scaler = StandardScaler()
        features_scaled = scaler.fit_transform(features_array)
        
        # Determine optimal number of clusters
        n_clusters = min(5, len(features_list) // 2)
        
        kmeans = KMeans(n_clusters=n_clusters, random_state=42)
        cluster_labels = kmeans.fit_predict(features_scaled)
        
        # Analyze clusters
        clusters = analyze_clusters(residents_df, cluster_labels, features_array)
        
        return {
            'clusters': clusters,
            'total_residents': len(residents_df),
            'n_clusters': n_clusters
        }
        
    except Exception as e:
        logger.error(f"Error in clustering: {str(e)}")
        return {'clusters': [], 'error': str(e)}

def analyze_clusters(residents_df, cluster_labels, features_array):
    """
    Analyze and describe clusters
    """
    clusters = []
    
    for cluster_id in np.unique(cluster_labels):
        cluster_mask = cluster_labels == cluster_id
        cluster_residents = residents_df[cluster_mask]
        cluster_features = features_array[cluster_mask]
        
        # Calculate cluster characteristics
        avg_access_score = np.mean(cluster_features[:, 0])
        avg_payment_score = np.mean(cluster_features[:, 1])
        avg_payment_amount = np.mean(cluster_features[:, 2])
        
        cluster_info = {
            'cluster_id': int(cluster_id),
            'size': len(cluster_residents),
            'avg_access_engagement': float(avg_access_score),
            'avg_payment_engagement': float(avg_payment_score),
            'avg_payment_amount': float(avg_payment_amount),
            'description': describe_cluster(avg_access_score, avg_payment_score, avg_payment_amount),
            'residents': cluster_residents[['id', 'name', 'unitNumber']].to_dict('records')
        }
        
        clusters.append(cluster_info)
    
    return clusters

def describe_cluster(access_score, payment_score, payment_amount):
    """
    Generate description for cluster
    """
    if access_score >= 70 and payment_score >= 70:
        return "High engagement residents - active and reliable"
    elif access_score >= 50 and payment_score >= 50:
        return "Moderate engagement residents - generally active"
    elif payment_score >= 70:
        return "Payment-focused residents - reliable payers, lower facility usage"
    elif access_score >= 70:
        return "Facility-focused residents - high usage, variable payment patterns"
    else:
        return "Low engagement residents - may need attention"

def store_behavior_insights(insights, insight_type):
    """
    Store behavior insights in DynamoDB
    """
    table = dynamodb.Table(INSIGHTS_TABLE)
    
    insight_record = {
        'id': f"{insight_type}_{int(datetime.now().timestamp())}",
        'type': insight_type,
        'insights': insights,
        'created_at': datetime.now().isoformat(),
        'ttl': int((datetime.now() + timedelta(days=90)).timestamp())  # Auto-expire after 90 days
    }
    
    table.put_item(Item=insight_record)

# ============= SMART NOTIFICATIONS SERVICE =============
import json
import boto3
from datetime import datetime, timedelta
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS clients
dynamodb = boto3.resource('dynamodb')
sns = boto3.client('sns')
ses = boto3.client('ses')

def smart_notifications_handler(event, context):
    """
    Generate and send smart notifications based on AI insights
    """
    try:
        notification_type = event.get('type', 'all')
        
        if notification_type == 'maintenance':
            return send_maintenance_notifications()
        elif notification_type == 'payment':
            return send_payment_notifications()
        elif notification_type == 'security':
            return send_security_notifications()
        elif notification_type == 'engagement':
            return send_engagement_notifications()
        elif notification_type == 'all':
            return send_all_notifications()
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid notification type'})
            }
            
    except Exception as e:
        logger.error(f"Error in smart notifications: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def send_maintenance_notifications():
    """
    Send AI-generated maintenance notifications
    """
    # Load maintenance predictions
    predictions = load_maintenance_predictions()
    
    notifications_sent = 0
    
    for prediction in predictions:
        if prediction['priority'] in ['high', 'critical']:
            # Send notification
            send_notification(
                recipient_type='admin',
                subject=f"Maintenance Alert: {prediction['recommendation']}",
                message=format_maintenance_message(prediction),
                priority=prediction['priority']
            )
            notifications_sent += 1
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'notifications_sent': notifications_sent,
            'type': 'maintenance'
        })
    }

def send_payment_notifications():
    """
    Send AI-generated payment notifications
    """
    # Load payment behavior insights
    payment_insights = load_payment_insights()
    
    notifications_sent = 0
    
    for insight in payment_insights:
        if insight['behavior_type'] == 'needs_attention':
            # Send personalized payment reminder
            send_notification(
                recipient_type='resident',
                recipient_id=insight['resident_id'],
                subject="Payment Reminder - CondoconnectAI",
                message=format_payment_message(insight),
                priority='medium'
            )
            notifications_sent += 1
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'notifications_sent': notifications_sent,
            'type': 'payment'
        })
    }

def send_security_notifications():
    """
    Send AI-generated security notifications
    """
    # Load security anomalies
    anomalies = load_security_anomalies()
    
    notifications_sent = 0
    
    for anomaly in anomalies:
        if anomaly['severity'] == 'high':
            # Send security alert
            send_notification(
                recipient_type='security',
                subject=f"Security Alert: {anomaly['anomaly_type']}",
                message=format_security_message(anomaly),
                priority='high'
            )
            notifications_sent += 1
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'notifications_sent': notifications_sent,
            'type': 'security'
        })
    }

def send_engagement_notifications():
    """
    Send engagement-based notifications
    """
    # Load engagement scores
    engagement_scores = load_engagement_scores()
    
    notifications_sent = 0
    
    for score in engagement_scores:
        if score['engagement_level'] == 'very_low':
            # Send re-engagement notification
            send_notification(
                recipient_type='resident',
                recipient_id=score['resident_id'],
                subject="We Miss You - CondoconnectAI",
                message=format_engagement_message(score),
                priority='low'
            )
            notifications_sent += 1
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'notifications_sent': notifications_sent,
            'type': 'engagement'
        })
    }

def send_all_notifications():
    """
    Send all types of notifications
    """
    maintenance_result = send_maintenance_notifications()
    payment_result = send_payment_notifications()
    security_result = send_security_notifications()
    engagement_result = send_engagement_notifications()
    
    total_sent = (
        json.loads(maintenance_result['body'])['notifications_sent'] +
        json.loads(payment_result['body'])['notifications_sent'] +
        json.loads(security_result['body'])['notifications_sent'] +
        json.loads(engagement_result['body'])['notifications_sent']
    )
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'total_notifications_sent': total_sent,
            'breakdown': {
                'maintenance': json.loads(maintenance_result['body'])['notifications_sent'],
                'payment': json.loads(payment_result['body'])['notifications_sent'],
                'security': json.loads(security_result['body'])['notifications_sent'],
                'engagement': json.loads(engagement_result['body'])['notifications_sent']
            }
        })
    }

def load_maintenance_predictions():
    """
    Load recent maintenance predictions
    """
    table = dynamodb.Table(os.environ.get('PREDICTIONS_TABLE'))
    
    # Get predictions from last 24 hours
    cutoff_time = datetime.now() - timedelta(hours=24)
    
    response = table.scan(
        FilterExpression='created_at >= :cutoff_time',
        ExpressionAttributeValues={':cutoff_time': cutoff_time.isoformat()}
    )
    
    return response['Items']

def load_payment_insights():
    """
    Load recent payment behavior insights
    """
    table = dynamodb.Table(os.environ.get('INSIGHTS_TABLE'))
    
    response = table.scan(
        FilterExpression='#type = :type',
        ExpressionAttributeNames={'#type': 'type'},
        ExpressionAttributeValues={':type': 'payment_behavior'}
    )
    
    # Return the most recent insights
    if response['Items']:
        latest_insight = max(response['Items'], key=lambda x: x['created_at'])
        return latest_insight.get('insights', [])
    
    return []

def load_security_anomalies():
    """
    Load recent security anomalies
    """
    # This would load from security anomaly detection results
    # For now, return empty list
    return []

def load_engagement_scores():
    """
    Load recent engagement scores
    """
    table = dynamodb.Table(os.environ.get('INSIGHTS_TABLE'))
    
    response = table.scan(
        FilterExpression='#type = :type',
        ExpressionAttributeNames={'#type': 'type'},
        ExpressionAttributeValues={':type': 'engagement_scores'}
    )
    
    # Return the most recent scores
    if response['Items']:
        latest_scores = max(response['Items'], key=lambda x: x['created_at'])
        return latest_scores.get('insights', [])
    
    return []

def send_notification(recipient_type, subject, message, priority, recipient_id=None):
    """
    Send notification via appropriate channel
    """
    if recipient_type == 'admin' or recipient_type == 'security':
        # Send via SNS for admin/security notifications
        sns.publish(
            TopicArn=os.environ.get('ADMIN_TOPIC_ARN'),
            Message=message,
            Subject=subject
        )
    elif recipient_type == 'resident' and recipient_id:
        # Send via SES for resident notifications
        resident_email = get_resident_email(recipient_id)
        if resident_email:
            ses.send_email(
                Source=os.environ.get('FROM_EMAIL'),
                Destination={'ToAddresses': [resident_email]},
                Message={
                    'Subject': {'Data': subject},
                    'Body': {'Text': {'Data': message}}
                }
            )

def get_resident_email(resident_id):
    """
    Get resident email from database
    """
    table = dynamodb.Table(os.environ.get('RESIDENTS_TABLE'))
    
    try:
        response = table.get_item(Key={'id': resident_id})
        return response.get('Item', {}).get('email')
    except:
        return None

def format_maintenance_message(prediction):
    """
    Format maintenance notification message
    """
    return f"""
    Maintenance Prediction Alert
    
    Recommendation: {prediction['recommendation']}
    Predicted Timeline: {prediction['predicted_days']} days
    Priority: {prediction['priority'].upper()}
    Confidence: {prediction['confidence']:.1f}%
    
    Please schedule maintenance accordingly.
    
    - CondoconnectAI System
    """

def format_payment_message(insight):
    """
    Format payment notification message
    """
    return f"""
    Payment Reminder
    
    Dear Resident,
    
    Our AI system has noticed some payment patterns that may need attention.
    Your current payment timeliness score is {insight['timeliness_score']:.1f}%.
    
    Please ensure all payments are up to date to maintain good standing.
    
    If you have any questions, please contact the management office.
    
    Best regards,
    CondoconnectAI Management
    """

def format_security_message(anomaly):
    """
    Format security notification message
    """
    return f"""
    Security Anomaly Detected
    
    Type: {anomaly['anomaly_type']}
    Location: {anomaly['location']}
    Severity: {anomaly['severity'].upper()}
    Time: {anomaly['created_at']}
    
    Please investigate immediately.
    
    - CondoconnectAI Security System
    """

def format_engagement_message(score):
    """
    Format engagement notification message
    """
    return f"""
    We Miss You!
    
    Dear {score.get('resident_name', 'Resident')},
    
    We've noticed you haven't been as active in our community lately.
    Your current engagement level is {score['engagement_level']}.
    
    We'd love to see you more! Check out our latest community events and amenities.
    
    Stay connected,
    CondoconnectAI Community Team
    """
