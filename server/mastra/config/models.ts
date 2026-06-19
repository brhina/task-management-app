import { openrouter } from "./providers.js";

/** Free OpenRouter chat model (supports tool calling). */
const DEFAULT_MODEL_ID =
  process.env.OPENROUTER_MODEL || "nvidia/nemotron-nano-9b-v2:free";

const EXECUTIVE_MODEL_ID =
  process.env.OPENROUTER_EXECUTIVE_MODEL || DEFAULT_MODEL_ID;

export const DEFAULT_MODEL = openrouter.chat(DEFAULT_MODEL_ID);
export const EXECUTIVE_MODEL = openrouter.chat(EXECUTIVE_MODEL_ID);

/** Embeddings routed through OpenRouter's OpenAI-compatible API. */
export const EMBEDDING_MODEL =
  process.env.OPENROUTER_EMBEDDING_MODEL || "openai/text-embedding-3-small";
