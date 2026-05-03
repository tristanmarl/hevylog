import type {
  Workout,
  WorkoutsResponse,
  ExerciseTemplate,
  ExerciseTemplatesResponse,
  BodyweightEntry,
  BodyweightResponse,
} from '../types/hevy'

const BASE_URL = 'https://api.hevyapp.com'
const PAGE_SIZE = 10

// Keys persisted to sessionStorage so data survives page reloads within the same tab.
const SESSION_KEYS = new Set(['__all_workouts__', '__all_bodyweights__', '__all_exercise_templates__'])
const SESSION_PREFIX = 'hevylog:'

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const cache = new Map<string, CacheEntry<unknown>>()

// Warm in-memory cache from sessionStorage on module load.
;(function warmCache() {
  for (const key of SESSION_KEYS) {
    try {
      const raw = sessionStorage.getItem(SESSION_PREFIX + key)
      if (raw) cache.set(key, { data: JSON.parse(raw) as unknown, timestamp: Date.now() })
    } catch { /* ignore parse / quota errors */ }
  }
})()

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  return entry ? entry.data : null
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() })
  if (SESSION_KEYS.has(key)) {
    try { sessionStorage.setItem(SESSION_PREFIX + key, JSON.stringify(data)) } catch { /* storage full */ }
  }
}

async function apiFetch<T>(path: string): Promise<T> {
  const apiKey = import.meta.env.VITE_HEVY_API_KEY as string
  if (!apiKey) {
    throw new Error('VITE_HEVY_API_KEY is not set. Create a .env file with your Hevy API key.')
  }

  const cached = getCached<T>(path)
  if (cached !== null) return cached

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Hevy API error: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as T
  setCached(path, data)
  return data
}

async function fetchAllPages<TItem>(
  basePath: string,
  extractItems: (data: unknown) => TItem[],
  getPageCount: (data: unknown) => number,
): Promise<TItem[]> {
  const firstPage = await apiFetch<unknown>(`${basePath}?page=1&pageSize=${PAGE_SIZE}`)
  const pageCount = getPageCount(firstPage)
  const allItems: TItem[] = [...extractItems(firstPage)]

  const remainingPages = Array.from({ length: Math.max(0, pageCount - 1) }, (_, i) => i + 2)
  await Promise.all(
    remainingPages.map(async (page) => {
      const data = await apiFetch<unknown>(`${basePath}?page=${page}&pageSize=${PAGE_SIZE}`)
      allItems.push(...extractItems(data))
    }),
  )

  return allItems
}

export async function fetchAllWorkouts(): Promise<Workout[]> {
  const cacheKey = '__all_workouts__'
  const cached = getCached<Workout[]>(cacheKey)
  if (cached !== null) return cached

  const workouts = await fetchAllPages<Workout>(
    '/v1/workouts',
    (data) => (data as WorkoutsResponse).workouts ?? [],
    (data) => (data as WorkoutsResponse).page_count ?? 1,
  )

  workouts.sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
  )

  setCached(cacheKey, workouts)
  return workouts
}

export async function fetchWorkout(id: string): Promise<Workout> {
  return apiFetch<Workout>(`/v1/workouts/${id}`)
}

export async function fetchBodyweightEntries(): Promise<BodyweightEntry[]> {
  const cacheKey = '__all_bodyweights__'
  const cached = getCached<BodyweightEntry[]>(cacheKey)
  if (cached !== null) return cached

  const entries = await fetchAllPages<BodyweightEntry>(
    '/v1/body_measurements',
    (data) => (data as BodyweightResponse).body_measurements ?? [],
    (data) => (data as BodyweightResponse).page_count ?? 1,
  )

  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  setCached(cacheKey, entries)
  return entries
}

export async function fetchExerciseTemplates(): Promise<ExerciseTemplate[]> {
  const cacheKey = '__all_exercise_templates__'
  const cached = getCached<ExerciseTemplate[]>(cacheKey)
  if (cached !== null) return cached

  const templates = await fetchAllPages<ExerciseTemplate>(
    '/v1/exercise_templates',
    (data) => (data as ExerciseTemplatesResponse).exercise_templates ?? [],
    (data) => (data as ExerciseTemplatesResponse).page_count ?? 1,
  )

  setCached(cacheKey, templates)
  return templates
}

export function clearCache(): void {
  cache.clear()
  SESSION_KEYS.forEach((key) => sessionStorage.removeItem(SESSION_PREFIX + key))
}

export function getLastFetchTime(): Date | null {
  if (cache.size === 0) return null
  const timestamps = Array.from(cache.values()).map((e) => e.timestamp)
  return new Date(Math.max(...timestamps))
}
