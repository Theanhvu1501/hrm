/**
 * MongoDB connection configuration for seed scripts
 */
const { MongoClient } = require('mongodb');

const config = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  dbName: process.env.MONGODB_DATABASE || 'digital_book',
};

let client = null;
let db = null;

async function connect() {
  if (db) return db;
  
  client = new MongoClient(config.mongoUri);
  await client.connect();
  db = client.db(config.dbName);
  console.log(`✅ Connected to MongoDB: ${config.dbName}`);
  return db;
}

async function disconnect() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('✅ Disconnected from MongoDB');
  }
}

async function getDb() {
  if (!db) {
    await connect();
  }
  return db;
}

module.exports = {
  config,
  connect,
  disconnect,
  getDb,
};
