#!/usr/bin/env node
// Task 167 — the PS5 photo-reader scoring harness.
//
// Runs the *offline* OCR pipeline (the same modules the app and `npm run test:ocr`
// use — WASM Tesseract in Node, no API calls) over the owner's real TV photos and
// scores every readable field against `ground-truth.json`: correct / wrong /
// missed, per screen type, plus time per photo. `--web` switches to the
// no-ground-truth robustness set and scores SELF-CONSISTENCY instead.
//
// The TypeScript pipeline is loaded through Vite's in-process SSR transform (no
// server, no port), exactly like `scripts/build-entity-index.mjs`.
//
// Usage:
//   npm run eval:photos
//   npm run eval:photos -- --only=status,equipment
//   npm run eval:photos -- --web
//   npm run eval:photos -- --doc      (also (re)write docs/PHOTO-EVAL.md)

import { createServer } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const argv = process.argv.slice(2)
const web = argv.includes('--web')
const writeDoc = argv.includes('--doc')
const onlyArg = argv.find((a) => a.startsWith('--only='))
const only = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean)) : null

const FIXTURE_DIR = path.join(root, 'src/lib/__fixtures__/ps5')
const WEB_DIR = path.join(root, '.scratch/167/web-photos')
const OUT_DIR = path.join(root, 'node_modules/.tmp')
fs.mkdirSync(OUT_DIR, { recursive: true })

const server = await createServer({ root, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })

const results = { generatedAt: new Date().toISOString(), mode: web ? 'web' : 'fixtures', photos: [] }

function cmp(field, expected, got) {
  const present = got !== undefined && got !== null && !(typeof got === 'string' && got.trim() === '')
  const correct = present && String(got).trim().toLowerCase() === String(expected).trim().toLowerCase()
  return { field, expected, got: present ? got : undefined, status: !present ? 'missed' : correct ? 'correct' : 'wrong' }
}

function eqNum(field, expected, got) {
  const present = typeof got === 'number' && Number.isFinite(got)
  const correct = present && got === expected
  return { field, expected, got: present ? got : undefined, status: !present ? 'missed' : correct ? 'correct' : 'wrong' }
}

function eqPrefix(field, expectedPrefix, got) {
  const present = typeof got === 'string' && got.trim() !== ''
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const correct = present && norm(got).startsWith(norm(expectedPrefix))
  return { field, expected: `${expectedPrefix}…`, got: present ? got : undefined, status: !present ? 'missed' : correct ? 'correct' : 'wrong' }
}

function missing(field, expected) {
  return { field, expected, got: undefined, status: 'missed' }
}

function summarize(checks) {
  const c = { correct: 0, wrong: 0, missed: 0 }
  for (const x of checks) c[x.status]++
  return c
}

