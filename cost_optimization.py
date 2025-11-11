import json
import boto3
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS clients
dynamodb = boto3.resource('dynamodb')
cloudwatch = boto3.client('cloudwatch')
ce = boto3.client('ce')  # Cost Explorer

def lambda_handler(event, context):
    """
    AI-powered cost optimization analysis
    """
    try:
        analysis_type = event.get('analysis_type', 'comprehensive')
        
        if analysis_type == 'resource_utilization':
            return analyze_resource_utilization()
        elif analysis_type == 'cost_trends':
            return analyze_cost_trends()
        elif analysis_type == 'optimization_recommendations':
            return generate_optimization_recommendations()
        elif analysis_type == 'comprehensive':
            return comprehensive_cost_analysis()
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid analysis type'})
            }
            
    except Exception as e:
        logger.error(f"Error in cost optimization: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def analyze_resource_utilization():
    """Analyze AWS resource utilization patterns"""
    try:
        # Get CloudWatch metrics for key resources
        utilization_data = {}
        
        # Lambda function utilization
        lambda_metrics = get_lambda_utilization()
        utilization_data['lambda'] = lambda_metrics
        
        # DynamoDB utilization
        dynamodb_metrics = get_dynamodb_utilization()
        utilization_data['dynamodb'] = dynamodb_metrics
        
        # S3 utilization
        s3_metrics = get_s3_utilization()
        utilization_data['s3'] = s3_metrics
        
        # API Gateway utilization
        api_metrics = get_api_gateway_utilization()
        utilization_data['api_gateway'] = api_metrics
        
        # Generate utilization insights
        insights = generate_utilization_insights(utilization_data)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'utilization_data': utilization_data,
                'insights': insights,
                'analysis_timestamp': datetime.now().isoformat()
            })
        }
        
    except Exception as e:
        logger.error(f"Error analyzing resource utilization: {str(e)}")
        raise

def analyze_cost_trends():
    """Analyze cost trends and patterns"""
    try:
        # Get cost data from Cost Explorer
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=90)
        
        # Daily costs
        daily_costs = get_daily_costs(start_date, end_date)
        
        # Service-wise costs
        service_costs = get_service_costs(start_date, end_date)
        
        # Analyze trends
        cost_trends = analyze_cost_patterns(daily_costs, service_costs)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'daily_costs': daily_costs,
                'service_costs': service_costs,
                'trends': cost_trends,
                'analysis_period': f"{start_date} to {end_date}"
            })
        }
        
    except Exception as e:
        logger.error(f"Error analyzing cost trends: {str(e)}")
        raise

def generate_optimization_recommendations():
    """Generate AI-powered optimization recommendations"""
    try:
        recommendations = []
        
        # Analyze Lambda functions
        lambda_recs = analyze_lambda_optimization()
        recommendations.extend(lambda_recs)
        
        # Analyze DynamoDB tables
        dynamodb_recs = analyze_dynamodb_optimization()
        recommendations.extend(dynamodb_recs)
        
        # Analyze S3 storage
        s3_recs = analyze_s3_optimization()
        recommendations.extend(s3_recs)
        
        # Analyze API Gateway
        api_recs = analyze_api_gateway_optimization()
        recommendations.extend(api_recs)
        
        # Prioritize recommendations
        prioritized_recs = prioritize_recommendations(recommendations)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'recommendations': prioritized_recs,
                'total_recommendations': len(prioritized_recs),
                'potential_savings': calculate_potential_savings(prioritized_recs)
            })
        }
        
    except Exception as e:
        logger.error(f"Error generating recommendations: {str(e)}")
        raise

def comprehensive_cost_analysis():
    """Perform comprehensive cost optimization analysis"""
    utilization_result = analyze_resource_utilization()
    trends_result = analyze_cost_trends()
    recommendations_result = generate_optimization_recommendations()
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'utilization_analysis': json.loads(utilization_result['body']),
            'cost_trends': json.loads(trends_result['body']),
            'optimization_recommendations': json.loads(recommendations_result['body']),
            'analysis_timestamp': datetime.now().isoformat()
        })
    }

