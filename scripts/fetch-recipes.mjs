import { cachedJson, writeJson } from './cache.mjs'

const A2T = 'https://aion2t.com/api/en/crafting/recipes'
const MODEL_URL = 'https://aion2.exchange/api/crafts/model?server=11304'
const SECTIONS = ['craft', 'succession', 'conversion']
const PROFESSIONS = new Set(['Blacksmithing', 'Tailoring', 'Jewelcrafting', 'Alchemy', 'Cooking'])
const RACES = new Set(['Light', 'Dark'])
const KINA_ITEMS = [930100030, 930100031]

const EQUIPMENT_TABS = new Set([
  'Sword', 'Greatsword', 'Dagger', 'Mace', 'Guarder', 'Bow', 'Staff', 'Necklace', 'Earring', 'Ring',
  'Bracelet', 'Magicbook', 'Orb', 'Torso', 'Pants', 'Helmet', 'Shoulder', 'Gloves', 'Boots', 'Cape',
])
const TAB_FAMILY = {
  Misc_Blacksmithing: 'material',
  Misc_Jewelcrafting: 'material',
  Misc_Tailoring: 'material',
  Misc_Alchemy: 'material',
  Potion: 'consumable',
  Scroll: 'consumable',
  MagicStone: 'consumable',
  Food: 'consumable',
}
const EQUIPMENT_FAMILY = [
  [/Dragon Lord/, 'dragonlord'],
  [/^Artisan's/, 'artisan'],
  [/^Expert's/, 'expert'],
  [/./, 'basic'],
]

function familyOf(detail) {
  if (EQUIPMENT_TABS.has(detail.tab)) return EQUIPMENT_FAMILY.find(([re]) => re.test(detail.name))[1]
  const family = TAB_FAMILY[detail.tab]
  if (!family) throw new Error(`recipe ${detail.id}: no rate family for tab ${detail.tab}`)
  return family
}

function rateOf(detail) {
  if (detail.section === 'conversion') return { kind: 'fixed', success: detail.success_prob / 100 }
  if (detail.section === 'succession') return { kind: 'fixed', success: 1 }
  return { kind: 'curve', family: familyOf(detail) }
}

function normalise(detail, listed) {
  if (!RACES.has(detail.race)) throw new Error(`recipe ${detail.id}: race ${detail.race}`)
  if (detail.section !== 'conversion' && !PROFESSIONS.has(detail.category)) {
    throw new Error(`recipe ${detail.id}: profession ${detail.category}`)
  }
  // The detail route reports percent (25, 100), the list route basis points (2500, 10000).
  if ((detail.combo_probability ?? 0) * 100 !== listed.combo_probability ||
      (detail.success_prob ?? 0) * 100 !== (listed.success_prob ?? 0)) {
    throw new Error(`recipe ${detail.id}: list and detail disagree on rates`)
  }
  const combo = detail.combo_product && detail.combo_probability > 0
    ? { itemId: detail.combo_product.item_id, count: detail.combo_product.count, chance: detail.combo_probability / 100 }
    : null
  return {
    id: detail.id,
    section: detail.section,
    name: detail.name,
    profession: detail.category,
    race: detail.race,
    masteryLevel: detail.mastery_level ?? 0,
    product: { itemId: detail.product_item_id, count: detail.product_count },
    combo,
    rate: rateOf(detail),
    ingredients: detail.ingredients.map((ing) => ({ itemId: ing.item_id, count: ing.count })),
  }
}

function collectItems(details) {
  const items = new Map()
  const add = (id, name, grade, icon) => {
    if (!items.has(id)) items.set(id, { name, grade, icon: icon ?? null })
  }
  for (const d of details) {
    add(d.product_item_id, d.name, d.product_grade, d.product_icon_url)
    if (d.combo_product) {
      const c = d.combo_product
      add(c.item_id, c.name_en, c.grade, c.icon ? `/db-item-icons/${c.icon}` : null)
    }
    for (const ing of d.ingredients) add(ing.item_id, ing.name_en, ing.grade, ing.icon_url)
  }
  return items
}

// A morph makes the Bound variant of a material, which recipes accept in place of the
// unbound one (the game's CraftComponentReplacement table). aion2t does not publish that
// table, so pair them by name: `<X> (Bound)` stands in for `<X>`.
function deriveSubstitutes(details, items) {
  const byName = new Map([...items].map(([id, item]) => [item.name, id]))
  const substitutes = {}
  for (const d of details) {
    if (d.section !== 'conversion' || !d.name.endsWith(' (Bound)')) continue
    const unbound = byName.get(d.name.slice(0, -' (Bound)'.length))
    if (unbound !== undefined) substitutes[unbound] = d.product_item_id
  }
  return substitutes
}

function checkAgainstModel(model, substitutes, detailsById) {
  for (const route of model.routes) {
    for (const option of route.options) {
      if (option.method !== 'morph') continue
      const recipe = detailsById.get(option.recipe_id)
      if (substitutes[route.material_key] !== recipe?.product_item_id) {
        throw new Error(`morph route ${route.material_key} via ${option.recipe_id} is not covered by the substitutes`)
      }
    }
  }
}

function npcPrices(model) {
  const prices = Object.fromEntries(KINA_ITEMS.map((id) => [id, 1]))
  for (const route of model.routes) {
    for (const option of route.options) {
      for (const leaf of option.leaves) if (leaf.fixed_price !== null) prices[leaf.item_key] = leaf.fixed_price
    }
  }
  return prices
}

const listed = new Map()
for (const section of SECTIONS) {
  const list = await cachedJson(`.cache/a2t/list_${section}.json`, `${A2T}?section=${section}&limit=500`)
  if (list.recipes.length !== list.total) throw new Error(`${section}: ${list.recipes.length} of ${list.total} recipes listed`)
  for (const r of list.recipes) listed.set(r.id, r)
}

const details = []
for (const id of [...listed.keys()].sort((a, b) => a - b)) {
  const { recipe } = await cachedJson(`.cache/a2t/recipes/${id}.json`, `${A2T}/${id}`)
  details.push(recipe)
}

const model = await cachedJson('.cache/exchange/ex_crafts_model.json', MODEL_URL)
const items = collectItems(details)
const substitutes = deriveSubstitutes(details, items)
checkAgainstModel(model, substitutes, new Map(details.map((d) => [d.id, d])))

await writeJson('src/data/recipes.json', {
  items: Object.fromEntries([...items].sort(([a], [b]) => a - b)),
  recipes: details.map((d) => normalise(d, listed.get(d.id))),
  substitutes,
  npcPrices: npcPrices(model),
})
console.log(`recipes.json: ${details.length} recipes, ${items.size} items, ${Object.keys(substitutes).length} substitutes`)
