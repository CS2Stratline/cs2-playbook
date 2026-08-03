#!/usr/bin/env node
/**
 * Apply vote schema migrations + enable anonymous auth (for no-login voting).
 *
 * Requires:
 *   SUPABASE_ACCESS_TOKEN: https://supabase.com/dashboard/account/tokens
 *   SUPABASE_PROJECT_REF: optional; defaults from VITE_SUPABASE_URL
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
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const refFromUrl = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "";
const projectRef = process.env.SUPABASE_PROJECT_REF || refFromUrl;

if (!projectRef) {
  console.error("Missing SUPABASE_PROJECT_REF (or VITE_SUPABASE_URL to derive it).");
  process.exit(1);
}
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens).");
  process.exit(1);
}

const voteMigrations = readdirSync(migrationsDir)
  .filter((f) => /^\d+_.*vote.*\.sql$/i.test(f))
  .sort();

if (!voteMigrations.length) {
  console.error("No vote migrations found");
  process.exit(1);
}

async function applySql(query, label) {
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
    console.error(`Failed ${label} (${res.status}):`, text.slice(0, 800));
    process.exit(1);
  }
  console.log(`Applied ${label}`);
}

async function enableAnonymousAuth() {
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
  await applySql(readFileSync(resolve(migrationsDir, file), "utf8"), file);
}

await enableAnonymousAuth();
console.log("Done.");