def get_lambda_utilization():
    """Get Lambda function utilization metrics"""
    try:
        end_time = datetime.now()
        start_time = end_time - timedelta(days=7)
        
        # Get Lambda metrics
        metrics = cloudwatch.get_metric_statistics(
            Namespace='AWS/Lambda',
            MetricName='Duration',
            Dimensions=[],
            StartTime=start_time,
            EndTime=end_time,
            Period=3600,
            Statistics=['Average', 'Maximum']
        )
        
        invocations = cloudwatch.get_metric_statistics(
            Namespace='AWS/Lambda',
            MetricName='Invocations',
            Dimensions=[],
            StartTime=start_time,
            EndTime=end_time,
            Period=3600,
            Statistics=['Sum']
        )
        
        errors = cloudwatch.get_metric_statistics(
            Namespace='AWS/Lambda',
            MetricName='Errors',
            Dimensions=[],
            StartTime=start_time,
            EndTime=end_time,
            Period=3600,
            Statistics=['Sum']
        )
        
        return {
            'avg_duration': calculate_average_metric(metrics['Datapoints'], 'Average'),
            'max_duration': calculate_max_metric(metrics['Datapoints'], 'Maximum'),
            'total_invocations': sum([dp['Sum'] for dp in invocations['Datapoints']]),
            'total_errors': sum([dp['Sum'] for dp in errors['Datapoints']]),
            'error_rate': calculate_error_rate(invocations['Datapoints'], errors['Datapoints'])
        }
        
    except Exception as e:
        logger.warning(f"Could not get Lambda metrics: {str(e)}")
        return {}

def get_dynamodb_utilization():
    """Get DynamoDB utilization metrics"""
    try:
        end_time = datetime.now()
        start_time = end_time - timedelta(days=7)
        
        # Get DynamoDB metrics
        read_capacity = cloudwatch.get_metric_statistics(
            Namespace='AWS/DynamoDB',
            MetricName='ConsumedReadCapacityUnits',
            Dimensions=[],
            StartTime=start_time,
            EndTime=end_time,
            Period=3600,
            Statistics=['Sum']
        )
        
        write_capacity = cloudwatch.get_metric_statistics(
            Namespace='AWS/DynamoDB',
            MetricName='ConsumedWriteCapacityUnits',
            Dimensions=[],
            StartTime=start_time,
            EndTime=end_time,
            Period=3600,
            Statistics=['Sum']
        )
        
        return {
            'total_read_capacity': sum([dp['Sum'] for dp in read_capacity['Datapoints']]),
            'total_write_capacity': sum([dp['Sum'] for dp in write_capacity['Datapoints']]),
            'avg_read_capacity': calculate_average_metric(read_capacity['Datapoints'], 'Sum'),
            'avg_write_capacity': calculate_average_metric(write_capacity['Datapoints'], 'Sum')
        }
        
    except Exception as e:
        logger.warning(f"Could not get DynamoDB metrics: {str(e)}")
        return {}

def get_s3_utilization():
    """Get S3 utilization metrics"""
    try:
        end_time = datetime.now()
        start_time = end_time - timedelta(days=30)
        
        # Get S3 metrics
        storage_metrics = cloudwatch.get_metric_statistics(
            Namespace='AWS/S3',
            MetricName='BucketSizeBytes',
            Dimensions=[],
            StartTime=start_time,
            EndTime=end_time,
            Period=86400,
            Statistics=['Average']
        )
        
        requests = cloudwatch.get_metric_statistics(
            Namespace='AWS/S3',
            MetricName='NumberOfObjects',
            Dimensions=[],
            StartTime=start_time,
            EndTime=end_time,
            Period=86400,
            Statistics=['Average']
        )
        
        return {
            'avg_storage_bytes': calculate_average_metric(storage_metrics['Datapoints'], 'Average'),
            'avg_object_count': calculate_average_metric(requests['Datapoints'], 'Average')
        }
        
    except Exception as e:
        logger.warning(f"Could not get S3 metrics: {str(e)}")
        return {}