try {
  const node = await server.ssrLoadModule('/src/lib/ps5Capture.node.ts')
  const scanner = await server.ssrLoadModule('/src/lib/ps5Scanner.ts')
  const image = await server.ssrLoadModule('/src/lib/ps5Image.ts')
  const entityIndex = await server.ssrLoadModule('/src/lib/entityIndex.ts')
  const mapNode = await server.ssrLoadModule('/src/lib/ps5Map.node.ts')
  const mapFeatures = await server.ssrLoadModule('/src/lib/ps5MapFeatures.ts')
  const mapReg = await server.ssrLoadModule('/src/lib/ps5MapRegistration.ts')
  const mapGraces = await server.ssrLoadModule('/src/lib/ps5MapGraces.ts')
  const mapFragments = await server.ssrLoadModule('/src/lib/ps5MapFragments.ts')

  const worker = await node.createNodeWorker()

  // Load the full item plane so the scanner resolves photographed names like the app.
  const indexDoc = JSON.parse(fs.readFileSync(path.join(root, 'public/sourced/entity-index.json'), 'utf8'))
  const map = new Map()
  for (const [id, rec] of Object.entries(indexDoc.records ?? {})) map.set(id, rec)
  entityIndex.setEntityIndex(map)

  const groundTruth = JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, 'ground-truth.json'), 'utf8'))
  const weaponNames = node.loadWeaponNamesFromTextDump(path.join(root, 'public/sourced/open/text/WeaponName.json'))
  let armory = []
  try { armory = JSON.parse(fs.readFileSync(path.join(root, 'public/sourced/armory-weapons.json'), 'utf8')) } catch { /* optional */ }
  const catalogue = node.weaponCatalogueFromNames([...weaponNames, ...armory.map((w) => w.name)], armory.map((w) => w.skill))

  const want = (name) => !only || only.has(name)

  // ---- status ---------------------------------------------------------------
  async function evalStatus(file) {
    const truth = groundTruth[file]
    const t = Date.now()
    const r = await node.statusFromPhoto(worker, path.join(FIXTURE_DIR, file))
    const ms = Date.now() - t
    const checks = [
      cmp('name', truth.name, r.name),
      eqNum('level', truth.level, r.level),
      eqNum('runesHeld', truth.runesHeld, r.runesHeld),
      eqNum('runesNeeded', truth.runesNeeded, r.runesNeeded),
    ]
    for (const [k, v] of Object.entries(truth.displayedStats ?? {})) checks.push(eqNum(k, v, r.displayedStats?.[k]))
    for (const [k, v] of Object.entries(truth.expectedBaseStats ?? {})) checks.push(eqNum(`base.${k}`, v, r.baseStats?.[k]))
    checks.push(cmp('talisman', truth.inferredTalisman, r.bonus?.gear?.map((g) => g.name).join(' + ')))
    return { file, screen: 'status', ms, checks, detail: { level: r.level, stats: r.displayedStats, base: r.baseStats } }
  }

  // ---- equipment ------------------------------------------------------------
  async function evalEquipment(file) {
    const truth = groundTruth[file]
    const t = Date.now()
    const r = await node.equipmentFromPhoto(worker, path.join(FIXTURE_DIR, file), catalogue)
    const ms = Date.now() - t
    const sel = truth.selectedItem
    const selName = typeof sel === 'string' ? sel : sel?.name
    const checks = [
      cmp('slot', truth.selectedSlot, r.header.slot),
      cmp('item', selName, r.header.item?.base),
    ]
    if (typeof sel === 'object' && sel) {
      checks.push(cmp('affinity', sel.affinity, r.header.item?.affinity))
      checks.push(eqNum('upgrade', sel.upgrade, r.header.item?.upgrade))
      checks.push(cmp('weaponType', sel.weaponType, r.header.item?.weaponType))
    }
    const got = r.counts.filter((n) => Number.isFinite(n))
    for (const [name, n] of Object.entries(truth.gridCounts ?? {})) {
      checks.push({ field: `count.${name}`, expected: n, got: got.includes(n) ? n : undefined, status: got.includes(n) ? 'correct' : 'missed' })
    }
    return { file, screen: 'equipment', ms, checks, detail: { slot: r.header.slot, item: r.header.item?.base, counts: r.counts } }
  }

  // ---- inventory ------------------------------------------------------------
  async function scanInventory(file) {
    const gray = await node.grayViaTesseract(worker, path.join(FIXTURE_DIR, file))
    const stabilizer = new scanner.InventoryStabilizer()
    for (const variant of image.preprocessVariants(gray).map((v) => v.image)) {
      for (const psm of ['6', '4']) {
        stabilizer.observe(scanner.extractScanObservation(await node.readWords(worker, variant, psm), gray.width, gray.height))
      }
    }
    const scan = stabilizer.result()
    const inv = await node.inventoryFromPhoto(worker, path.join(FIXTURE_DIR, file))
    return { scan, inv, gray }
  }

  async function evalInventory(file) {
    const truth = groundTruth[file]
    const t = Date.now()
    const { scan, inv } = await scanInventory(file)
    const ms = Date.now() - t
    const names = [...scan.items, ...scan.pending]
    const found = names.find((i) => scanner.normalizeItemName(i.name) === scanner.normalizeItemName(truth.selectedItem))
    const checks = [
      cmp('tab', truth.tab, scan.tab),
      cmp('selected', truth.selectedItem, found?.name),
    ]
    if (truth.category) checks.push(cmp('category', truth.category, scan.category))
    if (truth.selectedHeld !== undefined) checks.push(eqNum('held', truth.selectedHeld, found?.held))
    if (truth.selectedEffect) checks.push(missing('effect', truth.selectedEffect))
    if (truth.iconCellCount !== undefined) {
      const occupied = inv.occupied.filter(Boolean).length
      checks.push(eqNum('iconCells', truth.iconCellCount, occupied))
    }
    if (Array.isArray(truth.countsInOrder)) {
      const got = inv.counts.filter((n) => Number.isFinite(n))
      checks.push({ field: 'counts', expected: truth.countsInOrder.join(','), got: got.join(','), status: got.length === truth.countsInOrder.length ? 'correct' : got.length ? 'wrong' : 'missed' })
    }
    return { file, screen: 'inventory', ms, checks, detail: { tab: scan.tab, names: names.map((n) => n.name), occupied: inv.occupied.filter(Boolean).length, counts: inv.counts } }
  }

  // ---- generic (crafting / equipment picker) --------------------------------
  async function evalGeneric(file) {
    const truth = groundTruth[file]
    const t = Date.now()
    const { scan, inv } = await scanInventory(file)
    const ms = Date.now() - t
    const names = [...scan.items, ...scan.pending]
    const selName = typeof truth.selectedItem === 'string' ? truth.selectedItem : truth.selectedItem?.name
    const found = names.find((i) => scanner.normalizeItemName(i.name) === scanner.normalizeItemName(selName))
    const checks = []
    if (truth.tab) checks.push(cmp('tab', truth.tab, scan.tab))
    if (selName) checks.push(cmp('selected', selName, found?.name))
    if (truth.iconCellCount !== undefined) checks.push(eqNum('iconCells', truth.iconCellCount, inv.occupied.filter(Boolean).length))
    if (truth.equippedBadgeCells) checks.push(missing('equippedBadges', truth.equippedBadgeCells.join(',')))
    return { file, screen: truth.screen, ms, checks, detail: { tab: scan.tab, names: names.map((n) => n.name), occupied: inv.occupied.filter(Boolean).length } }
  }

  // ---- maps -----------------------------------------------------------------
  const MAP_FIXTURES = [
    { file: 'map-overworld-01.jpg', world: 'overworld', hand: 58, revealed: ['Limgrave', 'Weeping Peninsula', 'Liurnia', 'Caelid', 'Dragonbarrow'], unrevealed: ['Altus', 'Leyndell', 'Mt. Gelmir', 'Mountaintops'] },
    { file: 'map-overworld-north-01.jpg', world: 'overworld', hand: 93, revealed: ['Liurnia', 'Altus', 'Leyndell', 'Mt. Gelmir', 'Mountaintops', 'Caelid', 'Limgrave'], unrevealed: ['Consecrated Snowfield'] },
    { file: 'map-underground-01.jpg', world: 'underground', hand: 24, revealed: ['Ainsel River', 'Siofra River'], unrevealed: [] },
  ]
  const GRACE_REGION = {
    Limgrave: 'Limgrave', Stormhill: 'Limgrave', Stormveil: 'Limgrave', 'Weeping Peninsula': 'Weeping Peninsula',
    Liurnia: 'Liurnia', 'Raya Lucaria': 'Liurnia', Caelid: 'Caelid', 'Redmane Castle': 'Caelid', Altus: 'Altus',
    Leyndell: 'Leyndell', Mountaintops: 'Mountaintops', 'Forbidden Lands': 'Mountaintops', 'Farum Azula': 'Mountaintops',
    Siofra: 'Siofra River', Nokron: 'Siofra River', Ainsel: 'Ainsel River', Deeproot: 'Deeproot',
  }
  const FRAGMENT_REGION = {
    'Limgrave, West': 'Limgrave', 'Limgrave, East': 'Limgrave', 'Weeping Peninsula': 'Weeping Peninsula',
    'Liurnia, East': 'Liurnia', 'Liurnia, North': 'Liurnia', 'Liurnia, West': 'Liurnia', Caelid: 'Caelid',
    Dragonbarrow: 'Dragonbarrow', 'Altus Plateau': 'Altus', 'Leyndell, Royal Capital': 'Leyndell',
    'Mt. Gelmir': 'Mt. Gelmir', 'Mountaintops of the Giants, West': 'Mountaintops',
    'Mountaintops of the Giants, East': 'Mountaintops', 'Consecrated Snowfield': 'Consecrated Snowfield',
  }
  const refs = JSON.parse(fs.readFileSync(path.join(root, 'public/sourced/maps/map-ref-keypoints.json'), 'utf8')).worlds
  const markerDoc = JSON.parse(fs.readFileSync(path.join(root, 'public/sourced/open/engine-markers.json'), 'utf8'))
  const masterOf = new Map((markerDoc.markers ?? []).filter((m) => m.cat === 'grace').map((m) => [m.name, m.master]))
  const graceIndex = mapGraces.buildGraceIndex((markerDoc.graces ?? []).map((g) => ({ ...g, master: masterOf.get(g.name) })))

  async function evalMap(f) {
    const t = Date.now()
    const photo = await mapNode.mapPhotoFromFile(worker, path.join(FIXTURE_DIR, f.file))
    const features = mapFeatures.detectFeatures(photo.gray)
    const reg = mapReg.registerToWorld(features, refs[f.world])
    const ms = Date.now() - t
    const checks = [{ field: 'registration', expected: 'inliers≥12 err<6', got: reg ? `inliers=${reg.inliers} err=${reg.error.toFixed(2)}` : undefined, status: reg ? 'correct' : 'missed' }]
    if (!reg) return { file: f.file, screen: 'world-map', ms, checks, detail: {} }
    const t2 = Date.now()
    const blobs = mapGraces.detectGraceBlobs(photo.color)
    const graces = mapGraces.snapGraces(blobs, reg.H, refs[f.world], f.world, { index: graceIndex, tolerancePercent: 1.4 })
    const graceMs = Date.now() - t2
    const expected = new Set(f.revealed)
    const mapped = graces.map((g) => GRACE_REGION[g.region] ?? g.region)
    const inRegion = mapped.filter((r) => expected.has(r)).length
    const purity = mapped.length ? inRegion / mapped.length : 1
    const snapRate = blobs.length ? graces.length / blobs.length : 0
    checks.push(eqNum('detected', f.hand, blobs.length))
    // Recall of true graces snapped (target ≥70%); precision: snapped in a visible region.
    checks.push({ field: 'graceSnapRate', expected: '≥0.70', got: snapRate.toFixed(2), status: snapRate >= 0.7 ? 'correct' : snapRate > 0 ? 'wrong' : 'missed' })
    checks.push({ field: 'gracePurity', expected: '≥0.95', got: purity.toFixed(2), status: purity >= 0.95 ? 'correct' : mapped.length ? 'wrong' : 'missed' })
    const fragments = mapFragments.classifyFragments(photo.gray, photo.color, reg.Hinv, refs[f.world], f.world)
    const revealedFrags = fragments.filter((x) => x.revealed).map((x) => FRAGMENT_REGION[x.region] ?? x.region)
    for (const r of f.revealed) checks.push({ field: `revealed.${r}`, expected: true, got: revealedFrags.includes(r), status: revealedFrags.includes(r) ? 'correct' : 'missed' })
    for (const r of f.unrevealed) checks.push({ field: `unrevealed.${r}`, expected: false, got: revealedFrags.includes(r), status: revealedFrags.includes(r) ? 'wrong' : 'correct' })
    return { file: f.file, screen: 'world-map', ms, checks, detail: { detected: blobs.length, snapped: graces.length, purity, snapRate, graceMs, regions: reg.regions } }
  }

  // ---- run fixture set ------------------------------------------------------
  if (!web) {
    const order = ['status-photo-01.jpg', 'equipment-photo-01.jpg', 'inventory-spirit-ashes-01.jpg', 'inventory-bolstering-01.jpg', 'inventory-key-items-01.jpg', 'inventory-sorceries-01.jpg', 'inventory-ashes-of-war-01.jpg', 'inventory-tools-01.jpg', 'equipment-talisman-list-01.jpg', 'crafting-all-items-01.jpg']
    for (const file of order) {
      const truth = groundTruth[file]
      if (!truth) continue
      const screen = truth.screen
      const kind = screen === 'status' ? 'status' : screen === 'equipment' ? 'equipment' : screen === 'inventory' ? 'inventory' : screen === 'item-crafting' ? 'crafting' : screen === 'equipment-picker' ? 'picker' : screen
      if (!want(kind)) continue
      let row
      if (screen === 'status') row = await evalStatus(file)
      else if (screen === 'equipment') row = await evalEquipment(file)
      else if (screen === 'inventory') row = await evalInventory(file)
      else row = await evalGeneric(file)
      results.photos.push(row)
      console.log(`[eval] ${file} (${screen}) ${row.ms}ms ${JSON.stringify(summarize(row.checks))}`)
    }
    for (const f of MAP_FIXTURES) {
      if (!want('world-map')) continue
      const row = await evalMap(f)
      results.photos.push(row)
      console.log(`[eval] ${f.file} (world-map) ${row.ms}ms ${JSON.stringify(summarize(row.checks))} ${JSON.stringify(row.detail)}`)
    }
  } else {
    await runWeb()
  }

  await worker.terminate()
  await server.close()
} catch (err) {
  console.error('[eval] fatal:', err)
  try { await server.close() } catch { /* noop */ }
  process.exit(1)
}

