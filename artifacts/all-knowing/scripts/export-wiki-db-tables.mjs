#!/usr/bin/env node
// Task 140 §1 — export the wiki DB's parsed `spells` table.
//
// The Fandom item infobox does not carry FP cost, slot count or the casting
// requirements, but the wiki DB's typed `spells` table does. `entityIndexBuild`
// cannot read SQLite itself (it is imported by the browser bundle), so this
// script bakes the table into a small committed JSON the builder imports.
//
// Regenerate with `node scripts/export-wiki-db-tables.mjs`; it needs the
// gitignored `data/raw/er-mcp.db` (see data/raw/README.md).
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const root = process.cwd()
const dbPath = path.join(root, 'data/raw/er-mcp.db')
const outPath = path.join(root, 'public/sourced/open/wiki-db/spell-table.json')

if (!fs.existsSync(dbPath)) {
  console.error(`DB not found: ${dbPath} (see data/raw/README.md)`)
  process.exit(1)
}

const db = new DatabaseSync(dbPath, { readOnly: true })
const rows = db
  .prepare(
    'select name, spell_type, sub_type, fp_cost, stamina_cost, slots_used, int_req, fai_req, arc_req, effect from spells order by name',
  )
  .all()
const sync = db.prepare('select last_run from sync_state limit 1').get()
db.close()

const doc = {
  source: 'fandom-wiki-db:spells',
  syncedAt: sync?.last_run ?? null,
  table: 'spells',
  count: rows.length,
  records: rows,
}
fs.writeFileSync(outPath, JSON.stringify(doc, null, 0))
console.log(`wrote ${outPath} (${rows.length} spells)`)
