#!/usr/bin/env node
/**
 * Applies supabase/migrations/*.sql to the project in order.
 *
 * Credentials (one of the two):
 *   SUPABASE_ACCESS_TOKEN  - a Supabase personal access token (Management API)
 *   DATABASE_URL          - a direct Postgres connection string
 *
 * The project ref is read from NEXT_PUBLIC_SUPABASE_URL in .env.local.
 *
 * Each file is sent as one multi-statement query, so a failure rolls the whole
 * file back. Every migration is written to be re-runnable, so a failed file
 * can simply be run again.
 */

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");

async function loadEnv() {
  const file = path.join(ROOT, ".env.local");
  if (!existsSync(file)) return;
  const content = await readFile(file, "utf8");
  for (const line of content.split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, value] = match;
    if (process.env[key] === undefined) {
      process.env[key] = value.replace(/^["']|["']$/g, "");
    }
  }
}

function projectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing from .env.local");
  return new URL(url).host.split(".")[0];
}

async function runViaManagementApi(token, ref, sql) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 800)}`);
  }
  return text;
}

async function runViaPostgres(databaseUrl, sql) {
  const { Client } = await import("pg");
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const result = await client.query(sql);
    return JSON.stringify(result.rows ?? []);
  } finally {
    await client.end();
  }
}

async function main() {
  await loadEnv();

  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const databaseUrl = process.env.DATABASE_URL;

  if (!token && !databaseUrl) {
    console.error(
      "No credentials found.\n" +
        "Set SUPABASE_ACCESS_TOKEN (personal access token) or DATABASE_URL and run again."
    );
    process.exit(1);
  }

  const ref = projectRef();
  const runner = token
    ? (sql) => runViaManagementApi(token, ref, sql)
    : (sql) => runViaPostgres(databaseUrl, sql);

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  console.log(`Applying ${files.length} migrations to ${ref}\n`);

  for (const file of files) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    process.stdout.write(`  ${file} ... `);
    const started = Date.now();

    try {
      await runner(sql);
      console.log(`ok (${Date.now() - started}ms)`);
    } catch (error) {
      console.log(`FAILED (${Date.now() - started}ms)`);
      console.error(`\n${error.message}\n`);
      console.error(
        "The whole file was rolled back. Fix the error and run it again."
      );
      process.exit(1);
    }
  }

  console.log("\nAll migrations applied.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
