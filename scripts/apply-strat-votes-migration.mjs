#!/usr/bin/env node
/**
 * Apply supabase/migrations/011_strat_votes.sql via the Supabase Management API.
 *
 * Requires:
 *   SUPABASE_ACCESS_TOKEN  — https://supabase.com/dashboard/account/tokens
 *   SUPABASE_PROJECT_REF   — optional; defaults to ref parsed from VITE_SUPABASE_URL
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/apply-strat-votes-migration.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = resolve(__dirname, "../supabase/migrations/011_strat_votes.sql");

const token = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_PAT || "";
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const refFromUrl = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "";
const projectRef = process.env.SUPABASE_PROJECT_REF || refFromUrl;

if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN (create one at https://supabase.com/dashboard/account/tokens).");
  process.exit(1);
}
if (!projectRef) {
  console.error("Missing SUPABASE_PROJECT_REF (or VITE_SUPABASE_URL to derive it).");
  process.exit(1);
}

const query = readFileSync(sqlPath, "utf8");
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
  console.error(`Migration failed (${res.status}):`, text.slice(0, 800));
  process.exit(1);
}

console.log("Applied 011_strat_votes.sql to", projectRef);
if (text && text !== "[]" && text !== "null") console.log(text.slice(0, 400));
