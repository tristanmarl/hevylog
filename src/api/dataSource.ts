import {
  clearCache as clearHevyCache,
  fetchAllWorkouts as fetchAllHevyWorkouts,
  fetchBodyweightEntries as fetchHevyBodyweightEntries,
  fetchWorkout as fetchHevyWorkout,
  getLastFetchTime as getHevyLastFetchTime,
  updateWorkout as updateHevyWorkout,
} from './hevy'
import {
  clearLiftosaurCache,
  fetchAllLiftosaurWorkouts,
  fetchLiftosaurBodyweightEntries,
  fetchLiftosaurWorkout,
  getLiftosaurLastFetchTime,
  updateLiftosaurWorkout,
} from './liftosaur'
import type { BodyweightEntry, Workout } from '../types/workout'

export type DataSource = 'hevy' | 'liftosaur'

export const DATA_SOURCE_LABELS: Record<DataSource, string> = {
  hevy: 'Hevy',
  liftosaur: 'Liftosaur',
}

export function fetchAllWorkouts(source: DataSource): Promise<Workout[]> {
  return source === 'hevy' ? fetchAllHevyWorkouts() : fetchAllLiftosaurWorkouts()
}

export function fetchWorkout(source: DataSource, id: string): Promise<Workout> {
  return source === 'hevy' ? fetchHevyWorkout(id) : fetchLiftosaurWorkout(id)
}

export function updateWorkout(source: DataSource, workout: Workout): Promise<Workout> {
  return source === 'hevy' ? updateHevyWorkout(workout) : updateLiftosaurWorkout()
}

export function fetchBodyweightEntries(source: DataSource): Promise<BodyweightEntry[]> {
  return source === 'hevy' ? fetchHevyBodyweightEntries() : fetchLiftosaurBodyweightEntries()
}

export function clearCache(source: DataSource): void {
  if (source === 'hevy') clearHevyCache()
  else clearLiftosaurCache()
}

export function getLastFetchTime(source: DataSource): Date | null {
  return source === 'hevy' ? getHevyLastFetchTime() : getLiftosaurLastFetchTime()
}
