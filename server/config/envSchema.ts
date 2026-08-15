import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("3001"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MONGO_URI: z.string().optional(),
  JWT_SECRET: z.string().default("default_dev_jwt_secret_change_in_production"),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  REDIS_URL: z.string().optional(),
  TELEBIRR_MODE: z.enum(["sandbox", "live"]).default("sandbox"),
  TELEBIRR_NOTIFY_SECRET: z.string().optional(),
  TELEBIRR_APP_ID: z.string().optional(),
  TELEBIRR_APP_KEY: z.string().optional(),
  TELEBIRR_SHORT_CODE: z.string().optional(),
  TELEBIRR_API_BASE: z.string().optional(),
  SERVER_PUBLIC_URL: z.string().optional(),
});

export const validateEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.format());
    process.exit(1);
  }

  return result.data;
};

export type EnvConfig = z.infer<typeof envSchema>;
