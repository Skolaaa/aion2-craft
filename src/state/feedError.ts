// A quotes request URL carries a hundred item ids, so the query is cut before the message reaches a notice.
export const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error)).replace(/\?[^:\s]*/, '')
