import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Drizzle client for server-side queries.
 * Uses DATABASE_URL (postgres connection string).
 * This module is server-only — never imported from the browser.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Missing env var: DATABASE_URL');
}

// Disable prefetching as it is not supported for "transaction" pool mode.
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
