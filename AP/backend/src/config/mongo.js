const { MongoClient } = require('mongodb');
const env = require('./env');

let client = null;
let db = null;
let isConnected = false;

// In-memory fallback stores for non-critical event data if MongoDB is offline
const inMemoryFallback = {
  study_sessions: [],
  activity_events: [],
  notifications: [],
};

async function connectMongo() {
  if (isConnected && db) return db;
  try {
    client = new MongoClient(env.mongodbUri, {
      serverSelectionTimeoutMS: 2000,
    });
    await client.connect();
    db = client.db();
    isConnected = true;
    console.log('[MongoDB] Connected successfully');
    return db;
  } catch (err) {
    console.warn('[MongoDB] Not available; operating in memory-fallback mode:', err.message);
    isConnected = false;
    db = null;
    return null;
  }
}

function getCollection(name) {
  if (isConnected && db) {
    return db.collection(name);
  }
  // Graceful in-memory mock collection for local development without active Mongo daemon
  const store = inMemoryFallback[name] || [];
  return {
    async insertOne(doc) {
      const withId = { _id: Date.now().toString() + Math.random().toString(36).substring(2, 7), ...doc, created_at: doc.created_at || new Date() };
      store.unshift(withId);
      return { insertedId: withId._id, acknowledged: true };
    },
    async find(query = {}) {
      let filtered = store.filter(item => {
        for (const [k, v] of Object.entries(query)) {
          if (item[k] !== v) return false;
        }
        return true;
      });
      return {
        sort: (sortObj = {}) => ({
          limit: (n) => ({
            toArray: async () => filtered.slice(0, n),
          }),
          toArray: async () => filtered,
        }),
        limit: (n) => ({
          toArray: async () => filtered.slice(0, n),
        }),
        toArray: async () => filtered,
      };
    },
    async findOne(query = {}) {
      return store.find(item => {
        for (const [k, v] of Object.entries(query)) {
          if (item[k] !== v) return false;
        }
        return true;
      }) || null;
    },
    async updateOne(filter = {}, update = {}) {
      const item = store.find(i => {
        for (const [k, v] of Object.entries(filter)) {
          if (i[k] !== v) return false;
        }
        return true;
      });
      if (item && update.$set) {
        Object.assign(item, update.$set);
        return { modifiedCount: 1, matchedCount: 1 };
      }
      return { modifiedCount: 0, matchedCount: item ? 1 : 0 };
    },
    async updateMany(filter = {}, update = {}) {
      let count = 0;
      store.forEach(i => {
        let match = true;
        for (const [k, v] of Object.entries(filter)) {
          if (i[k] !== v) { match = false; break; }
        }
        if (match && update.$set) {
          Object.assign(i, update.$set);
          count++;
        }
      });
      return { modifiedCount: count, matchedCount: count };
    },
    async countDocuments(query = {}) {
      return store.filter(item => {
        for (const [k, v] of Object.entries(query)) {
          if (item[k] !== v) return false;
        }
        return true;
      }).length;
    }
  };
}

async function closeMongo() {
  if (client) {
    await client.close();
    isConnected = false;
    db = null;
  }
}

module.exports = {
  connectMongo,
  getCollection,
  closeMongo,
  isMongoConnected: () => isConnected,
};
