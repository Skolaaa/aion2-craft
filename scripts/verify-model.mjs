import { readFile, readdir } from 'node:fs/promises'
import { buildCatalog } from '../src/domain/catalog.ts'
import { planCraft } from '../src/domain/planCraft.ts'
import { makePriceBook } from '../src/domain/priceBook.ts'
import { cachedJson, exists, fetchJson, get, writeAtomic } from './cache.mjs'

const SERVER = 11304
const API = 'https://aion2.exchange/api'
const TOLERANCE = 0.005
const GW_TOLERANCE_PP = 0.1
const MASTERY = { Blacksmithing: 100, Tailoring: 100, Jewelcrafting: 100, Alchemy: 100, Cooking: 100 }
const BUY_ONLY = { allowCraft: false, allowMorph: false, byproductCredit: false, taxRate: 0 }

const recipesFile = JSON.parse(await readFile('src/data/recipes.json', 'utf8'))
const ratesFile = JSON.parse(await readFile('src/data/rates.json', 'utf8'))
const failures = []
const off = (ours, theirs) => Math.abs(ours - theirs) / theirs
const pct = (x) => `${(x * 100).toFixed(3)}%`

function stepsOf(step, into = new Map()) {
  into.set(step.recipeId, step)
  for (const m of step.materials) if (m.acquisition.step) stepsOf(m.acquisition.step, into)
  return into
}

const { race, targets } = await fetchJson(`${API}/crafts?server=${SERVER}`)
const world = buildCatalog(race, recipesFile, ratesFile)
console.log(`aion2.exchange crafts on server ${SERVER} (${race}), mastery 100, buying every material at their unit price\n`)
console.log('target     their cost     our cost      off      attempts per step (ours / theirs)')
for (const { target_key: target } of targets) {
  const oracle = await fetchJson(`${API}/crafts/${target}?server=${SERVER}`)
  const market = new Map(oracle.steps.flatMap((s) => s.materials.map((m) => [
    m.material_key,
    { lowest: m.unit_price, listings: 1, soldAvg: null, capturedAt: oracle.latest.captured_at },
  ])))
  const prices = makePriceBook({ manual: new Map(), market, npc: new Map() })
  const plan = planCraft({ target: { itemId: target, quantity: 1 }, mastery: MASTERY, options: BUY_ONLY, world, prices })
  const ours = stepsOf(plan.root)
  const attempts = oracle.steps.map((s) => [ours.get(s.recipe_id)?.attempts ?? NaN, s.attempts])
  const costOff = off(plan.cost, oracle.latest.cost)
  const bad = !(costOff <= TOLERANCE) || attempts.some(([a, b]) => !(off(a, b) <= TOLERANCE))
  if (bad) failures.push(`${target} ${oracle.name}`)
  console.log([
    String(target).padEnd(10),
    oracle.latest.cost.toFixed(0).padStart(12),
    plan.cost.toFixed(0).padStart(12),
    pct(costOff).padStart(8),
    '   ' + attempts.map(([a, b]) => `${a.toFixed(4)} / ${b.toFixed(4)}`).join(', '),
    bad ? '  MISMATCH' : '',
  ].join(' '))
}

const parseGamewith = (html) => {
  const success = []
  for (const [, table] of html.matchAll(/<table class="dbs-rate-table">(.*?)<\/table>/gs)) {
    if (table.includes('<th>0</th>') && success.length > 0) break
    const row = table.match(/<tr><td>Success<\/td>(.*?)<\/tr>/s)[1]
    success.push(...[...row.matchAll(/<td>([^<]*)<\/td>/g)].map((m) => Number.parseFloat(m[1])))
  }
  return success
}

const GW_REFERENCE = 110160023
if (!(await exists(`.cache/gw/${GW_REFERENCE}.html`))) {
  const res = await get(`https://gamewith.ai/aion2/en/items/${GW_REFERENCE}`, 'text/html')
  if (!res.ok) throw new Error(`gamewith ${GW_REFERENCE}: HTTP ${res.status}`)
  await writeAtomic(`.cache/gw/${GW_REFERENCE}.html`, await res.text())
}
const pages = (await readdir('.cache/gw')).filter((f) => /^\d+\.html$/.test(f)).map((f) => Number(f.slice(0, -5)))
let compared = 0
let worst = 0
for (const recipe of recipesFile.recipes) {
  const codes = ratesFile.recipes[recipe.id]
  if (!codes || !pages.includes(recipe.product.itemId)) continue
  const table = parseGamewith(await readFile(`.cache/gw/${recipe.product.itemId}.html`, 'utf8'))
  const curve = ratesFile.curves[codes.success]
  const n = Math.min(table.length, curve.length)
  const diff = Math.max(...table.slice(0, n).map((v, i) => Math.abs(v - curve[i] * 100)))
  worst = Math.max(worst, diff)
  compared++
  if (diff > GW_TOLERANCE_PP) failures.push(`gamewith ${recipe.product.itemId} vs recipe ${recipe.id} off by ${diff.toFixed(3)} pp`)
}
if (!pages.includes(GW_REFERENCE) || compared === 0) failures.push('gamewith reference page was not compared')
console.log(`\ngamewith.ai success tables vs metabot curves: ${compared} recipes, largest gap ${worst.toFixed(4)} pp (limit ${GW_TOLERANCE_PP})`)

const model = await cachedJson('.cache/exchange/ex_crafts_model.json', `${API}/crafts/model?server=${SERVER}`)
const ingot = model.routes.find((r) => r.material_key === 610710001).options.find((o) => o.method === 'craft')
const ingotRecipe = recipesFile.recipes.find((r) => r.id === ingot.recipe_id)
const ore = ingotRecipe.ingredients.find((i) => i.itemId === ingot.leaves[0].item_key)
const theirRate = ore.count / ingot.leaves[0].per_unit
const curve = ratesFile.curves[ratesFile.recipes[ingotRecipe.id].success]
const ourRate = curve[Math.min(100 - ingotRecipe.masteryLevel, curve.length - 1)]
if (off(ourRate, theirRate) > TOLERANCE) failures.push(`ingot rate ${ourRate} vs ${theirRate}`)
console.log(`Orichalcum Ingot success at mastery 100: ours ${ourRate}, aion2.exchange ${theirRate.toFixed(6)}`)

if (failures.length > 0) {
  console.error(`\n${failures.length} mismatch(es):\n${failures.join('\n')}`)
  process.exit(1)
}
console.log('\nall within tolerance')
