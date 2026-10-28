import { stat } from 'node:fs/promises'
import { cachedJson, writeAtomic } from './cache.mjs'

const URL = 'https://questlog.gg/aion-2/api/trpc/dataTable.getMasteryLevels?input=%7B%22language%22%3A%22en%22%7D'
const CACHE = '.cache/questlog/masteryLevels.json'
const LEVELS = 100
const QUEST_LEVEL = 50
// metabot.gg's crafting guide states both sums, so the table is checked against an independent source.
const SUM_BELOW_QUEST = 8809
const SUM_ABOVE_QUEST = 82680

const body = await cachedJson(CACHE, URL)
const rows = body.result.data.filter((row) => row.track === 'crafting').sort((a, b) => a.level - b.level)
if (rows.length !== LEVELS) throw new Error(`questlog lists ${rows.length} crafting levels, expected ${LEVELS}`)
rows.forEach((row, at) => {
  if (row.level !== at + 1 || !Number.isInteger(row.exp) || row.exp < 0) throw new Error(`questlog level ${at + 1} is malformed: ${JSON.stringify(row)}`)
})
const expToNext = rows.map((row) => row.exp)
const sum = (from, to) => expToNext.slice(from - 1, to).reduce((total, exp) => total + exp, 0)
if (expToNext[QUEST_LEVEL - 1] !== 0) throw new Error(`level ${QUEST_LEVEL} needs ${expToNext[QUEST_LEVEL - 1]} EXP, expected the quest gate at 0`)
if (expToNext[LEVELS - 1] !== 0) throw new Error(`level ${LEVELS} needs ${expToNext[LEVELS - 1]} EXP, expected the cap at 0`)
if (sum(1, QUEST_LEVEL - 1) !== SUM_BELOW_QUEST) throw new Error(`levels 1..49 sum to ${sum(1, QUEST_LEVEL - 1)}, expected ${SUM_BELOW_QUEST}`)
if (sum(QUEST_LEVEL + 1, LEVELS - 1) !== SUM_ABOVE_QUEST) throw new Error(`levels 51..99 sum to ${sum(QUEST_LEVEL + 1, LEVELS - 1)}, expected ${SUM_ABOVE_QUEST}`)

// The cache file's date is the fetch date, so a re-run on the same cache writes the same file.
const capturedAt = (await stat(CACHE)).mtime.toISOString().slice(0, 10)
await writeAtomic('src/data/mastery.json', `{\n  "source": ${JSON.stringify(URL)},\n  "capturedAt": ${JSON.stringify(capturedAt)},\n  "expToNext": ${JSON.stringify(expToNext)}\n}\n`)
console.log(`mastery.json: ${LEVELS} levels, ${SUM_BELOW_QUEST} EXP to ${QUEST_LEVEL}, ${SUM_ABOVE_QUEST} EXP from ${QUEST_LEVEL + 1} to ${LEVELS}`)
