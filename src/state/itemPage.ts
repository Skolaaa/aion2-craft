import type { ItemId } from '../domain/types.ts'

/** The AION2 Hub item page, which lists where an item is gathered, dropped, crafted or sold. */
export const itemPageUrl = (itemId: ItemId) => `https://aion2hub.com/database/items/${itemId}`