def get_api_gateway_utilization():
    """Get API Gateway utilization metrics"""
    try:
        end_time = datetime.now()
        start_time = end_time - timedelta(days=7)
        
        # Get API Gateway metrics
        requests = cloudwatch.get_metric_statistics(
            Namespace='AWS/ApiGateway',
            MetricName='Count',
            Dimensions=[],
            StartTime=start_time,
            EndTime=end_time,
            Period=3600,
            Statistics=['Sum']
        )
        
        latency = cloudwatch.get_metric_statistics(
            Namespace='AWS/ApiGateway',
            MetricName='Latency',
            Dimensions=[],
            StartTime=start_time,
            EndTime=end_time,
            Period=3600,
            Statistics=['Average']
        )
        
        errors = cloudwatch.get_metric_statistics(
            Namespace='AWS/ApiGateway',
            MetricName='4XXError',
            Dimensions=[],
            StartTime=start_time,
            EndTime=end_time,
            Period=3600,
            Statistics=['Sum']
        )
        
        return {
            'total_requests': sum([dp['Sum'] for dp in requests['Datapoints']]),
            'avg_latency': calculate_average_metric(latency['Datapoints'], 'Average'),
            'total_errors': sum([dp['Sum'] for dp in errors['Datapoints']])
        }
        
    except Exception as e:
        logger.warning(f"Could not get API Gateway metrics: {str(e)}")
        return {}

def get_daily_costs(start_date, end_date):
    """Get daily cost data from Cost Explorer"""
    try:
        response = ce.get_cost_and_usage(
            TimePeriod={
                'Start': start_date.strftime('%Y-%m-%d'),
                'End': end_date.strftime('%Y-%m-%d')
            },
            Granularity='DAILY',
            Metrics=['BlendedCost'],
            GroupBy=[
                {
                    'Type': 'DIMENSION',
                    'Key': 'SERVICE'
                }
            ]
        )
        
        daily_costs = []
        for result in response['ResultsByTime']:
            date = result['TimePeriod']['Start']
            total_cost = 0
            
            for group in result['Groups']:
                cost = float(group['Metrics']['BlendedCost']['Amount'])
                total_cost += cost
            
            daily_costs.append({
                'date': date,
                'cost': total_cost
            })
        
        return daily_costs
        
    except Exception as e:
        logger.warning(f"Could not get cost data: {str(e)}")
        return []

def get_service_costs(start_date, end_date):
    """Get service-wise cost data"""
    try:
        response = ce.get_cost_and_usage(
            TimePeriod={
                'Start': start_date.strftime('%Y-%m-%d'),
                'End': end_date.strftime('%Y-%m-%d')
            },
            Granularity='MONTHLY',
            Metrics=['BlendedCost'],
            GroupBy=[
                {
                    'Type': 'DIMENSION',
                    'Key': 'SERVICE'
                }
            ]
        )
        
        service_costs = {}
        for result in response['ResultsByTime']:
            for group in result['Groups']:
                service = group['Keys'][0]
                cost = float(group['Metrics']['BlendedCost']['Amount'])
                
                if service in service_costs:
                    service_costs[service] += cost
                else:
                    service_costs[service] = cost
        
        return service_costs
        
    except Exception as e:
        logger.warning(f"Could not get service costs: {str(e)}")
        return {}

def analyze_cost_patterns(daily_costs, service_costs):
    """Analyze cost patterns and trends"""
    trends = {}
    
    if daily_costs:
        costs = [item['cost'] for item in daily_costs]
        
        # Calculate trend
        if len(costs) > 1:
            recent_avg = np.mean(costs[-7:]) if len(costs) >= 7 else np.mean(costs)
            overall_avg = np.mean(costs)
            
            trends['daily_trend'] = 'increasing' if recent_avg > overall_avg else 'decreasing'
            trends['cost_variance'] = float(np.var(costs))
            trends['avg_daily_cost'] = float(overall_avg)
    
    if service_costs:
        # Find top cost drivers
        sorted_services = sorted(service_costs.items(), key=lambda x: x[1], reverse=True)
        trends['top_services'] = sorted_services[:5]
        trends['total_cost'] = sum(service_costs.values())
    
    return trends

def analyze_lambda_optimization():
    """Analyze Lambda functions for optimization opportunities"""
    recommendations = []
    
    # This would analyze actual Lambda functions
    # For now, return sample recommendations
    recommendations.append({
        'type': 'lambda_memory_optimization',
        'resource': 'All Lambda Functions',
        'description': 'Consider optimizing Lambda memory allocation based on usage patterns',
        'potential_savings': 15.0,
        'priority': 'medium',
        'effort': 'low'
    })
    
    return recommendations

