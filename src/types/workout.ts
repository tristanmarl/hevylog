export interface WorkoutSet {
  index: number
  type: string // "normal" | "warmup" | "dropset"
  weight_kg: number | null
  reps: number | null
  distance_meters: number | null
  duration_seconds: number | null
  rpe: number | null
}

export interface WorkoutExercise {
  index: number
  title: string
  exercise_template_id: string
  superset_id?: string | null
  muscle_groups?: string[]
  notes: string
  sets: WorkoutSet[]
}

export interface Workout {
  id: string
  routine_id?: string | null
  title: string
  description: string
  start_time: string // ISO
  end_time: string // ISO
  exercises: WorkoutExercise[]
}

export interface BodyweightEntry {
  id: number
  date: string // YYYY-MM-DD
  weight_kg: number
  created_at: string
}

export interface MuscleGroupStats {
  name: string
  sets: number
  lastWorked: string // ISO date
  exercises: string[]
}
