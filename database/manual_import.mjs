import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(__dirname, '..', 'server', 'package.json'));
const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: join(__dirname, '..', 'server', '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is missing. Set it or add server/.env.');
  process.exit(1);
}

function poolUsesSsl(url, sslEnv) {
  if (sslEnv === 'true') return true;
  if (sslEnv === 'false') return false;
  try {
    const { hostname } = new URL(url);
    const h = hostname.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return false;
  } catch {
    return true;
  }
  return true;
}

const sslEnv = process.env.DATABASE_SSL ?? 'auto';
const useSsl = poolUsesSsl(connectionString, sslEnv);

const files = [
  'schema.sql',
  'data.sql',
  'drizzle-baseline-after-import.sql',
];

const client = new Client({
  connectionString,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : { ssl: false }),
});

await client.connect();
try {
  for (const name of files) {
    const path = join(__dirname, name);
    const sql = readFileSync(path, 'utf8');
    console.error(`Running ${name} …`);
    await client.query(sql);
  }
  console.error('Done.');
  console.error(
    'Next: create the demo account (data.sql has no users). From repo root run: pnpm run db:seed',
  );
} finally {
  await client.end();
}
