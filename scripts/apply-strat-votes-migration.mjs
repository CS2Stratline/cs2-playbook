#!/usr/bin/env node
/**
 * Apply vote schema migrations + enable anonymous auth (for no-login voting).
 *
 * Requires:
 *   SUPABASE_ACCESS_TOKEN  — https://supabase.com/dashboard/account/tokens
 *   SUPABASE_PROJECT_REF   — optional; defaults from VITE_SUPABASE_URL
 *   SUPABASE_DB_PASSWORD   — optional alternative to ACCESS_TOKEN for SQL only
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_... npm run migrate:votes
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(__dirname, "../supabase/migrations");

const token = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_PAT || "";
const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD || "";
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const refFromUrl = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "";
const projectRef = process.env.SUPABASE_PROJECT_REF || refFromUrl;

if (!projectRef) {
  console.error("Missing SUPABASE_PROJECT_REF (or VITE_SUPABASE_URL to derive it).");
  process.exit(1);
}

const voteMigrations = readdirSync(migrationsDir)
  .filter((f) => /^\d+_.*vote.*\.sql$/i.test(f) || f === "011_strat_votes.sql" || f === "012_vote_ip_lock.sql")
  .sort();

if (!voteMigrations.length) {
  console.error("No vote migrations found");
  process.exit(1);
}

async function applySqlViaManagementApi(query, label) {
  if (!token) return false;
  const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`SQL via Management API failed for ${label} (${res.status}):`, text.slice(0, 800));
    return false;
  }
  console.log(`Applied ${label} via Management API`);
  return true;
}

async function applySqlViaPg(query, label) {
  if (!dbPassword) return false;
  const { Client } = await import("pg");
  const hosts = [
    { host: "aws-0-eu-central-1.pooler.supabase.com", port: 6543 },
    { host: "aws-0-eu-central-1.pooler.supabase.com", port: 5432 },
  ];
  for (const h of hosts) {
    const client = new Client({
      host: h.host,
      port: h.port,
      user: `postgres.${projectRef}`,
      password: dbPassword,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
    try {
      await client.connect();
      await client.query(query);
      console.log(`Applied ${label} via pooler ${h.host}:${h.port}`);
      await client.end();
      return true;
    } catch (e) {
      console.warn(`Pooler ${h.host}:${h.port} failed:`, e instanceof Error ? e.message.slice(0, 120) : e);
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
  return false;
}

async function enableAnonymousAuth() {
  if (!token) {
    console.warn("Skip enabling anonymous auth — no SUPABASE_ACCESS_TOKEN");
    return;
  }
  const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
  const res = await fetch(endpoint, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_anonymous_users_enabled: true,
      security_manual_linking_enabled: true,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Enable anonymous auth failed (${res.status}):`, text.slice(0, 800));
    console.error("Toggle manually: Authentication → Providers → Anonymous Sign-Ins + Manual Linking");
    return;
  }
  console.log("Enabled anonymous sign-ins + manual identity linking");
}

for (const file of voteMigrations) {
  const query = readFileSync(resolve(migrationsDir, file), "utf8");
  const ok = (await applySqlViaManagementApi(query, file)) || (await applySqlViaPg(query, file));
  if (!ok) {
    console.error(`Could not apply ${file}. Provide SUPABASE_ACCESS_TOKEN or SUPABASE_DB_PASSWORD.`);
    process.exit(1);
  }
}

await enableAnonymousAuth();
console.log("Done. Vote migrations applied; guests vote via anonymous sessions with IP soft-lock.");
