import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export async function writeAtomic(path, text) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(`${path}.tmp`, text)
  await rename(`${path}.tmp`, path)
}

export async function get(url, accept) {
  await sleep(200)
  return fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: accept }, redirect: 'manual' })
}

export async function fetchJson(url) {
  const res = await get(url, 'application/json')
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  return res.json()
}

export async function cachedJson(path, url) {
  if (!(await exists(path))) {
    const res = await get(url, 'application/json')
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
    await writeAtomic(path, await res.text())
  }
  return JSON.parse(await readFile(path, 'utf8'))
}

// One record per line keeps the generated files reviewable in a diff.
export function writeJson(path, value) {
  const blocks = Object.entries(value).map(([key, block]) => {
    const rows = Array.isArray(block)
      ? block.map((row) => JSON.stringify(row))
      : Object.entries(block).map(([k, row]) => `${JSON.stringify(k)}:${JSON.stringify(row)}`)
    const [open, close] = Array.isArray(block) ? ['[', ']'] : ['{', '}']
    return `${JSON.stringify(key)}:${open}\n${rows.join(',\n')}\n${close}`
  })
  return writeAtomic(path, `{\n${blocks.join(',\n')}\n}\n`)
}
