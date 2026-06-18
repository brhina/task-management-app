import dotenv from "dotenv";
import { Memory } from "@mastra/memory";
import { MongoDBStore } from "@mastra/mongodb";

dotenv.config();

let sharedStore: MongoDBStore | null = null;

export function getMongoDBStore(): MongoDBStore {
  if (!sharedStore) {
    console.log("MONGO_URI =", process.env.MONGO_URI);
console.log("NODE_ENV =", process.env.NODE_ENV);
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
