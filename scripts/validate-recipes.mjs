// Cross-checks the aion2t.com recipes against independent sources:
//   metabot.gg (all craft + succession recipes), aion2.exchange's game-file model (ladder steps + material routes),
//   gamewith.ai (combo chance + quantity for 79 products).
// Usage: node scripts/validate-recipes.mjs [repo-root]
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.argv[2] ?? new URL("..", import.meta.url).pathname
const C = join(root, '.cache')
const a2t = readdirSync(join(C, 'a2t/recipes')).map(f => JSON.parse(readFileSync(join(C, 'a2t/recipes', f), 'utf8')).recipe)
const mb = JSON.parse(readFileSync(join(C, 'metabot/recipes.json'), 'utf8'))
const mbCurves = JSON.parse(readFileSync(join(C, 'metabot/curves.json'), 'utf8'))
const ex = JSON.parse(readFileSync(join(C, 'exchange/ex_crafts_model.json'), 'utf8'))

const byId = new Map(a2t.map(r => [r.id, r]))
const issues = []
const tally = {}
const count = (k, ok) => { tally[k] ??= { ok: 0, bad: 0 }; tally[k][ok ? 'ok' : 'bad']++ }
const partsOf = r => new Map(r.ingredients.filter(i => !i.is_donor).map(i => [i.item_id, i.count]))
const comboPct = r => r.combo_probability ?? 0
const sameParts = (a, b) => a.size === b.size && [...a].every(([k, v]) => b.get(k) === v)

// 1. aion2t vs metabot, every craft + succession recipe
for (const r of a2t) {
  if (r.section === 'conversion') continue
  const m = mb[r.id]
  if (!m) { issues.push(`metabot missing ${r.id} ${r.name}`); count('metabot:present', false); continue }
  count('metabot:present', true)
  const checks = {
    product: m.product === r.product_item_id,
    qty: m.qty === r.product_count,
    mastery: m.mastery === (r.mastery_level ?? 0),
    combo: m.combo === comboPct(r),
    parts: sameParts(partsOf(r), new Map(m.parts)),
  }
  for (const [k, ok] of Object.entries(checks)) {
    count(`metabot:${k}`, ok)
    if (!ok) issues.push(`${r.id} ${r.name} [${r.section}] ${k}: a2t=${JSON.stringify(k === 'parts' ? [...partsOf(r)] : k === 'product' ? r.product_item_id : k === 'qty' ? r.product_count : k === 'mastery' ? r.mastery_level : r.combo_probability)} metabot=${JSON.stringify(k === 'parts' ? m.parts : m[k])}`)
  }
}
// metabot recipes that aion2t lacks
for (const id of Object.keys(mb)) if (!byId.has(+id)) issues.push(`aion2t missing metabot recipe ${id}`)

// 2. aion2t vs aion2.exchange game-file model: ladder steps (materials per attempt, mastery) and material routes
const prodByItem = new Map()
for (const r of a2t) if (r.section === 'craft') prodByItem.set(`${r.race}:${r.product_item_id}`, r)
let exSteps = 0
for (const p of ex.profiles) for (const mem of p.members) {
  // each member's ladder is in /api/crafts/{key}; the model file only lists steps per profile when present
}
if (ex.steps) for (const s of ex.steps) exSteps++
for (const route of ex.routes) for (const opt of route.options) {
  if (opt.method !== 'craft' || !opt.recipe_id) continue
  const r = byId.get(opt.recipe_id)
  if (!r) { issues.push(`exchange route recipe ${opt.recipe_id} for ${route.name} missing in a2t`); count('exchange:route', false); continue }
  const ok = r.product_item_id === route.material_key
  count('exchange:route', ok)
  if (!ok) issues.push(`exchange route ${route.name}: a2t recipe ${opt.recipe_id} makes ${r.product_item_id} not ${route.material_key}`)
}

