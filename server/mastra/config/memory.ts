import "../../config/loadEnv.js";
import { Memory } from "@mastra/memory";
import { MongoDBStore } from "@mastra/mongodb";

let sharedStore: MongoDBStore | null = null;

export function getMongoDBStore(): MongoDBStore {
  if (!sharedStore) {
    sharedStore = new MongoDBStore({
      id: "execution-intelligence",
      uri: process.env.MONGO_URI!,
      dbName: process.env.MONGODB_AI_DB_URI || "taskmanager_ai",
    });
  }
  return sharedStore;
}

export function createAgentMemory(): Memory {
  return new Memory({
    storage: getMongoDBStore(),
    options: {
      lastMessages: 20,
      semanticRecall: false,
      workingMemory: {
        enabled: true,
      },
    },
  });
}
