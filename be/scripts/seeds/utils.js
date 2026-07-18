/**
 * Utility functions for seed scripts
 */
const { ObjectId } = require('mongodb');

/**
 * Generate a new MongoDB ObjectId
 */
function generateObjectId() {
  return new ObjectId();
}

/**
 * Check if a string is a valid ObjectId
 */
function isValidObjectId(id) {
  return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
}

/**
 * Get current timestamp
 */
function now() {
  return new Date();
}

/**
 * Transform frontend mock data to MongoDB document format
 * @param {Object} data - Frontend mock data
 * @param {Object} options - Transform options
 */
function transformToDocument(data, options = {}) {
  const { excludeFields = ['id'], defaults = {} } = options;
  
  const doc = {
    _id: generateObjectId(),
    ...defaults,
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
  };

  for (const [key, value] of Object.entries(data)) {
    if (!excludeFields.includes(key)) {
      doc[key] = value;
    }
  }

  return doc;
}

/**
 * Batch transform array of data
 */
function transformBatch(dataArray, options = {}) {
  return dataArray.map(item => transformToDocument(item, options));
}

/**
 * Validate unique field in array
 */
function validateUnique(dataArray, field) {
  const values = dataArray.map(item => item[field]);
  const uniqueValues = new Set(values);
  return values.length === uniqueValues.size;
}

/**
 * Log seed result
 */
function logResult(collectionName, count, duration) {
  console.log(`📦 ${collectionName}: Inserted ${count} records (${duration}ms)`);
}

/**
 * Log error
 */
function logError(collectionName, error) {
  console.error(`❌ ${collectionName}: ${error.message}`);
}

/**
 * Seed a collection with data
 */
async function seedCollection(db, collectionName, data, options = {}) {
  const { clearBefore = false, dryRun = false } = options;
  const startTime = Date.now();

  try {
    const collection = db.collection(collectionName);

    if (clearBefore && !dryRun) {
      await collection.deleteMany({});
      console.log(`🗑️  ${collectionName}: Cleared existing data`);
    }

    const documents = transformBatch(data);

    if (!validateUnique(documents, 'ma')) {
      throw new Error(`Duplicate 'ma' values found in ${collectionName}`);
    }

    if (dryRun) {
      console.log(`🔍 ${collectionName}: Would insert ${documents.length} records (dry run)`);
      return { inserted: 0, dryRun: true };
    }

    const result = await collection.insertMany(documents);
    const duration = Date.now() - startTime;
    logResult(collectionName, result.insertedCount, duration);

    return { inserted: result.insertedCount, duration };
  } catch (error) {
    logError(collectionName, error);
    throw error;
  }
}

module.exports = {
  generateObjectId,
  isValidObjectId,
  now,
  transformToDocument,
  transformBatch,
  validateUnique,
  logResult,
  logError,
  seedCollection,
};
