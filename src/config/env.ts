// src/config/env.ts
import {CorsOptions} from "cors";
import dotenv from "dotenv";
import path from "path";
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({path: path.join(__dirname, "../../etc/secrets/.env")});
dotenv.config({path: path.join(__dirname, "../../.env")});

interface EnvConfig {
  FIRESTORE_DATABASE_URL: string;
  FIRESTORE_CLIENT_API_KEY: string;
  FIRESTORE_CLIENT_AUTH_DOMAIN: string;
  FIRESTORE_CLIENT_PROJECT_ID: string;
  FIRESTORE_CLIENT_STORAGE_BUCKET: string;
  w
  FIRESTORE_CLIENT_MESSAGING_SENDER_ID: string;
  FIRESTORE_CLIENT_APP_ID: string;
  FIRESTORE_CLIENT_MEASUREMENT_ID: string;
  // Admin SDK
  FIRESTORE_ADMIN_TYPE: string;
  FIRESTORE_ADMIN_PROJECT_ID: string;
  FIRESTORE_ADMIN_PRIVATE_KEY_ID: string;
  FIRESTORE_ADMIN_PRIVATE_KEY: string;
  FIRESTORE_ADMIN_CLIENT_EMAIL: string;
  FIRESTORE_ADMIN_CLIENT_ID: string;
  FIRESTORE_ADMIN_AUTH_URI: string;
  FIRESTORE_ADMIN_TOKEN_URI: string;
  FIRESTORE_ADMIN_AUTH_PROVIDER_X509_CERT_URL: string;
  FIRESTORE_ADMIN_CLIENT_X509_CERT_URL: string;
  FIRESTORE_ADMIN_UNIVERSE_DOMAIN: string;

  FIREBASE_SERVICE_ACCOUNT_PATH?: string;
  //
  NODE_ENV: string;
  PORT: number;
  JWT_SECRET: string;
  JWT_EXPIRE: string;
  BCRYPT_SALT_ROUNDS: number;
  // FRONTEND_URL: string;
  CORS_ORIGIN: CorsOptions;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
};

const CorsOrigins: CorsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:8080",
    "http://localhost:8081",
    "http://172.16.68.240:8081",
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[],
  credentials: true,
};

export const config: EnvConfig = {
  NODE_ENV: getEnvVar("NODE_ENV", "development"),
  PORT: parseInt(getEnvVar("PORT", "3001"), 10),
  JWT_SECRET: getEnvVar("JWT_SECRET"),
  JWT_EXPIRE: getEnvVar("JWT_EXPIRE", "7d"),
  BCRYPT_SALT_ROUNDS: parseInt(getEnvVar("BCRYPT_SALT_ROUNDS", "10"), 10),
  CORS_ORIGIN: CorsOrigins,
  FIRESTORE_DATABASE_URL: getEnvVar("FIRESTORE_DATABASE_URL"),
  FIRESTORE_CLIENT_API_KEY: getEnvVar("FIRESTORE_CLIENT_API_KEY"),
  FIRESTORE_CLIENT_AUTH_DOMAIN: getEnvVar("FIRESTORE_CLIENT_AUTH_DOMAIN"),
  FIRESTORE_CLIENT_PROJECT_ID: getEnvVar("FIRESTORE_CLIENT_PROJECT_ID"),
  FIRESTORE_CLIENT_STORAGE_BUCKET: getEnvVar("FIRESTORE_CLIENT_STORAGE_BUCKET"),
  FIRESTORE_CLIENT_MESSAGING_SENDER_ID: getEnvVar(
    "FIRESTORE_CLIENT_MESSAGING_SENDER_ID"
  ),
  FIRESTORE_CLIENT_APP_ID: getEnvVar("FIRESTORE_CLIENT_APP_ID"),
  FIRESTORE_CLIENT_MEASUREMENT_ID: getEnvVar("FIRESTORE_CLIENT_MEASUREMENT_ID"),

  FIRESTORE_ADMIN_TYPE: getEnvVar("FIRESTORE_ADMIN_TYPE"),
  FIRESTORE_ADMIN_PROJECT_ID: getEnvVar("FIRESTORE_ADMIN_PROJECT_ID"),
  FIRESTORE_ADMIN_PRIVATE_KEY_ID: getEnvVar("FIRESTORE_ADMIN_PRIVATE_KEY_ID"),
  FIRESTORE_ADMIN_PRIVATE_KEY: getEnvVar("FIRESTORE_ADMIN_PRIVATE_KEY").replace(
    /\\n/g,
    "\n"
  ),
  FIRESTORE_ADMIN_CLIENT_EMAIL: getEnvVar("FIRESTORE_ADMIN_CLIENT_EMAIL"),
  FIRESTORE_ADMIN_CLIENT_ID: getEnvVar("FIRESTORE_ADMIN_CLIENT_ID"),
  FIRESTORE_ADMIN_AUTH_URI: getEnvVar("FIRESTORE_ADMIN_AUTH_URI"),
  FIRESTORE_ADMIN_TOKEN_URI: getEnvVar("FIRESTORE_ADMIN_TOKEN_URI"),
  FIRESTORE_ADMIN_AUTH_PROVIDER_X509_CERT_URL: getEnvVar(
    "FIRESTORE_ADMIN_AUTH_PROVIDER_X509_CERT_URL"
  ),
  FIRESTORE_ADMIN_CLIENT_X509_CERT_URL: getEnvVar(
    "FIRESTORE_ADMIN_CLIENT_X509_CERT_URL"
  ),
  FIRESTORE_ADMIN_UNIVERSE_DOMAIN: getEnvVar("FIRESTORE_ADMIN_UNIVERSE_DOMAIN"),
};

export const isDevelopment = config.NODE_ENV === "development";
export const isProduction = config.NODE_ENV === "production";
