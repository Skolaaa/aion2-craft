import type { Catalog, Grade, Item, ItemId, Race, RateCurve, RateFamily, Recipe, RecipeId } from './types.ts'

export interface RecipesFile {
  items: Record<string, Omit<Item, 'id' | 'grade'> & { grade: string }>
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

const GRADES: Readonly<Record<Grade, true>> = { Common: true, Rare: true, Legend: true, Unique: true, Epic: true, Mythic: true, Special: true }

export const parseGrade = (grade: string): Grade => (Object.prototype.hasOwnProperty.call(GRADES, grade) ? (grade as Grade) : 'Common')

const numericKeys = <T>(record: Record<string, T>): [number, T][] =>
  Object.entries(record).map(([key, value]) => [Number(key), value])

export function buildCatalog(race: Race, recipesFile: RecipesFile, ratesFile: RatesFile, craftExp: Readonly<Record<string, number>> = {}): Catalog {
  const recipes = recipesFile.recipes.filter((r) => r.race === race)
  const byId = new Map(recipes.map((r) => [r.id, r]))
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
    items: new Map(numericKeys(recipesFile.items).map(([id, item]) => [id, { id, ...item, grade: parseGrade(item.grade) }])),
    recipes: byId,
    byProduct,
    boundOf,
    curves,
    families,
    npcPrices: new Map(numericKeys(recipesFile.npcPrices)),
    craftExp: new Map(numericKeys(craftExp).filter(([id]) => byId.has(id))),
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
