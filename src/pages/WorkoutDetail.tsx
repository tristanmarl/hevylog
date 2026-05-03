import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDataVersion } from '../context/DataVersion'
import { format, parseISO } from 'date-fns'
import { fetchWorkout, fetchAllWorkouts } from '../api/hevy'
import type { Workout, WorkoutSet } from '../types/hevy'
import {
  computeWorkoutVolume,
  computeWorkoutDuration,
  formatDuration,
  formatVolume,
  getExerciseHistory,
  estimateOneRepMax,
} from '../utils/stats'
import { getMuscleGroupsForExercise } from '../utils/muscles'
import MusclePill from '../components/MusclePill'
import { FullPageSpinner } from '../components/Spinner'
import ErrorBanner from '../components/ErrorBanner'
import AppTooltip from '../components/Tooltip'
import clsx from 'clsx'

interface PersonalRecord {
  exerciseTitle: string
  weightKg: number
  previousBestKg: number
}

function SetTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; color: string }> = {
    warmup: { label: 'W', color: '#f59e0b' },
    dropset: { label: 'D', color: '#a855f7' },
    normal: { label: '', color: 'transparent' },
  }
  const info = map[type] ?? { label: type.slice(0, 1).toUpperCase(), color: '#666' }
  if (!info.label) return null
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold"
      style={{ backgroundColor: `${info.color}22`, color: info.color }}
    >
      {info.label}
    </span>
  )
}

function formatWeight(kg: number | null): string {
  if (kg === null) return '—'
  return `${kg} kg`
}

function formatReps(reps: number | null): string {
  if (reps === null) return '—'
  return String(reps)
}

function setVolume(set: WorkoutSet): string {
  if (set.weight_kg != null && set.reps != null) {
    return `${Math.round(set.weight_kg * set.reps)} kg`
  }
  if (set.distance_meters != null) return `${set.distance_meters}m`
  if (set.duration_seconds != null) return `${set.duration_seconds}s`
  return '—'
}

