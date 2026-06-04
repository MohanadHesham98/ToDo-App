require("dotenv").config();

function toBoolean(value, defaultValue) {
  if (value === undefined || value === "") return defaultValue;
  return value === "true";
}

function toNumber(value, defaultValue) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const isProduction = process.env.NODE_ENV === "production";

const config = {
  env: process.env.NODE_ENV || "development",

  // Configure these in Docker/Kubernetes with env vars or ConfigMaps.
  port: toNumber(process.env.PORT, 3000),
  host: process.env.HOST || "0.0.0.0",
  corsOrigin: process.env.CORS_ORIGIN || "",

  // Configure these in Kubernetes Secret/ConfigMap before enabling SQL persistence.
  database: {
    server: isProduction ? requireEnv("SQL_SERVER") : process.env.SQL_SERVER || "localhost",
    port: toNumber(process.env.SQL_PORT, 1433),
    database: isProduction ? requireEnv("SQL_DATABASE") : process.env.SQL_DATABASE || "TaskFlowTodo",
    user: isProduction ? requireEnv("SQL_USER") : process.env.SQL_USER,
    password: isProduction ? requireEnv("SQL_PASSWORD") : process.env.SQL_PASSWORD,
    encrypt: toBoolean(process.env.SQL_ENCRYPT, true),
    trustServerCertificate: toBoolean(process.env.SQL_TRUST_SERVER_CERTIFICATE, !isProduction),
    connectionTimeout: toNumber(process.env.SQL_CONNECTION_TIMEOUT_MS, 15000),
    requestTimeout: toNumber(process.env.SQL_REQUEST_TIMEOUT_MS, 15000),
  },
};

module.exports = config;
