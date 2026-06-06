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
// connect_timeout: fail fast (10 s) so build prerender falls back to fixtures
// instead of hanging until Next's 60 s prerender timeout kills the worker.
const client = postgres(connectionString, { prepare: false, connect_timeout: 10 });

export const db = drizzle(client, { schema });
