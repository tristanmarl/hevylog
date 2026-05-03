import type { BodyweightEntry, Workout, WorkoutExercise, WorkoutSet } from '../types/workout'

interface LiftosaurHistoryRecord {
  id?: string | number
  text: string
}

const API_TOKEN = import.meta.env.VITE_LIFTOSAUR_API_TOKEN as string | undefined
const HISTORY_URL = import.meta.env.VITE_LIFTOSAUR_HISTORY_URL || '/liftosaur-history.json'
const SESSION_KEY = 'hevylog:liftosaur:workouts'

let workoutCache: Workout[] | null = null
let lastFetchTime: Date | null = null

function toIsoDate(raw: string): string {
  const normalized = raw.trim().replace(
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2}:\d{2})$/,
    '$1T$2$3',
  )
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return new Date().toISOString()
  return date.toISOString()
}

function getQuotedField(text: string, key: string): string | null {
  const match = text.match(new RegExp(`${key}:\\s*"([^"]*)"`))
  return match?.[1] ?? null
}

function getNumberField(text: string, key: string): number | null {
  const match = text.match(new RegExp(`${key}:\\s*(\\d+)`))
  return match ? Number(match[1]) : null
}

function kgFrom(weight: number, unit: string): number {
  return unit.toLowerCase() === 'lb'
    ? Math.round(weight * 0.45359237 * 10) / 10
    : weight
}

function parseSetGroup(group: string, type: string, startIndex: number): WorkoutSet[] {
  const clean = group.replace(/\([^)]*\)/g, '').trim()
  const match = clean.match(/(\d+)x(\d+)(?:\|\d+)?\+?\s+([0-9.]+)\s*(kg|lb)(?:\s+@([0-9.]+)\+?)?/i)
  if (!match) return []

  const count = Number(match[1])
  const reps = Number(match[2])
  const weight = kgFrom(Number(match[3]), match[4])
  const rpe = match[5] ? Number(match[5]) : null

  return Array.from({ length: count }, (_, offset) => ({
    index: startIndex + offset,
    type,
    weight_kg: weight,
    reps,
    distance_meters: null,
    duration_seconds: null,
    rpe,
  }))
}

function parseSets(section: string, type: string, startIndex: number): WorkoutSet[] {
  const setGroups = section
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  const sets: WorkoutSet[] = []
  for (const group of setGroups) {
    sets.push(...parseSetGroup(group, type, startIndex + sets.length))
  }
  return sets
}

function parseExerciseLine(line: string, index: number): WorkoutExercise | null {
  const parts = line.split(' / ').map((part) => part.trim())
  if (parts.length < 2) return null

  const title = parts[0]
  const sets: WorkoutSet[] = []

  for (const part of parts.slice(1)) {
    if (part.startsWith('target:')) continue
    if (part.startsWith('warmup:')) {
      sets.push(...parseSets(part.replace(/^warmup:\s*/, ''), 'warmup', sets.length))
    } else {
      sets.push(...parseSets(part, part.toLowerCase().includes('(drop)') ? 'dropset' : 'normal', sets.length))
    }
  }

  return {
    index,
    title,
    exercise_template_id: `liftosaur:${title.toLowerCase()}`,
    notes: '',
    sets,
  }
}

function parseRecord(record: LiftosaurHistoryRecord, fallbackIndex: number): Workout | null {
  const lines = record.text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//'))

  const header = lines.find((line) => line.includes('exercises:'))
  if (!header) return null

  const dateText = header.split(' / ')[0]
  const startTime = toIsoDate(dateText)
  const durationSeconds = getNumberField(header, 'duration') ?? 0
  const endTime = new Date(new Date(startTime).getTime() + durationSeconds * 1000).toISOString()
  const program = getQuotedField(header, 'program')
  const dayName = getQuotedField(header, 'dayName')
  const week = getNumberField(header, 'week')
  const dayInWeek = getNumberField(header, 'dayInWeek')

  const exerciseLines = lines.filter((line) => !line.includes('exercises:') && line !== '}')
  const exercises = exerciseLines
    .map((line, index) => parseExerciseLine(line, index))
    .filter((exercise): exercise is WorkoutExercise => exercise !== null)

  if (exercises.length === 0) return null

  const descriptionParts = [
    program ? `Program: ${program}` : null,
    week ? `Week ${week}` : null,
    dayInWeek ? `Day ${dayInWeek}` : null,
  ].filter(Boolean)

  return {
    id: `liftosaur:${record.id ?? fallbackIndex}`,
    routine_id: program ? `liftosaur:${program}` : null,
    title: dayName || program || 'Liftosaur Workout',
    description: descriptionParts.join(' · '),
    start_time: startTime,
    end_time: endTime,
    exercises,
  }
}

