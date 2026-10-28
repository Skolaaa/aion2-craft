import { buildCatalog, type RatesFile, type RecipesFile } from '../domain/catalog.ts'
import type { Catalog, Race } from '../domain/types.ts'
import craftExp from './craftExp.json'
import rates from './rates.json'
import recipes from './recipes.json'

const catalogs = new Map<Race, Catalog>()

export function catalogFor(race: Race): Catalog {
  const known = catalogs.get(race)
  if (known) return known
  const catalog = buildCatalog(race, recipes as unknown as RecipesFile, rates as unknown as RatesFile, craftExp.recipes)
  catalogs.set(race, catalog)
  return catalog
}
