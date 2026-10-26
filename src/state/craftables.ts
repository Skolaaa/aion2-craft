import type { Catalog, Item, ItemId, Profession, Recipe } from '../domain/types.ts'

export interface Craftable {
  item: Item
  profession: Profession | null
  level: number
  transfer: boolean
}

export interface Pair {
  normal: ItemId
  splendent: ItemId
}

export interface CraftIndex {
  craftables: Craftable[]
  byId: Map<ItemId, Craftable>
  byName: Map<string, Craftable[]>
  pairOf: Map<ItemId, Pair>
}

export const itemName = (catalog: Catalog, itemId: ItemId) => catalog.items.get(itemId)?.name ?? `item ${itemId}`

const indexes = new WeakMap<Catalog, CraftIndex>()

function build(catalog: Catalog): CraftIndex {
  const byId = new Map<ItemId, Craftable>()
  const pairOf = new Map<ItemId, Pair>()
  const note = (itemId: ItemId, recipe: Recipe) => {
    const item = catalog.items.get(itemId)
    if (!item) return
    const known = byId.get(itemId)
    const transfer = recipe.section === 'succession'
    if (!known) byId.set(itemId, { item, profession: recipe.profession, level: recipe.masteryLevel, transfer })
    else if (recipe.masteryLevel < known.level) byId.set(itemId, { item, profession: recipe.profession, level: recipe.masteryLevel, transfer: known.transfer && transfer })
    else if (!transfer) known.transfer = false
  }
  for (const recipe of catalog.recipes.values()) {
    if (recipe.section === 'conversion') continue
    note(recipe.product.itemId, recipe)
    const { combo } = recipe
    if (!combo || combo.itemId === recipe.product.itemId) continue
    note(combo.itemId, recipe)
    const pair = { normal: recipe.product.itemId, splendent: combo.itemId }
    if (!pairOf.has(pair.normal)) pairOf.set(pair.normal, pair)
    if (!pairOf.has(pair.splendent)) pairOf.set(pair.splendent, pair)
  }
  const craftables = [...byId.values()].sort((a, b) => a.item.name.localeCompare(b.item.name) || a.item.id - b.item.id)
  const byName = new Map<string, Craftable[]>()
  for (const craftable of craftables) byName.set(craftable.item.name, [...(byName.get(craftable.item.name) ?? []), craftable])
  return { craftables, byId, byName, pairOf }
}

export function craftIndexFor(catalog: Catalog): CraftIndex {
  const known = indexes.get(catalog)
  if (known) return known
  const index = build(catalog)
  indexes.set(catalog, index)
  return index
}

// Light and Dark recipes use different item ids for the same name, so a faction switch matches by name.
export function remapItem(from: Catalog, to: Catalog, itemId: ItemId): ItemId | null {
  const name = from.items.get(itemId)?.name
  if (name === undefined) return null
  const position = (craftIndexFor(from).byName.get(name) ?? []).findIndex((c) => c.item.id === itemId)
  const candidates = craftIndexFor(to).byName.get(name) ?? []
  return (candidates[Math.max(0, position)] ?? candidates[0])?.item.id ?? null
}
