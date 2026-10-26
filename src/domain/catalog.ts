import type { Catalog, Item, ItemId, Race, RateCurve, RateFamily, Recipe, RecipeId } from './types.ts'

export interface RecipesFile {
  items: Record<string, Omit<Item, 'id'>>
  recipes: Recipe[]
  substitutes: Record<string, ItemId>
  npcPrices: Record<string, number>
}

interface CurveCodes {
  success: string
  combo: string | null
}

export interface RatesFile {
  curves: Record<string, number[]>
  recipes: Record<string, CurveCodes>
  families: Record<RateFamily, CurveCodes>
}

function curveFrom(codes: CurveCodes, curves: RatesFile['curves']): RateCurve {
  const row = (code: string) => {
    const values = curves[code]
    if (!values) throw new Error(`rates.json has no curve ${code}`)
    return values
  }
  return { success: row(codes.success), combo: codes.combo === null ? null : row(codes.combo) }
}

const numericKeys = <T>(record: Record<string, T>): [number, T][] =>
  Object.entries(record).map(([key, value]) => [Number(key), value])

export function buildCatalog(race: Race, recipesFile: RecipesFile, ratesFile: RatesFile): Catalog {
  const recipes = recipesFile.recipes.filter((r) => r.race === race)
  const byProduct = new Map<ItemId, Recipe[]>()
  const yields = (itemId: ItemId, recipe: Recipe) => {
    const list = byProduct.get(itemId) ?? []
    if (!list.includes(recipe)) byProduct.set(itemId, [...list, recipe])
  }
  for (const r of recipes) {
    yields(r.product.itemId, r)
    if (r.combo) yields(r.combo.itemId, r)
  }

  const curves = new Map<RecipeId, RateCurve>()
  for (const r of recipes) {
    if (r.rate.kind !== 'curve') continue
    if (r.profession === null) throw new Error(`recipe ${r.id} follows a curve but has no profession`)
    const codes = ratesFile.recipes[r.id]
    if (codes) curves.set(r.id, curveFrom(codes, ratesFile.curves))
    const combo = codes ? codes.combo : ratesFile.families[r.rate.family].combo
    if (r.combo && combo === null) throw new Error(`recipe ${r.id} has a combo but no combo curve`)
  }

  const families = Object.fromEntries(
    Object.entries(ratesFile.families).map(([family, codes]) => [family, curveFrom(codes, ratesFile.curves)]),
  ) as Record<RateFamily, RateCurve>

  const boundOf = new Map(numericKeys(recipesFile.substitutes).filter(([, bound]) => byProduct.has(bound)))

  return {
    race,
    items: new Map(numericKeys(recipesFile.items).map(([id, item]) => [id, { id, ...item }])),
    recipes: new Map(recipes.map((r) => [r.id, r])),
    byProduct,
    boundOf,
    curves,
    families,
    npcPrices: new Map(numericKeys(recipesFile.npcPrices)),
  }
}

export function tradeableItems(catalog: Catalog): ItemId[] {
  const ids = new Set<ItemId>()
  for (const r of catalog.recipes.values()) {
    ids.add(r.product.itemId)
    if (r.combo) ids.add(r.combo.itemId)
    for (const ing of r.ingredients) ids.add(ing.itemId)
  }
  return [...ids]
    .filter((id) => !catalog.npcPrices.has(id) && !catalog.items.get(id)?.name.endsWith('(Bound)'))
    .sort((a, b) => a - b)
}
