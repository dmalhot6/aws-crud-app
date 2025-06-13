const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;
const { v4: uuidv4 } = require('uuid');

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    const httpMethod = event.httpMethod;
    const path = event.path;
    const resourcePath = event.resource;
    
    // Extract item ID from path parameters if available
    const itemId = event.pathParameters ? event.pathParameters.id : null;
    
    // Handle different HTTP methods
    switch(httpMethod) {
      case 'GET':
        // GET /items - List all items
        if (resourcePath === '/items') {
          return await getItems();
        }
        // GET /items/{id} - Get a specific item
        else if (resourcePath === '/items/{id}' && itemId) {
          return await getItem(itemId);
        }
        break;
        
      case 'POST':
        // POST /items - Create a new item
        if (resourcePath === '/items') {
          const item = JSON.parse(event.body);
          const orders = JSON.parse(event,body.orders)
          return await createItem(item);
        }
        break;
        
      case 'PUT':
        // PUT /items/{id} - Update a specific item
        if (resourcePath === '/items/{id}' && itemId) {
          const item = JSON.parse(event.body);
          return await updateItem(itemId, item);
        }
        break;
        
      case 'DELETE':
        // DELETE /items/{id} - Delete a specific item
        if (resourcePath === '/items/{id}' && itemId) {
          return await deleteItem(itemId);
        }
        break;
        
      default:
        return buildResponse(400, { message: 'Unsupported method' });
    }
    
    return buildResponse(404, { message: 'Resource not found' });
  } catch (error) {
    console.error('Error:', error);
    return buildResponse(500, { message: 'Internal server error', error: error.message });
  }
};

// Get all items
async function getItems() {
  const params = {
    TableName: TABLE_NAME
  };
  
  try {
    const result = await dynamodb.scan(params).promise();
    return buildResponse(200, result.Items);
  } catch (error) {
    console.error('Error getting items:', error);
    throw error;
  }
}

// Get a specific item by ID
async function getItem(id) {
  const params = {
    TableName: TABLE_NAME,
    Key: { id }
  };
  
  try {
    const result = await dynamodb.scan(params).promise();
    if (!result.Item) {
      return buildResponse(404, { message: 'Item not found' });
    }
    return buildResponse(200, result.Item);
  } catch (error) {
    console.error(`Error getting item ${id}:`, error);
    throw error;
  }
}

// Create a new item
async function createItem(item) {
  // Generate a unique ID if not provided
  if (!item.id) {
    item.id = uuidv4();
  }
  
  // Add timestamp
  item.createdAt = new Date().toISOString();
  
  const params = {
    TableName: TABLE_NAME,
    Item: item,
    ConditionExpression: 'attribute_not_exists(id)'
  };
  
  try {
    await dynamodb.put(params).promise();
    return buildResponse(201, item);
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      return buildResponse(409, { message: 'Item with this ID already exists' });
    }
    console.error('Error creating item:', error);
    throw error;
  }
}

// Update an existing item
async function updateItem(id, item) {
  // Ensure the ID in the path matches the ID in the body
  item.id = id;
  
  // Add updated timestamp
  item.updatedAt = new Date().toISOString();
  
  const params = {
    TableName: TABLE_NAME,
    Item: item,
    ConditionExpression: 'attribute_exists(id)'
  };
  
  try {
    await dynamodb.put(params).promise();
    return buildResponse(200, item);
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      return buildResponse(404, { message: 'Item not found' });
    }
    console.error(`Error updating item ${id}:`, error);
    throw error;
  }
}

// Delete an item
async function deleteItem(id) {
  const params = {
    TableName: TABLE_NAME,
    Key: { id },
    ReturnValues: 'ALL_OLD'
  };
  
  try {
    const result = await dynamodb.delete(params).promise();
    if (!result.Attributes) {
      return buildResponse(404, { message: 'Item not found' });
    }
    return buildResponse(200, { message: 'Item deleted successfully' });
  } catch (error) {
    console.error(`Error deleting item ${id}:`, error);
    throw error;
  }
}

// Helper function to build HTTP response
function buildResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
    },
    body: JSON.stringify(body)
  };
}
