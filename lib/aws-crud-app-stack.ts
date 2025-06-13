import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export class AwsCrudAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create SNS Topic for Alarms
    const alarmTopic = new sns.Topic(this, 'CrudAppAlarmTopic', {
      displayName: 'CRUD App Alarm Notifications',
    });
    
    // Add an email subscription to the SNS topic
    // Using a placeholder email - you'll need to confirm the subscription
    alarmTopic.addSubscription(
      new subscriptions.EmailSubscription('pmalhodh@amazon.com')
    );

    // Create DynamoDB Table
    const itemsTable = new dynamodb.Table(this, 'ItemsTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production
    });

    // Add tags to the DynamoDB table
    cdk.Tags.of(itemsTable).add('Environment', 'Development');
    cdk.Tags.of(itemsTable).add('Application', 'CrudApp');
    cdk.Tags.of(itemsTable).add('Owner', 'DevTeam');

    // Create Lambda Functions for CRUD operations
    const lambdaEnvironment = {
      TABLE_NAME: itemsTable.tableName,
    };

    // Create Lambda function for all CRUD operations
    const crudFunction = new lambda.Function(this, 'CrudFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      environment: lambdaEnvironment,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Grant the Lambda function read/write permissions to the DynamoDB table
    itemsTable.grantReadWriteData(crudFunction);

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'CrudApi', {
      restApiName: 'CRUD Service',
      description: 'This service provides CRUD operations for items',
      deployOptions: {
        stageName: 'prod',
        // Disable metrics and logging to avoid the CloudWatch Logs role ARN requirement
        metricsEnabled: false,
        loggingLevel: apigateway.MethodLoggingLevel.OFF,
        dataTraceEnabled: false,
      },
    });

    // Add tags to the API Gateway
    cdk.Tags.of(api).add('Environment', 'Development');
    cdk.Tags.of(api).add('Application', 'CrudApp');
    cdk.Tags.of(api).add('Owner', 'DevTeam');

    // Create API resources and methods
    const items = api.root.addResource('items');
    const singleItem = items.addResource('{id}');

    // GET /items - List all items
    items.addMethod('GET', new apigateway.LambdaIntegration(crudFunction));

    // POST /items - Create a new item
    items.addMethod('POST', new apigateway.LambdaIntegration(crudFunction));

    // GET /items/{id} - Get a specific item
    singleItem.addMethod('GET', new apigateway.LambdaIntegration(crudFunction));

    // PUT /items/{id} - Update a specific item
    singleItem.addMethod('PUT', new apigateway.LambdaIntegration(crudFunction));

    // DELETE /items/{id} - Delete a specific item
    singleItem.addMethod('DELETE', new apigateway.LambdaIntegration(crudFunction));

    // CloudWatch Alarms
    
    // 1. API Gateway 5XX errors alarm
    const api5xxErrorsAlarm = new cloudwatch.Alarm(this, 'Api5xxErrorsAlarm', {
      metric: api.metricServerError({
        period: cdk.Duration.minutes(1),
        statistic: 'Sum',
      }),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'API Gateway is returning 5XX errors',
      actionsEnabled: true,
    });
    api5xxErrorsAlarm.addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(alarmTopic));
    
    // 2. API Gateway 4XX errors alarm
    const api4xxErrorsAlarm = new cloudwatch.Alarm(this, 'Api4xxErrorsAlarm', {
      metric: api.metricClientError({
        period: cdk.Duration.minutes(1),
        statistic: 'Sum',
      }),
      threshold: 5,
      evaluationPeriods: 1,
      alarmDescription: 'API Gateway is returning too many 4XX errors',
      actionsEnabled: true,
    });
    api4xxErrorsAlarm.addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(alarmTopic));
    
    // 3. Lambda errors alarm
    const lambdaErrorsAlarm = new cloudwatch.Alarm(this, 'LambdaErrorsAlarm', {
      metric: crudFunction.metricErrors({
        period: cdk.Duration.minutes(1),
        statistic: 'Sum',
      }),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'Lambda function is experiencing errors',
      actionsEnabled: true,
    });
    lambdaErrorsAlarm.addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(alarmTopic));
    
    // 4. Lambda duration alarm
    const lambdaDurationAlarm = new cloudwatch.Alarm(this, 'LambdaDurationAlarm', {
      metric: crudFunction.metricDuration({
        period: cdk.Duration.minutes(1),
        statistic: 'Average',
      }),
      threshold: 1000, // 1000 milliseconds = 1 second
      evaluationPeriods: 3,
      alarmDescription: 'Lambda function is taking too long to execute',
      actionsEnabled: true,
    });
    lambdaDurationAlarm.addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(alarmTopic));
    
    // 5. API Gateway latency alarm
    const apiLatencyAlarm = new cloudwatch.Alarm(this, 'ApiLatencyAlarm', {
      metric: api.metricLatency({
        period: cdk.Duration.minutes(1),
        statistic: 'p90',
      }),
      threshold: 1000, // 1000 milliseconds = 1 second
      evaluationPeriods: 3,
      alarmDescription: 'API Gateway latency is too high',
      actionsEnabled: true,
    });
    apiLatencyAlarm.addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(alarmTopic));
    
    // 6. API Gateway throttling alarm
    const apiThrottlingAlarm = new cloudwatch.Alarm(this, 'ApiThrottlingAlarm', {
      metric: api.metricCount({
        period: cdk.Duration.minutes(1),
        statistic: 'Sum',
        label: 'ThrottledRequests',
      }),
      threshold: 5,
      evaluationPeriods: 1,
      alarmDescription: 'API Gateway is throttling requests',
      actionsEnabled: true,
    });
    apiThrottlingAlarm.addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(alarmTopic));

    // Outputs
    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: itemsTable.tableName,
      description: 'DynamoDB table name',
    });
    
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL',
    });
    
    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: alarmTopic.topicArn,
      description: 'SNS Topic ARN for CloudWatch Alarms',
    });
  }
}