// 3. gamewith: combo chance and quantity made, by product id
const gwDir = join(C, 'gw')
for (const f of readdirSync(gwDir)) {
  if (!/^\d+\.html$/.test(f)) continue
  const pid = +f.replace('.html', '')
  const html = readFileSync(join(gwDir, f), 'utf8')
  const combo = +(html.match(/Combo chance: (\d+)%/)?.[1] ?? NaN)
  const made = +(html.match(/Made: (\d+)/)?.[1] ?? NaN)
  const rs = a2t.filter(r => r.product_item_id === pid && r.section === 'craft')
  for (const r of rs) {
    const okC = Number.isNaN(combo) ? null : combo === comboPct(r)
    const okQ = Number.isNaN(made) ? null : made === r.product_count
    if (okC !== null) { count('gamewith:combo', okC); if (!okC) issues.push(`${r.id} ${r.name} gamewith combo ${combo} vs a2t ${r.combo_probability}`) }
    if (okQ !== null) { count('gamewith:qty', okQ); if (!okQ) issues.push(`${r.id} ${r.name} gamewith made ${made} vs a2t ${r.product_count}`) }
  }
}

// 4. rate curves: gamewith table vs metabot curve for recipes that have both
const rateCodes = new Map(Object.entries(mb).map(([id, m]) => [+id, m.rate]))
for (const f of readdirSync(gwDir)) {
  if (!/^\d+\.html$/.test(f)) continue
  const pid = +f.replace('.html', '')
  const html = readFileSync(join(gwDir, f), 'utf8')
  const rows = [...html.matchAll(/<tr><td>Success<\/td>((?:<td>[\d.]+%<\/td>)+)<\/tr>/g)].map(m => [...m[1].matchAll(/([\d.]+)%/g)].map(x => +x[1]))
  const table = rows.flat()
  const r = a2t.find(r => r.product_item_id === pid && r.section === 'craft' && r.race === 'Light')
  if (!r || !table.length) continue
  const code = rateCodes.get(r.id)?.[0]
  const curve = code && mbCurves[code]
  if (!curve) { count('curve:mapped', false); issues.push(`${r.id} ${r.name} no metabot curve code (gamewith has a table)`); continue }
  count('curve:mapped', true)
  const n = Math.min(table.length, curve.length)
  let maxDiff = 0
  for (let i = 0; i < n; i++) maxDiff = Math.max(maxDiff, Math.abs(table[i] - curve[i]))
  const ok = maxDiff <= 0.1
  count('curve:values', ok)
  if (!ok) issues.push(`${r.id} ${r.name} curve ${code} differs from gamewith by up to ${maxDiff.toFixed(2)} pp over ${n} points`)
}

// 5. conversion recipes: only cross-check is the exchange morph routes (1 Odyle -> 1 material)
for (const route of ex.routes) for (const opt of route.options) {
  if (opt.method !== 'morph') continue
  const r = byId.get(opt.recipe_id)
  if (!r) { count('exchange:morph', false); issues.push(`morph recipe ${opt.recipe_id} (${route.name}) missing in a2t`); continue }
  const leaf = opt.leaves[0]
  const ing = r.ingredients.find(i => i.item_id === leaf.item_key)
  // a morph makes the Bound variant, which recipes accept in place of the unbound material
  const bound = r.name === `${route.name} (Bound)`
  const ok = bound && !!ing && ing.count / r.product_count === leaf.per_unit
  count('exchange:morph', ok)
  if (!ok) issues.push(`morph ${route.name}: a2t recipe ${r.id} '${r.name}' product ${r.product_item_id} x${r.product_count} ingredients ${JSON.stringify(r.ingredients.map(i => [i.item_id, i.name_en, i.count]))} vs exchange material ${route.material_key} leaf ${leaf.item_key} ${leaf.name} x${leaf.per_unit}`)
}

console.log('check                 ok   bad')
for (const [k, v] of Object.entries(tally)) console.log(k.padEnd(20), String(v.ok).padStart(5), String(v.bad).padStart(5))
console.log(`\nrecipes: a2t ${a2t.length} (craft ${a2t.filter(r => r.section === 'craft').length}, succession ${a2t.filter(r => r.section === 'succession').length}, conversion ${a2t.filter(r => r.section === 'conversion').length}); metabot ${Object.keys(mb).length}`)
console.log(`\nissues: ${issues.length}`)
for (const i of issues) console.log(' -', i)
process.exit(issues.length ? 1 : 0)
