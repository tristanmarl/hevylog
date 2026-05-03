import type { BodyweightEntry, Workout } from './workout'

export type {
  BodyweightEntry,
  MuscleGroupStats,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from './workout'

export interface ExerciseTemplate {
  id: string
  title: string
  type: string
  primary_muscle_group: string
  secondary_muscle_groups: string[]
  is_custom: boolean
}

export interface WorkoutsResponse {
  workouts: Workout[]
  page: number
  page_count: number
}

export interface ExerciseTemplatesResponse {
  exercise_templates: ExerciseTemplate[]
  page: number
  page_count: number
}

export interface BodyweightResponse {
  body_measurements: BodyweightEntry[]
  page: number
  page_count: number
}
