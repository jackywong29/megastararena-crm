// Regenerates supabase/schema-current.md — the ground-truth snapshot of the live
// database schema (tables, columns, constraints, RLS policies, indexes, triggers).
//
// Usage: npm run db:schema
//
// Connects as the `claude_readonly` Postgres role (SELECT-only; RLS still applies,
// and this script reads catalog metadata only — never table rows). Requires
// CLAUDE_READONLY_DB_PASSWORD in .env.local, or a full SUPABASE_DB_URL override.

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const PROJECT_REF = 'ohtkqgvzagipbmpyozae'
const OUT_FILE = path.join(root, 'supabase', 'schema-current.md')

// .env.local isn't auto-loaded outside Next.js — parse it directly.
const env = {}
try {
  for (const line of readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (m) env[m[1]] = m[2].trim()
  }
} catch {
  /* no .env.local — fall through to the error below */
}

const password = env.CLAUDE_READONLY_DB_PASSWORD
if (!password && !env.SUPABASE_DB_URL) {
  console.error('Missing CLAUDE_READONLY_DB_PASSWORD (or SUPABASE_DB_URL) in .env.local')
  process.exit(1)
}

// Direct host first; Supabase's IPv4 poolers as fallbacks (username = role.projectref).
const candidates = env.SUPABASE_DB_URL
  ? [env.SUPABASE_DB_URL]
  : [
      `postgresql://claude_readonly:${password}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
      `postgresql://claude_readonly.${PROJECT_REF}:${password}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
      `postgresql://claude_readonly.${PROJECT_REF}:${password}@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres`,
    ]

async function connect() {
  const failures = []
  for (const uri of candidates) {
    const client = new pg.Client({
      connectionString: uri,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    })
    try {
      await client.connect()
      return client
    } catch (e) {
      failures.push(`  ${uri.replace(/:[^:@/]+@/, ':***@')}\n    → ${e.message}`)
    }
  }
  console.error(`Could not connect to the database. Tried:\n${failures.join('\n')}`)
  console.error(
    '\nIf the claude_readonly role exists, copy the exact "Session mode" connection string from the Supabase dashboard (Connect button) into .env.local as SUPABASE_DB_URL (username claude_readonly, same password).'
  )
  process.exit(1)
}

const client = await connect()
const q = async (sql) => (await client.query(sql)).rows

const tables = await q(`
  select table_name from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`)

const columns = await q(`
  select table_name, column_name, data_type, udt_name, is_nullable, column_default
  from information_schema.columns
  where table_schema = 'public' order by table_name, ordinal_position`)

const constraints = await q(`
  select rel.relname as table_name, con.conname, con.contype,
         pg_get_constraintdef(con.oid) as def
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
  order by rel.relname, con.contype, con.conname`)

const rlsFlags = await q(`
  select c.relname, c.relrowsecurity
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'`)

const policies = await q(`
  select tablename, policyname, cmd, roles, qual, with_check
  from pg_policies where schemaname = 'public' order by tablename, policyname`)

const indexes = await q(`
  select tablename, indexname, indexdef
  from pg_indexes where schemaname = 'public' order by tablename, indexname`)

const triggers = await q(`
  select event_object_table as table_name, trigger_name, action_timing,
         event_manipulation, action_statement
  from information_schema.triggers
  where trigger_schema = 'public' order by 1, 2`)

const routines = await q(`
  select routine_name, routine_type from information_schema.routines
  where routine_schema = 'public' order by routine_name`)

await client.end()

const typeOf = (c) =>
  c.data_type === 'ARRAY' ? `${c.udt_name.replace(/^_/, '')}[]` : c.data_type
const CONTYPE = { p: 'PRIMARY KEY', f: 'FOREIGN KEY', u: 'UNIQUE', c: 'CHECK', x: 'EXCLUDE' }

let md = `# Live database schema — ${PROJECT_REF}

> **GENERATED FILE — do not edit.** Regenerate with \`npm run db:schema\`.
> Snapshot taken: ${new Date().toISOString()}
> This reflects the *actual* database, not the intent of the schema-v*.sql history.

`

// The enum gotcha gets its own section up top: CHECK constraints are the thing
// TypeScript unions silently drift away from.
const checks = constraints.filter((c) => c.contype === 'c')
md += `## ⚠️ All CHECK constraints (verify before adding any enum value)\n\n`
md += checks.length
  ? checks.map((c) => `- \`${c.table_name}\` — \`${c.conname}\`: ${c.def}`).join('\n') + '\n\n'
  : '_(none)_\n\n'

md += `## Tables (${tables.length})\n\n`
for (const { table_name } of tables) {
  md += `### ${table_name}\n\n`
  md += `| column | type | nullable | default |\n|---|---|---|---|\n`
  for (const c of columns.filter((c) => c.table_name === table_name)) {
    md += `| ${c.column_name} | ${typeOf(c)} | ${c.is_nullable} | ${c.column_default ?? ''} |\n`
  }
  const cons = constraints.filter((c) => c.table_name === table_name)
  if (cons.length) {
    md += `\nConstraints:\n`
    for (const c of cons) md += `- ${CONTYPE[c.contype] ?? c.contype} \`${c.conname}\`: ${c.def}\n`
  }
  const rls = rlsFlags.find((r) => r.relname === table_name)
  md += `\nRLS: ${rls?.relrowsecurity ? 'enabled' : '**disabled**'}\n`
  const pols = policies.filter((p) => p.tablename === table_name)
  for (const p of pols) {
    md += `- policy \`${p.policyname}\` (${p.cmd} to ${p.roles})${p.qual ? ` using: ${p.qual}` : ''}${p.with_check ? ` check: ${p.with_check}` : ''}\n`
  }
  const idx = indexes.filter((i) => i.tablename === table_name)
  if (idx.length) {
    md += `\nIndexes:\n`
    for (const i of idx) md += `- ${i.indexdef}\n`
  }
  const trg = triggers.filter((t) => t.table_name === table_name)
  if (trg.length) {
    md += `\nTriggers:\n`
    for (const t of trg) md += `- \`${t.trigger_name}\` ${t.action_timing} ${t.event_manipulation}: ${t.action_statement}\n`
  }
  md += '\n'
}

md += `## Functions (${routines.length})\n\n`
md += routines.map((r) => `- ${r.routine_name} (${r.routine_type?.toLowerCase()})`).join('\n') + '\n'

writeFileSync(OUT_FILE, md)
console.log(
  `Wrote ${path.relative(root, OUT_FILE)} — ${tables.length} tables, ${checks.length} CHECK constraints, ${policies.length} RLS policies.`
)
