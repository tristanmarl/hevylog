import type { MuscleGroupStats, Workout } from '../types/workout'

const MUSCLE_KEYWORDS: Record<string, string[]> = {
  chest: [
    'bench press',
    'chest fly',
    'fly',
    'push up',
    'pushup',
    'dip',
    'cable cross',
    'pec deck',
    'incline press',
    'decline press',
    'chest press',
  ],
  back: [
    'row',
    'pull up',
    'pullup',
    'pull-up',
    'lat pulldown',
    'lat pull',
    'deadlift',
    'chin up',
    'chin-up',
    'chinup',
    'seated row',
    'cable row',
    'barbell row',
    'dumbbell row',
    't-bar',
    'back extension',
    'hyperextension',
    'rack pull',
  ],
  shoulders: [
    'overhead press',
    'shoulder press',
    'military press',
    'lateral raise',
    'front raise',
    'shrug',
    'arnold press',
    'face pull',
    'upright row',
    'rear delt',
    'ohp',
  ],
  biceps: [
    'bicep curl',
    'biceps curl',
    'hammer curl',
    'preacher curl',
    'concentration curl',
    'cable curl',
    'barbell curl',
    'dumbbell curl',
    'ez curl',
    'incline curl',
  ],
  triceps: [
    'tricep',
    'triceps',
    'pushdown',
    'push down',
    'skull crusher',
    'overhead extension',
    'tricep extension',
    'close grip bench',
    'close-grip',
    'rope pushdown',
    'dip',
    'kickback',
  ],
  legs: [
    'squat',
    'lunge',
    'leg press',
    'leg curl',
    'leg extension',
    'calf raise',
    'calf press',
    'deadlift',
    'hip thrust',
    'glute bridge',
    'bulgarian split',
    'hack squat',
    'front squat',
    'goblet squat',
    'step up',
    'rdl',
    'romanian deadlift',
    'good morning',
    'nordic',
    'sumo',
    'wall sit',
  ],
  core: [
    'plank',
    'crunch',
    'sit up',
    'sit-up',
    'situp',
    'ab ',
    'abs ',
    'oblique',
    'russian twist',
    'leg raise',
    'hanging leg',
    'bicycle',
    'mountain climber',
    'dragon flag',
    'ab wheel',
    'cable crunch',
    'v-up',
    'hollow',
  ],
  cardio: [
    'run',
    'running',
    'treadmill',
    'bike',
    'cycling',
    'elliptical',
    'stairmaster',
    'stairs',
    'rowing machine',
    'rower',
    'jump rope',
    'sprints',
    'hiit',
    'cardio',
    'swim',
    'walk',
  ],
}

export function getMuscleGroupsForExercise(
  title: string,
  templateMuscles?: string[],
): string[] {
  if (templateMuscles && templateMuscles.length > 0) {
    return templateMuscles
  }

  const lower = title.toLowerCase()
  const matched: string[] = []

  for (const [muscle, keywords] of Object.entries(MUSCLE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        if (!matched.includes(muscle)) {
          matched.push(muscle)
        }
        break
      }
    }
  }

  return matched.length > 0 ? matched : ['other']
}

export function computeMuscleHeatmap(workouts: Workout[]): Record<string, MuscleGroupStats> {
  const stats: Record<string, MuscleGroupStats> = {}

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      const muscles = getMuscleGroupsForExercise(
        exercise.title,
        exercise.muscle_groups,
      )
      const normalSets = exercise.sets.filter((s) => s.type !== 'warmup')
      const setCount = normalSets.length

      for (const muscle of muscles) {
        if (!stats[muscle]) {
          stats[muscle] = {
            name: muscle,
            sets: 0,
            lastWorked: workout.start_time,
            exercises: [],
          }
        }

        stats[muscle].sets += setCount

        if (
          new Date(workout.start_time) > new Date(stats[muscle].lastWorked)
        ) {
          stats[muscle].lastWorked = workout.start_time
        }

        if (!stats[muscle].exercises.includes(exercise.title)) {
          stats[muscle].exercises.push(exercise.title)
        }
      }
    }
  }

  return stats
}

export function computeMuscleHeatmapForPeriod(
  workouts: Workout[],
  weeksBack = 4,
): Record<string, MuscleGroupStats> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - weeksBack * 7)

  const filtered = workouts.filter(
    (w) => new Date(w.start_time) >= cutoff,
  )

  return computeMuscleHeatmap(filtered)
}