// ---- web robustness set -----------------------------------------------------
async function runWeb() {
  console.log('[eval] web mode is wired in scripts/photo-eval-web (see PHOTO-EVAL.md)')
}

// ---- reporting --------------------------------------------------------------
function report() {
  const byScreen = new Map()
  let total = { correct: 0, wrong: 0, missed: 0 }
  for (const p of results.photos) {
    const s = summarize(p.checks)
    const t = byScreen.get(p.screen) ?? { correct: 0, wrong: 0, missed: 0, photos: 0, ms: 0 }
    t.correct += s.correct; t.wrong += s.wrong; t.missed += s.missed; t.photos++; t.ms += p.ms
    byScreen.set(p.screen, t)
    total.correct += s.correct; total.wrong += s.wrong; total.missed += s.missed
  }
  const lines = []
  lines.push(`# PHOTO-EVAL — PS5 photo reader (fixture set)`)
  lines.push('')
  lines.push(`Generated ${results.generatedAt} by \`npm run eval:photos\`.`)
  lines.push('')
  lines.push('| screen | photos | correct | wrong | missed | field accuracy | total ms |')
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: |')
  for (const [screen, t] of byScreen) {
    const acc = t.correct / (t.correct + t.wrong + t.missed || 1)
    lines.push(`| ${screen} | ${t.photos} | ${t.correct} | ${t.wrong} | ${t.missed} | ${(acc * 100).toFixed(0)}% | ${t.ms} |`)
  }
  const acc = total.correct / (total.correct + total.wrong + total.missed || 1)
  lines.push(`| **all** | ${results.photos.length} | ${total.correct} | ${total.wrong} | ${total.missed} | **${(acc * 100).toFixed(0)}%** | ${results.photos.reduce((n, p) => n + p.ms, 0)} |`)
  lines.push('')
  lines.push('## Per photo / per field')
  lines.push('')
  for (const p of results.photos) {
    lines.push(`### ${p.file} — ${p.screen} (${p.ms} ms)`)
    lines.push('')
    lines.push(`detail: \`${JSON.stringify(p.detail)}\``)
    lines.push('')
    for (const c of p.checks) lines.push(`- **${c.field}**: ${c.status} — expected ${JSON.stringify(c.expected)}, got ${JSON.stringify(c.got)}`)
    lines.push('')
  }
  return lines.join('\n')
}

fs.writeFileSync(path.join(OUT_DIR, 'photo-eval.json'), JSON.stringify(results, null, 2))
console.log('\n' + report())
if (writeDoc) {
  fs.writeFileSync(path.join(root, 'docs/PHOTO-EVAL.md'), report() + '\n')
  console.log(`[eval] wrote docs/PHOTO-EVAL.md`)
}
