import "../../config/loadEnv.js";
import { createOpenAI } from "@ai-sdk/openai";

export const openrouter = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
  // Omit apiKey so the SDK reads OPENAI_API_KEY on each request (avoids
  // capturing undefined/empty values before dotenv loads).
  headers: {
    "HTTP-Referer": process.env.CLIENT_URL || "http://localhost:5173",
    "X-Title": "task-management-app",
  },
});
