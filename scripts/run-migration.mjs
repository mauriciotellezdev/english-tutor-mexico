/**
 * Run a Supabase SQL migration against the database.
 * Usage: bun run scripts/run-migration.mjs [migration_number]
 * Example: bun run scripts/run-migration.mjs 004
 */

import { Client } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');

const migrationNum = process.argv[2];
if (!migrationNum) {
  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  console.log('Available migrations:');
  files.forEach(f => console.log(`  ${f}`));
  console.log('\nUsage: bun run scripts/run-migration.mjs <number>');
  console.log('Example: bun run scripts/run-migration.mjs 004');
  process.exit(1);
}

const paddedNum = migrationNum.padStart(3, '0');
const migrationFile = readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql') && f.startsWith(paddedNum))
  .sort()[0];

if (!migrationFile) {
  console.error(`Migration ${paddedNum} not found in ${migrationsDir}`);
  process.exit(1);
}

const client = new Client({
  host: 'db.qkjgaoivtfynutxsjmqs.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.DATABASE_PASSWORD || 'Lf@n-9M_f@A*.*m!sd',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    console.log(`Running migration: ${migrationFile}`);
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    const sql = readFileSync(join(migrationsDir, migrationFile), 'utf-8');
    console.log('Executing SQL...');
    await client.query(sql);
    console.log(`Migration ${migrationFile} applied successfully!`);

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Done.');
  }
}

main();
