import { readFile } from 'node:fs/promises'
import { exists, get, writeAtomic, writeJson } from './cache.mjs'

const PAGE = 'https://metabot.gg/en/aion-2/crafting'
const RECIPES = '.cache/metabot/recipes.json'
const CURVES = '.cache/metabot/curves.json'
const FAMILY_RECIPES = {
  basic: 111026001,
  expert: 111025001,
  artisan: 111024001,
  dragonlord: 111023001,
  consumable: 314016001,
  material: 115016001,
}

// The value that follows `"key":` in the text, cut at its matching bracket.
function embedded(text, key) {
  const start = text.indexOf(`"${key}":`) + key.length + 3
  if (start < key.length + 3) throw new Error(`metabot page has no ${key}`)
  let depth = 0
  let inString = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (ch === '\\') i++
      else if (ch === '"') inString = false
    } else if (ch === '"') inString = true
    else if (ch === '[' || ch === '{') depth++
    else if ((ch === ']' || ch === '}') && --depth === 0) return JSON.parse(text.slice(start, i + 1))
  }
  throw new Error(`metabot ${key} is cut short`)
}

// metabot.gg ships the game client's craft tables inside its page's React Server Components payload.
async function cacheMetabot() {
  if ((await exists(RECIPES)) && (await exists(CURVES))) return
  const res = await get(PAGE, 'text/html')
  if (!res.ok) throw new Error(`${PAGE}: HTTP ${res.status}`)
  const html = await res.text()
  const payload = [...html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)]
    .map((m) => JSON.parse(m[1]))
    .join('')
  const recipes = embedded(payload, 'recipes')
  await writeAtomic(RECIPES, JSON.stringify(Object.fromEntries(recipes.map((r) => [r.id, r]))))
  await writeAtomic(CURVES, JSON.stringify(embedded(payload, 'curves')))
}

function checkAgreement(ours, theirs) {
  for (const r of ours) {
    if (r.section === 'conversion') continue
    const m = theirs[r.id]
    const same = m && m.product === r.product.itemId && m.qty === r.product.count &&
      m.mastery === r.masteryLevel && m.combo === Math.round((r.combo?.chance ?? 0) * 100)
    if (!same) throw new Error(`recipe ${r.id}: metabot and aion2t disagree`)
    if (r.rate.kind === 'fixed' && m.rate) throw new Error(`recipe ${r.id}: aion2t says guaranteed, metabot lists a curve`)
  }
}

await cacheMetabot()
const metabot = JSON.parse(await readFile(RECIPES, 'utf8'))
const percentCurves = JSON.parse(await readFile(CURVES, 'utf8'))
const { recipes } = JSON.parse(await readFile('src/data/recipes.json', 'utf8'))
checkAgreement(recipes, metabot)

const recipeRates = {}
for (const r of recipes) {
  const codes = metabot[r.id]?.rate
  if (r.rate.kind === 'curve' && codes) recipeRates[r.id] = { success: codes[0], combo: codes[1] }
}
const families = Object.fromEntries(Object.entries(FAMILY_RECIPES).map(([family, id]) => [family, recipeRates[id]]))
const used = new Set(Object.values(recipeRates).flatMap((c) => [c.success, c.combo]).filter(Boolean))
const curves = Object.fromEntries(
  [...used].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
    .map((code) => [code, percentCurves[code].map((pct) => Number((pct / 100).toFixed(6)))]),
)

await writeJson('src/data/rates.json', { curves, recipes: recipeRates, families })
const fallback = recipes.filter((r) => r.rate.kind === 'curve' && !recipeRates[r.id]).length
console.log(`rates.json: ${used.size} curves, ${Object.keys(recipeRates).length} recipes with their own curve, ${fallback} on a family curve`)
