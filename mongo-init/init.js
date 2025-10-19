// MongoDB initialization script
// This runs when the MongoDB container starts for the first time

// Switch to the application database
db = db.getSiblingDB('env0-lite');

// Create a user for the application
db.createUser({
  user: 'env0-user',
  pwd: 'env0-password',
  roles: [
    {
      role: 'readWrite',
      db: 'env0-lite'
    }
  ]
});

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'username'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        },
        username: {
          bsonType: 'string',
          minLength: 3,
          maxLength: 30
        }
      }
    }
  }
});

db.createCollection('projects');
db.createCollection('deployments');
db.createCollection('userPATs');

print('Database initialization completed');
