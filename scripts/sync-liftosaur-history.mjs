import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const API_BASE_URL = 'https://www.liftosaur.com/api/v1'
const OUTPUT_PATH = resolve(process.cwd(), 'public/liftosaur-history.json')

async function loadDotEnv() {
  try {
    const text = await readFile(resolve(process.cwd(), '.env'), 'utf8')
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const index = trimmed.indexOf('=')
      if (index === -1) continue
      const key = trimmed.slice(0, index).trim()
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // .env is optional; regular environment variables work too.
  }
}

async function fetchHistoryPage(token, cursor) {
  const url = new URL(`${API_BASE_URL}/history`)
  url.searchParams.set('limit', '200')
  if (cursor) url.searchParams.set('cursor', cursor)

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Liftosaur API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

async function main() {
  await loadDotEnv()
  const token = process.env.LIFTOSAUR_API_TOKEN
  if (!token) {
    throw new Error('Set LIFTOSAUR_API_TOKEN in .env or your shell before running this script.')
  }

  const records = []
  let cursor

  do {
    const page = await fetchHistoryPage(token, cursor)
    const data = page.data ?? page
    records.push(...(data.records ?? []))
    cursor = data.hasMore ? String(data.nextCursor ?? '') : ''
  } while (cursor)

  await mkdir(dirname(OUTPUT_PATH), { recursive: true })
  await writeFile(
    OUTPUT_PATH,
    JSON.stringify({ records, syncedAt: new Date().toISOString() }, null, 2),
  )

  console.log(`Wrote ${records.length} Liftosaur history records to ${OUTPUT_PATH}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