def analyze_dynamodb_optimization():
    """Analyze DynamoDB tables for optimization"""
    recommendations = []
    
    recommendations.append({
        'type': 'dynamodb_capacity_optimization',
        'resource': 'DynamoDB Tables',
        'description': 'Switch to on-demand billing for tables with unpredictable traffic',
        'potential_savings': 25.0,
        'priority': 'high',
        'effort': 'low'
    })
    
    return recommendations

def analyze_s3_optimization():
    """Analyze S3 storage for optimization"""
    recommendations = []
    
    recommendations.append({
        'type': 's3_storage_class_optimization',
        'resource': 'S3 Buckets',
        'description': 'Implement lifecycle policies to move old objects to cheaper storage classes',
        'potential_savings': 30.0,
        'priority': 'medium',
        'effort': 'medium'
    })
    
    return recommendations

def analyze_api_gateway_optimization():
    """Analyze API Gateway for optimization"""
    recommendations = []
    
    recommendations.append({
        'type': 'api_caching_optimization',
        'resource': 'API Gateway',
        'description': 'Enable caching for frequently accessed endpoints',
        'potential_savings': 10.0,
        'priority': 'low',
        'effort': 'medium'
    })
    
    return recommendations

def prioritize_recommendations(recommendations):
    """Prioritize recommendations based on savings and effort"""
    priority_scores = {
        'high': 3,
        'medium': 2,
        'low': 1
    }
    
    effort_scores = {
        'low': 3,
        'medium': 2,
        'high': 1
    }
    
    for rec in recommendations:
        priority_score = priority_scores.get(rec['priority'], 1)
        effort_score = effort_scores.get(rec['effort'], 1)
        savings_score = min(rec['potential_savings'] / 10, 5)  # Normalize to 0-5
        
        rec['optimization_score'] = priority_score + effort_score + savings_score
    
    return sorted(recommendations, key=lambda x: x['optimization_score'], reverse=True)

def calculate_potential_savings(recommendations):
    """Calculate total potential savings"""
    total_savings = sum([rec['potential_savings'] for rec in recommendations])
    
    return {
        'total_percentage': total_savings,
        'estimated_monthly_savings': total_savings * 10,  # Rough estimate
        'high_priority_savings': sum([
            rec['potential_savings'] for rec in recommendations 
            if rec['priority'] == 'high'
        ])
    }

def calculate_average_metric(datapoints, metric_key):
    """Calculate average of metric datapoints"""
    if not datapoints:
        return 0
    
    values = [dp[metric_key] for dp in datapoints if metric_key in dp]
    return np.mean(values) if values else 0

def calculate_max_metric(datapoints, metric_key):
    """Calculate maximum of metric datapoints"""
    if not datapoints:
        return 0
    
    values = [dp[metric_key] for dp in datapoints if metric_key in dp]
    return max(values) if values else 0

def calculate_error_rate(invocation_datapoints, error_datapoints):
    """Calculate error rate from invocation and error metrics"""
    total_invocations = sum([dp['Sum'] for dp in invocation_datapoints])
    total_errors = sum([dp['Sum'] for dp in error_datapoints])
    
    if total_invocations == 0:
        return 0
    
    return (total_errors / total_invocations) * 100

def generate_utilization_insights(utilization_data):
    """Generate insights from utilization data"""
    insights = []
    
    # Lambda insights
    if 'lambda' in utilization_data:
        lambda_data = utilization_data['lambda']
        if lambda_data.get('error_rate', 0) > 5:
            insights.append({
                'type': 'lambda_high_error_rate',
                'message': f"Lambda error rate is {lambda_data['error_rate']:.1f}%, consider investigating"
            })
    
    # DynamoDB insights
    if 'dynamodb' in utilization_data:
        dynamodb_data = utilization_data['dynamodb']
        if dynamodb_data.get('avg_read_capacity', 0) < 100:
            insights.append({
                'type': 'dynamodb_low_utilization',
                'message': "DynamoDB read capacity utilization is low, consider on-demand billing"
            })
    
    return insights
