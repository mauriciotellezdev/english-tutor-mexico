/**
 * Run the Supabase SQL schema directly against the database.
 * Usage: bun run scripts/run-schema.mjs
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = new Client({
  host: 'db.qkjgaoivtfynutxsjmqs.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Lf@n-9M_f@A*.*m!sd',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    const sql = readFileSync(
      join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql'),
      'utf-8'
    );

    console.log('Running schema...');
    await client.query(sql);
    console.log('Schema applied successfully!');

    // Now set the teacher role — we need to find the user first
    console.log('\nChecking for existing users...');
    const { rows } = await client.query(
      "SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5"
    );

    if (rows.length === 0) {
      console.log('No users found. You need to create your teacher account first.');
      console.log('Go to: https://supabase.com/dashboard/project/qkjgaoivtfynutxsjmqs/auth/users');
      console.log('Click "Add user" → "Create new user" with your email.');
    } else {
      console.log('\nExisting users:');
      rows.forEach((row, i) => {
        console.log(`  ${i + 1}. ${row.email} (${row.id})`);
      });

      console.log('\nTo set a user as teacher, run this in Supabase SQL Editor:');
      console.log(`UPDATE profiles SET role = 'teacher' WHERE email = 'YOUR_EMAIL@example.com';`);
    }

  } catch (err) {
    console.error('Error:', err.message);
    if (err.message.includes('relation "auth.users" does not exist')) {
      console.log('\nNote: auth schema may not be accessible via direct connection.');
      console.log('The schema SQL should still have been applied for the public tables.');
    }
  } finally {
    await client.end();
    console.log('\nDone.');
  }
}

main();
