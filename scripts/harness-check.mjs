// Pre-ship regression suite — run before declaring any change ready to push.
//
// Usage: npm run harness:check   (exit 1 on any failure; warnings don't fail)
//
// Every check here exists because of a real production escape or a known drift
// risk (see "Escapes log" in PROJECT_STATUS.md). When a new bug is found in
// production after a batch was declared done, it either becomes a check in this
// file or gets an explicit "can't automate" note in that log.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { spawnSync, execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const SNAPSHOT = path.join(root, 'supabase', 'schema-current.md')
const TYPES = path.join(root, 'types', 'index.ts')
const STATUS = path.join(root, 'PROJECT_STATUS.md')
const CLAUDE_MD = path.join(root, 'CLAUDE.md')

// Which DB CHECK constraint(s) each string-literal union in types/index.ts must
// stay in sync with. A union added to types/index.ts but missing here triggers a
// warning — classify it below (or in UI_ONLY_UNIONS) when adding it.
const ENUM_MAP = {
  Department: [['profiles', 'department'], ['tasks', 'department']],
  UserRole: [['profiles', 'role']], // no CHECK in the DB today; picked up automatically if one is added
  ShowStage: [['shows', 'stage']],
  EventType: [['shows', 'event_type']],
  TaskStatus: [['tasks', 'status']],
  DocumentCategory: [['documents', 'category']],
  NotificationType: [['notifications', 'type']],
  LeaveType: [['leave_applications', 'leave_type']],
  LeaveStatus: [['leave_applications', 'status']],
  ChecklistSection: [['show_checklist_items', 'section']],
}
// Unions that never touch the DB (UI state, filters, …).
const UI_ONLY_UNIONS = []
// DB values TypeScript intentionally no longer produces, keyed "table.column".
const ALLOWED_DB_EXTRAS = {}

// Combined word budget for CLAUDE.md + PROJECT_STATUS.md — both load into every
// session, so growth is a context tax. Crossing it means a slimming pass is due.
const DOC_WORD_BUDGET = 2500

const failures = []
const warnings = []
const pass = (msg) => console.log(`✔ ${msg}`)
const fail = (msg) => { failures.push(msg); console.log(`✘ FAIL — ${msg}`) }
const warn = (msg) => { warnings.push(msg); console.log(`⚠ warn — ${msg}`) }

const gitDate = (...files) => {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', ...files], {
      cwd: root, encoding: 'utf8',
    }).trim()
    return out ? new Date(out) : null
  } catch { return null }
}

