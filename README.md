# AWS CRUD Application

This project implements a serverless CRUD (Create, Read, Update, Delete) API using AWS services:

- Amazon API Gateway for the REST API endpoints
- AWS Lambda for the business logic
- Amazon DynamoDB for data storage
- Amazon CloudWatch for monitoring and alarms
- Amazon SNS for notifications

## Architecture

![Architecture Diagram](https://via.placeholder.com/800x400?text=CRUD+App+Architecture)

The application provides the following API endpoints:

- `GET /items` - List all items
- `POST /items` - Create a new item
- `GET /items/{id}` - Get a specific item
- `PUT /items/{id}` - Update a specific item
- `DELETE /items/{id}` - Delete a specific item

## Prerequisites

- [AWS CLI](https://aws.amazon.com/cli/) configured with appropriate credentials
- [Node.js](https://nodejs.org/) (v14.x or later)
- [AWS CDK](https://aws.amazon.com/cdk/) installed globally (`npm install -g aws-cdk`)

## Deployment Instructions

1. Clone this repository:
   ```
   git clone <repository-url>
   cd aws-crud-app
   ```

2. Install dependencies:
   ```
   npm install
   cd lambda && npm install && cd ..
   ```

3. Update the SNS email subscription in `lib/aws-crud-app-stack.ts` with your email address:
   ```typescript
   alarmTopic.addSubscription(
     new subscriptions.EmailSubscription('your-email@example.com')
   );
   ```

4. Bootstrap your AWS environment (if you haven't already):
   ```
   cdk bootstrap
   ```

5. Deploy the application:
   ```
   cdk deploy
   ```

6. After deployment, the CDK will output the API Gateway endpoint URL. You can use this URL to interact with your API.

7. Confirm the SNS subscription by clicking the link in the email you receive.

## Testing the API

You can test the API using curl or any API client like Postman:

### List all items
```
curl -X GET https://<api-id>.execute-api.<region>.amazonaws.com/prod/items
```

### Create a new item
```
curl -X POST https://<api-id>.execute-api.<region>.amazonaws.com/prod/items \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Item", "description": "This is a test item"}'
```

### Get a specific item
```
curl -X GET https://<api-id>.execute-api.<region>.amazonaws.com/prod/items/<item-id>
```

### Update an item
```
curl -X PUT https://<api-id>.execute-api.<region>.amazonaws.com/prod/items/<item-id> \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Item", "description": "This item has been updated"}'
```

### Delete an item
```
curl -X DELETE https://<api-id>.execute-api.<region>.amazonaws.com/prod/items/<item-id>
```

## CloudWatch Alarms

The application includes the following CloudWatch alarms:

1. **API Gateway 5XX Errors** - Triggers when the API returns server errors
2. **API Gateway 4XX Errors** - Triggers when there are too many client errors
3. **Lambda Errors** - Triggers when the Lambda function experiences errors
4. **Lambda Duration** - Triggers when the Lambda function takes too long to execute
5. **API Gateway Latency** - Triggers when the API response time is too high
6. **API Gateway Throttling** - Triggers when requests are being throttled

All alarms send notifications to the configured SNS topic.

## Cleanup

To avoid incurring charges, delete the resources when you're done:

```
cdk destroy
```

## Security Considerations

- The DynamoDB table is configured with the `DESTROY` removal policy for demonstration purposes. For production, consider using `RETAIN` to prevent accidental data loss.
- Consider implementing authentication and authorization using Amazon Cognito or API Gateway authorizers.
- Implement proper input validation and error handling in your Lambda functions.
- Use AWS WAF to protect your API from common web exploits.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
