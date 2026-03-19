import pg from "pg";

import { config } from "../config.js";

const { Pool } = pg;

const poolConfig = config.postgres.databaseUrl
  ? {
      connectionString: config.postgres.databaseUrl,
      ssl: { rejectUnauthorized: false }
    }
  : {
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      user: config.postgres.user,
      password: config.postgres.password
    };

export const pool = new Pool({
  ...poolConfig,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

export async function closePool() {
  await pool.end();
}
