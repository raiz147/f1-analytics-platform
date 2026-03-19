import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readRequiredString(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readNumber(name, fallback) {
  const rawValue = process.env[name] ?? fallback;
  const value = Number(rawValue);
  if (Number.isNaN(value)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }
  return value;
}

function readStringList(name, fallback) {
  const rawValue = process.env[name] ?? fallback;
  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function readOptionalString(name) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

function readBoolean(name, fallback) {
  const rawValue = (process.env[name] ?? fallback).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(rawValue);
}

export const config = {
  port: readNumber("PORT", "3000"),
  openf1BaseUrl: readRequiredString("OPENF1_BASE_URL", "https://api.openf1.org/v1"),
  enableSessionImports: readBoolean("ENABLE_SESSION_IMPORTS", "true"),
  frontendOrigins: readStringList(
    "FRONTEND_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
  ),
  pipeline: {
    workdir: readRequiredString(
      "PIPELINE_WORKDIR",
      path.resolve(__dirname, "../../../pipeline")
    ),
    pythonPath: readRequiredString(
      "PIPELINE_PYTHON_PATH",
      path.resolve(__dirname, "../../../pipeline/.venv/Scripts/python.exe")
    )
  },
  postgres: {
    databaseUrl: readOptionalString("DATABASE_URL"),
    host: readRequiredString("POSTGRES_HOST", "localhost"),
    port: readNumber("POSTGRES_PORT", "5432"),
    database: readRequiredString("POSTGRES_DB", "f1_analytics"),
    user: readRequiredString("POSTGRES_USER", "f1"),
    password: readRequiredString("POSTGRES_PASSWORD", "f1_password")
  }
};