function splitRawHistory(text: string): LiftosaurHistoryRecord[] {
  return text
    .split(/\n\s*\n/)
    .map((recordText, index) => ({ id: index, text: recordText.trim() }))
    .filter((record) => record.text.includes('exercises:'))
}

async function fetchLiveRecords(): Promise<LiftosaurHistoryRecord[]> {
  const records: LiftosaurHistoryRecord[] = []
  let cursor: string | undefined

  do {
    const url = new URL('/liftosaur-api/history', window.location.origin)
    url.searchParams.set('limit', '200')
    if (cursor) url.searchParams.set('cursor', cursor)

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    })
    if (!response.ok) throw new Error(`Liftosaur API error: ${response.status} ${response.statusText}`)

    const page = await response.json() as { data?: { records?: LiftosaurHistoryRecord[]; hasMore?: boolean; nextCursor?: string }; records?: LiftosaurHistoryRecord[]; hasMore?: boolean; nextCursor?: string }
    const data = page.data ?? page
    records.push(...(data.records ?? []))
    cursor = data.hasMore ? String(data.nextCursor ?? '') : undefined
  } while (cursor)

  return records
}

async function loadHistoryRecords(): Promise<LiftosaurHistoryRecord[]> {
  if (API_TOKEN) return fetchLiveRecords()

  const response = await fetch(HISTORY_URL)
  if (!response.ok) {
    throw new Error(
      `Liftosaur history not found at ${HISTORY_URL}. Set VITE_LIFTOSAUR_API_TOKEN in .env or run the sync script.`,
    )
  }

  const raw = await response.text()
  try {
    const data = JSON.parse(raw) as
      | LiftosaurHistoryRecord[]
      | { records?: LiftosaurHistoryRecord[] }
      | { data?: { records?: LiftosaurHistoryRecord[] } }
      | { text?: string }

    if (Array.isArray(data)) return data
    if ('records' in data && Array.isArray(data.records)) return data.records
    if ('data' in data && Array.isArray(data.data?.records)) return data.data.records
    if ('text' in data && typeof data.text === 'string') return splitRawHistory(data.text)
  } catch {
    return splitRawHistory(raw)
  }

  return []
}

export async function fetchAllLiftosaurWorkouts(): Promise<Workout[]> {
  if (workoutCache) return workoutCache

  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) {
      workoutCache = JSON.parse(raw) as Workout[]
      lastFetchTime = new Date()
      return workoutCache
    }
  } catch {
    // Ignore malformed session cache.
  }

  const records = await loadHistoryRecords()
  const workouts = records
    .map((record, index) => parseRecord(record, index))
    .filter((workout): workout is Workout => workout !== null)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())

  workoutCache = workouts
  lastFetchTime = new Date()
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(workouts)) } catch { /* ignore quota */ }
  return workouts
}

export async function fetchLiftosaurWorkout(id: string): Promise<Workout> {
  const workouts = await fetchAllLiftosaurWorkouts()
  const workout = workouts.find((item) => item.id === id)
  if (!workout) throw new Error('Liftosaur workout not found')
  return workout
}

export async function updateLiftosaurWorkout(): Promise<Workout> {
  throw new Error('Liftosaur workouts are read-only in LiftLog. Edit them in Liftosaur, then regenerate liftosaur-history.json.')
}

export async function fetchLiftosaurBodyweightEntries(): Promise<BodyweightEntry[]> {
  return []
}

export function clearLiftosaurCache(): void {
  workoutCache = null
  lastFetchTime = null
  sessionStorage.removeItem(SESSION_KEY)
}

export function getLiftosaurLastFetchTime(): Date | null {
  return lastFetchTime
}