export default function WorkoutDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { version } = useDataVersion()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [allWorkouts, setAllWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [w, all] = await Promise.all([
        fetchWorkout(id),
        fetchAllWorkouts(),
      ])
      setWorkout(w)
      setAllWorkouts(all)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load workout')
    } finally {
      setLoading(false)
    }
  }, [id, version])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <FullPageSpinner />
  if (error) return <ErrorBanner message={error} onRetry={load} />
  if (!workout) return null

  const duration = computeWorkoutDuration(workout)
  const volume = computeWorkoutVolume(workout)

  // Compute personal records
  const prs: PersonalRecord[] = []
  for (const exercise of workout.exercises) {
    const history = getExerciseHistory(allWorkouts, exercise.title)
    const thisSessionDate = format(parseISO(workout.start_time), 'yyyy-MM-dd')

    // Find the max weight in this workout for this exercise
    const thisMaxWeight = Math.max(
      0,
      ...exercise.sets
        .filter((s) => s.type !== 'warmup' && s.weight_kg != null)
        .map((s) => s.weight_kg as number),
    )

    if (thisMaxWeight === 0) continue

    // Previous best: max weight in sessions BEFORE this one
    const previousSessions = history.filter((h) => h.date < thisSessionDate)
    const previousBest =
      previousSessions.length > 0
        ? Math.max(...previousSessions.map((h) => h.maxWeightKg))
        : 0

    if (thisMaxWeight > previousBest) {
      prs.push({
        exerciseTitle: exercise.title,
        weightKg: thisMaxWeight,
        previousBestKg: previousBest,
      })
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate('/workouts')}
        className="flex items-center gap-2 text-sm transition-colors"
        style={{ color: '#999' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#999')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      {/* Header */}
      <div
        className="rounded-lg p-6"
        style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
      >
        <h1 className="text-2xl font-bold text-white">{workout.title}</h1>
        <p className="text-sm mt-1" style={{ color: '#888' }}>
          {format(parseISO(workout.start_time), 'EEEE, MMMM d yyyy')} &middot;{' '}
          {format(parseISO(workout.start_time), 'HH:mm')} –{' '}
          {format(parseISO(workout.end_time), 'HH:mm')}
        </p>
        {workout.description && (
          <p className="text-sm mt-3" style={{ color: '#aaa' }}>
            {workout.description}
          </p>
        )}
        <div className="flex flex-wrap gap-6 mt-4">
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: '#666' }}>Duration</p>
            <p className="text-lg font-semibold text-white mt-0.5">{formatDuration(duration)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: '#666' }}>Volume</p>
            <p className="text-lg font-semibold text-white mt-0.5">{formatVolume(volume)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: '#666' }}>Exercises</p>
            <p className="text-lg font-semibold text-white mt-0.5">{workout.exercises.length}</p>
          </div>
        </div>
      </div>

      {/* PRs achieved */}
      {prs.length > 0 && (
        <div
          className="rounded-lg p-4"
          style={{
            backgroundColor: 'rgba(232,106,46,0.08)',
            border: '1px solid rgba(232,106,46,0.25)',
          }}
        >
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: '#e86a2e' }}>
            <span>🏆</span> Personal Records
          </h2>
          <div className="space-y-2">
            {prs.map((pr) => (
              <div key={pr.exerciseTitle} className="flex items-center justify-between text-sm">
                <span className="text-white font-medium">{pr.exerciseTitle}</span>
                <span style={{ color: '#e86a2e' }}>
                  {pr.weightKg} kg
                  {pr.previousBestKg > 0 && (
                    <span className="ml-1" style={{ color: '#888', fontSize: '12px' }}>
                      (prev {pr.previousBestKg} kg)
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exercises */}
      {(() => {
        // Group exercises into supersets and singles
        const groups: Array<{ supersetId: string | null; exercises: typeof workout.exercises }> = []
        const seenSupersets = new Map<string, number>()

        for (const exercise of workout.exercises) {
          const ssId = exercise.superset_id ?? null
          if (ssId) {
            const idx = seenSupersets.get(ssId)
            if (idx !== undefined) {
              groups[idx].exercises.push(exercise)
            } else {
              seenSupersets.set(ssId, groups.length)
              groups.push({ supersetId: ssId, exercises: [exercise] })
            }
          } else {
            groups.push({ supersetId: null, exercises: [exercise] })
          }
        }

        return (
          <div className="space-y-4">
            {groups.map((group, gi) => {
              const isSuperset = group.supersetId !== null && group.exercises.length > 1

              const exerciseCards = group.exercises.map((exercise) => {
                const muscles = getMuscleGroupsForExercise(exercise.title, exercise.muscle_groups).filter(
                  (m) => m !== 'other',
                )
                const normalSets = exercise.sets.filter((s) => s.type !== 'warmup')
                const exerciseVolume = normalSets.reduce((sum, s) => {
                  if (s.weight_kg != null && s.reps != null) return sum + s.weight_kg * s.reps
                  return sum
                }, 0)

                return (
                  <div
                    key={exercise.index}
                    className="rounded-lg p-5"
                    style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                  >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-semibold text-white">{exercise.title}</h3>
                  {exercise.notes && (
                    <p className="text-xs mt-1" style={{ color: '#888' }}>
                      {exercise.notes}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 justify-end shrink-0">
                  {muscles.map((m) => (
                    <MusclePill key={m} muscle={m} small />
                  ))}
                </div>
              </div>

              {/* Sets table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                      <th className="text-left py-2 pr-4 text-xs uppercase tracking-wider font-medium w-12" style={{ color: '#555' }}>
                        Set
                      </th>
                      <th className="text-left py-2 pr-4 text-xs uppercase tracking-wider font-medium w-10" style={{ color: '#555' }}>
                        Type
                      </th>
                      <th className="text-right py-2 pr-4 text-xs uppercase tracking-wider font-medium" style={{ color: '#555' }}>
                        Weight
                      </th>
                      <th className="text-right py-2 pr-4 text-xs uppercase tracking-wider font-medium" style={{ color: '#555' }}>
                        Reps
                      </th>
                      <th className="text-right py-2 pr-4 text-xs uppercase tracking-wider font-medium" style={{ color: '#555' }}>
                        <AppTooltip text="Rate of Perceived Exertion — how hard the set felt on a scale of 1–10. RPE 9 means you could do 1 more rep. RPE 10 means you gave everything.">
                          <span style={{ borderBottom: '1px dashed #555', cursor: 'help' }}>RPE</span>
                        </AppTooltip>
                      </th>
                      <th className="text-right py-2 pr-4 text-xs uppercase tracking-wider font-medium" style={{ color: '#555' }}>
                        <AppTooltip text="Estimated One Rep Max — the maximum weight you could lift for 1 rep based on your performance. Calculated using the Epley formula. Only shown for sets of 10 reps or fewer.">
                          <span style={{ borderBottom: '1px dashed #555', cursor: 'help' }}>1RM est.</span>
                        </AppTooltip>
                      </th>
                      <th className="text-right py-2 text-xs uppercase tracking-wider font-medium" style={{ color: '#555' }}>
                        Volume
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {exercise.sets.map((set) => (
                      <tr
                        key={set.index}
                        className={clsx(set.type === 'warmup' && 'opacity-50')}
                        style={{ borderBottom: '1px solid #1e1e1e' }}
                      >
                        <td className="py-2 pr-4 text-white">{set.index + 1}</td>
                        <td className="py-2 pr-4">
                          <SetTypeBadge type={set.type} />
                        </td>
                        <td className="py-2 pr-4 text-right" style={{ color: '#ccc' }}>
                          {formatWeight(set.weight_kg)}
                        </td>
                        <td className="py-2 pr-4 text-right" style={{ color: '#ccc' }}>
                          {formatReps(set.reps)}
                        </td>
                        <td className="py-2 pr-4 text-right text-xs" style={{ color: set.rpe != null ? '#e86a2e' : '#444' }}>
                          {set.rpe != null ? set.rpe : '—'}
                        </td>
                        <td className="py-2 pr-4 text-right text-xs" style={{ color: '#777' }}>
                          {set.weight_kg != null && set.reps != null && set.reps <= 10
                            ? `${estimateOneRepMax(set.weight_kg, set.reps)} kg`
                            : '—'}
                        </td>
                        <td className="py-2 text-right" style={{ color: '#888' }}>
                          {setVolume(set)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {exerciseVolume > 0 && (
                    <tfoot>
                      <tr>
                        <td colSpan={6} className="pt-2 text-xs" style={{ color: '#555' }}>
                          Total ({normalSets.length} sets)
                        </td>
                        <td className="pt-2 text-right text-sm font-semibold" style={{ color: '#e86a2e' }}>
                          {formatVolume(exerciseVolume)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
                  </div>
                )
              })

              if (isSuperset) {
                return (
                  <div
                    key={`ss-${gi}`}
                    className="pl-3 space-y-3"
                    style={{ borderLeft: '3px solid #7c3aed' }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-bold"
                        style={{ backgroundColor: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}
                      >
                        SS
                      </span>
                      <span className="text-xs" style={{ color: '#666' }}>Superset</span>
                    </div>
                    {exerciseCards}
                  </div>
                )
              }

              return <>{exerciseCards}</>
            })}
          </div>
        )
      })()}
    </div>
  )
}