// ── 1. Enum ↔ CHECK-constraint drift ─────────────────────────────────────────
// The twice-hit production failure: a TS union gains a value, the DB CHECK
// doesn't, inserts crash. TS value missing from DB = fail; DB value missing
// from TS = warn (code can't produce it, but flag the asymmetry).
{
  const unions = {}
  for (const line of readFileSync(TYPES, 'utf8').split('\n')) {
    const m = line.match(/^export type (\w+) = (.+)$/)
    if (!m) continue
    const parts = m[2].split('|').map((p) => p.trim())
    if (!parts.every((p) => /^'[^']*'$/.test(p))) continue // not a pure string-literal union
    unions[m[1]] = parts.map((p) => p.slice(1, -1))
  }

  const snapshotMd = readFileSync(SNAPSHOT, 'utf8')
  const checkSection = snapshotMd.split(/^## /m).find((s) => s.startsWith('⚠️ All CHECK constraints')) ?? ''
  const dbChecks = {} // "table.column" → [values]
  for (const line of checkSection.split('\n')) {
    const m = line.match(/^- `(\w+)` — `\w+`: CHECK \((.+)\)$/)
    if (!m) continue
    const col = m[2].match(/\(?(\w+) = ANY/)?.[1]
    const values = [...m[2].matchAll(/'([^']*)'::text/g)].map((v) => v[1])
    if (col && values.length) dbChecks[`${m[1]}.${col}`] = values
  }

  // Parse guards: an empty result means the format changed, not that all is well.
  if (!Object.keys(unions).length) fail(`could not parse any string-literal unions from types/index.ts — fix this script`)
  else if (!Object.keys(dbChecks).length) fail(`could not parse any CHECK constraints from schema-current.md — regenerate it (npm run db:schema) or fix this script`)
  else {
    let drift = 0
    for (const [union, values] of Object.entries(unions)) {
      if (UI_ONLY_UNIONS.includes(union)) continue
      const targets = ENUM_MAP[union]
      if (!targets) { warn(`union ${union} in types/index.ts has no entry in ENUM_MAP — add it (or to UI_ONLY_UNIONS) in scripts/harness-check.mjs`); continue }
      for (const [table, column] of targets) {
        const key = `${table}.${column}`
        const db = dbChecks[key]
        if (!db) continue // column has no CHECK constraint — nothing to violate
        for (const v of values) {
          if (!db.includes(v)) {
            drift++
            fail(`enum drift: ${union} has '${v}' but DB CHECK on ${key} rejects it — inserts WILL crash in production. Ship a drop-and-recreate migration (pattern: supabase/schema-v6.sql), have Jacky run it, then npm run db:schema.`)
          }
        }
        for (const v of db) {
          if (!values.includes(v) && !(ALLOWED_DB_EXTRAS[key] ?? []).includes(v)) {
            warn(`DB CHECK on ${key} allows '${v}' but ${union} doesn't include it (legacy value? add to ALLOWED_DB_EXTRAS if intentional)`)
          }
        }
      }
    }
    if (!drift) pass(`enum↔CHECK drift: ${Object.keys(unions).length} unions vs ${Object.keys(dbChecks).length} constrained columns — no drift`)
  }
}

// ── 2. DB snapshot freshness ──────────────────────────────────────────────────
// schema-current.md is trusted as ground truth, so a stale one lies with
// authority. Any migration file newer than the snapshot = the snapshot may not
// reflect the live DB.
{
  const snapMatch = readFileSync(SNAPSHOT, 'utf8').match(/> Snapshot taken: (\S+)/)
  if (!snapMatch) fail('schema-current.md has no "Snapshot taken" timestamp — regenerate with npm run db:schema')
  else {
    const snapDate = new Date(snapMatch[1])
    const sqlFiles = readdirSync(path.join(root, 'supabase')).filter((f) => f.endsWith('.sql'))
    const stale = sqlFiles.filter((f) => {
      const p = path.join(root, 'supabase', f)
      const d = gitDate(p) ?? statSync(p).mtime // untracked new migration → mtime
      return d > snapDate
    })
    if (stale.length) fail(`DB snapshot older than migration file(s): ${stale.join(', ')} — confirm with Jacky the migration ran, then npm run db:schema`)
    else pass(`DB snapshot freshness: snapshot ${snapMatch[1].slice(0, 10)} ≥ newest migration file`)

    const highest = Math.max(...sqlFiles.map((f) => Number(f.match(/schema-v(\d+)\.sql/)?.[1] ?? 0)))
    const migSection = readFileSync(STATUS, 'utf8').split(/^## /m).find((s) => s.startsWith('Database migrations')) ?? ''
    if (highest && !new RegExp(`v${highest}\\b`).test(migSection)) {
      warn(`PROJECT_STATUS.md migration list doesn't mention v${highest} (highest file on disk) — update the doc`)
    }
  }
}

// ── 3. Mobile safe-area regression ────────────────────────────────────────────
// Fixed-bottom elements have trapped content behind the iOS bottom bar twice.
// Any file with a fixed+bottom-0 className must handle safe-area-inset-bottom
// (pattern: components/layout/MobileNav.tsx).
{
  const tsxFiles = ['app', 'components']
    .filter((d) => existsSync(path.join(root, d)))
    .flatMap((d) => readdirSync(path.join(root, d), { recursive: true }).map((f) => path.join(d, String(f))))
    .filter((f) => /\.tsx?$/.test(f))
  const offenders = []
  let fixedBottomCount = 0
  for (const f of tsxFiles) {
    const content = readFileSync(path.join(root, f), 'utf8')
    const quoted = content.match(/["'`][^"'`\n]*["'`]/g) ?? []
    if (quoted.some((s) => /\bfixed\b/.test(s) && /\bbottom-0\b/.test(s))) {
      fixedBottomCount++
      if (!content.includes('safe-area-inset-bottom')) offenders.push(f)
    }
  }
  if (offenders.length) fail(`fixed-bottom element without safe-area handling: ${offenders.join(', ')} — follow the pb-[env(safe-area-inset-bottom)] pattern in components/layout/MobileNav.tsx`)
  else pass(`safe-area: ${fixedBottomCount} fixed-bottom element(s), all handle safe-area-inset-bottom`)
}

// ── 4. Doc weight + freshness ─────────────────────────────────────────────────
{
  const words = (f) => readFileSync(f, 'utf8').split(/\s+/).filter(Boolean).length
  const total = words(CLAUDE_MD) + words(STATUS)
  if (total > DOC_WORD_BUDGET) warn(`CLAUDE.md + PROJECT_STATUS.md at ${total} words (budget ${DOC_WORD_BUDGET}) — time for a slimming pass; move dead detail to git history`)
  else pass(`doc budget: ${total}/${DOC_WORD_BUDGET} words`)

  const updated = readFileSync(STATUS, 'utf8').match(/\*\*Last updated:\*\* (\d{4}-\d{2}-\d{2})/)?.[1]
  const lastCode = gitDate('app', 'components', 'lib', 'types')
  if (updated && lastCode && lastCode.toISOString().slice(0, 10) > updated) {
    warn(`code last committed ${lastCode.toISOString().slice(0, 10)} but PROJECT_STATUS.md last updated ${updated} — update it at the end of this session`)
  } else if (updated) pass(`doc freshness: PROJECT_STATUS.md updated ${updated}, not behind code commits`)
}

// ── 5. Typecheck (slowest, runs last) ─────────────────────────────────────────
{
  const r = spawnSync('npx', ['tsc', '--noEmit'], { cwd: root, encoding: 'utf8' })
  if (r.status !== 0) {
    console.log(r.stdout || r.stderr)
    fail('tsc --noEmit failed (errors above)')
  } else pass('typecheck: tsc --noEmit clean')
}

console.log('')
if (failures.length) {
  console.log(`❌ ${failures.length} failure(s), ${warnings.length} warning(s) — NOT ready to push.`)
  process.exit(1)
}
console.log(warnings.length ? `⚠️  All checks passed with ${warnings.length} warning(s).` : '✅ All harness checks passed.')
