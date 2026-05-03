import { useEffect, useState, useCallback } from 'react'
import { useDataVersion } from '../context/DataVersion'
import { format, parseISO, subDays } from 'date-fns'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { fetchAllWorkouts } from '../api/hevy'
import type { Workout } from '../types/hevy'
import { getExerciseHistory, formatVolume, estimateOneRepMax, detectPlateau } from '../utils/stats'
import { getMuscleGroupsForExercise } from '../utils/muscles'
import MusclePill from '../components/MusclePill'
import { FullPageSpinner } from '../components/Spinner'
import ErrorBanner from '../components/ErrorBanner'
import AppTooltip from '../components/Tooltip'

interface ExerciseSummary {
  title: string
  muscles: string[]
  totalSessions: number
  prWeightKg: number
  prDate: string
  lastDoneDate: string
  avgSetsPerSession: number
  est1RM: number
  isPlateaued: boolean
}

export default function Exercises() {
  const { version } = useDataVersion()
  const [allWorkouts, setAllWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [recency, setRecency] = useState<30 | 90 | 365 | 'all'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAllWorkouts()
      setAllWorkouts(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load workouts')
    } finally {
      setLoading(false)
    }
  }, [version])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <FullPageSpinner />
  if (error) return <ErrorBanner message={error} onRetry={load} />

  // Build exercise summary list
  const exerciseMap = new Map<string, { sessions: number; totalSets: number; prWeightKg: number; prDate: string; lastDoneDate: string; muscles: string[]; est1RM: number; isPlateaued: boolean }>()

  for (const workout of allWorkouts) {
    for (const exercise of workout.exercises) {
      const entry = exerciseMap.get(exercise.title) ?? {
        sessions: 0,
        totalSets: 0,
        prWeightKg: 0,
        prDate: '',
        lastDoneDate: '',
        muscles: getMuscleGroupsForExercise(exercise.title, exercise.muscle_groups).filter(
          (m) => m !== 'other',
        ),
        est1RM: 0,
        isPlateaued: false,
      }

      const normalSets = exercise.sets.filter((s) => s.type !== 'warmup')
      entry.sessions++
      entry.totalSets += normalSets.length

      const maxWeight = Math.max(
        0,
        ...normalSets.filter((s) => s.weight_kg != null).map((s) => s.weight_kg as number),
      )

      const workoutDate = format(parseISO(workout.start_time), 'yyyy-MM-dd')

      if (maxWeight > entry.prWeightKg) {
        entry.prWeightKg = maxWeight
        entry.prDate = workoutDate
      }

      if (!entry.lastDoneDate || workoutDate > entry.lastDoneDate) {
        entry.lastDoneDate = workoutDate
      }

      // Best estimated 1RM across all sets
      for (const s of normalSets) {
        if (s.weight_kg != null && s.reps != null) {
          const e1rm = estimateOneRepMax(s.weight_kg, s.reps)
          if (e1rm > entry.est1RM) entry.est1RM = e1rm
        }
      }

      exerciseMap.set(exercise.title, entry)
    }
  }

  const allExercises: ExerciseSummary[] = Array.from(exerciseMap.entries())
    .map(([title, data]) => {
      const history = getExerciseHistory(allWorkouts, title)
      const isPlateaued = detectPlateau(history)
      return {
        title,
        muscles: data.muscles,
        totalSessions: data.sessions,
        prWeightKg: data.prWeightKg,
        prDate: data.prDate,
        lastDoneDate: data.lastDoneDate,
        avgSetsPerSession: data.sessions > 0 ? Math.round(data.totalSets / data.sessions) : 0,
        est1RM: data.est1RM,
        isPlateaued,
      }
    })
    .sort((a, b) => b.totalSessions - a.totalSessions)

  const recencyCutoff = recency === 'all' ? null : subDays(new Date(), recency).toISOString().slice(0, 10)

  const filtered = allExercises.filter((e) => {
    if (!e.title.toLowerCase().includes(search.toLowerCase())) return false
    if (recencyCutoff && e.lastDoneDate < recencyCutoff) return false
    return true
  })

  const selectedHistory = selected ? getExerciseHistory(allWorkouts, selected) : []
  const selectedSummary = selected ? allExercises.find((e) => e.title === selected) : null

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Exercises</h1>
          <p className="text-sm mt-0.5" style={{ color: '#999' }}>
            {filtered.length} of {allExercises.length} exercises
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Recency filter */}
          <div
            className="flex items-center rounded-lg overflow-hidden"
            style={{ border: '1px solid #333', backgroundColor: '#1a1a1a' }}
          >
            {([30, 90, 365, 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRecency(r)}
                className="px-3 py-2 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: recency === r ? '#e86a2e' : 'transparent',
                  color: recency === r ? '#fff' : '#888',
                }}
              >
                {r === 'all' ? 'All time' : `${r}d`}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 outline-none w-52"
            style={{ backgroundColor: '#252525', border: '1px solid #333' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#e86a2e')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#333')}
          />
        </div>
      </div>

      <div className="flex gap-6">
        {/* Exercise list */}
        <div
          className="rounded-lg overflow-hidden"
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #2a2a2a',
            minWidth: 320,
            flex: selected ? '0 0 360px' : '1',
          }}
        >
          <div
            className="px-4 py-3 text-xs uppercase tracking-wider font-medium"
            style={{ color: '#555', borderBottom: '1px solid #252525' }}
          >
            Exercise
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: '70vh' }}>
            {filtered.map((exercise) => (
              <button
                key={exercise.title}
                onClick={() => setSelected(exercise.title === selected ? null : exercise.title)}
                className="w-full text-left px-4 py-3 transition-colors"
                style={{
                  borderBottom: '1px solid #1e1e1e',
                  backgroundColor: selected === exercise.title ? 'rgba(232,106,46,0.1)' : 'transparent',
                  borderLeft: selected === exercise.title ? '2px solid #e86a2e' : '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (selected !== exercise.title) {
                    e.currentTarget.style.backgroundColor = '#222'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selected !== exercise.title) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-white truncate">{exercise.title}</p>
                      {exercise.isPlateaued && (
                        <AppTooltip text="Plateau detected — your max weight hasn't increased in 5+ sessions. Try adding 2.5 kg next session. If that fails, try a deload week (reduce weight by 10%) then attempt again.">
                          <span
                            className="text-xs px-1.5 py-0.5 rounded font-semibold shrink-0"
                            style={{ backgroundColor: 'rgba(248,113,113,0.15)', color: '#f87171' }}
                          >
                            PLATEAU
                          </span>
                        </AppTooltip>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#666' }}>
                      {exercise.totalSessions} session{exercise.totalSessions !== 1 ? 's' : ''}
                      {exercise.prWeightKg > 0 && ` · PR ${exercise.prWeightKg} kg`}
                      {exercise.est1RM > 0 && <span style={{ color: '#a06030' }}> · ~{exercise.est1RM} kg 1RM</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 justify-end shrink-0">
                    <div className="flex flex-wrap gap-1 justify-end">
                      {exercise.muscles.slice(0, 2).map((m) => (
                        <MusclePill key={m} muscle={m} small />
                      ))}
                    </div>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ color: '#444', transition: 'color 0.15s' }}
                      onMouseEnter={(e) => { (e.currentTarget as SVGElement).style.color = '#888' }}
                      onMouseLeave={(e) => { (e.currentTarget as SVGElement).style.color = '#444' }}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        {selected && selectedSummary && selectedHistory.length > 0 && (
          <div className="flex-1 min-w-0 space-y-4">
            <div
              className="rounded-lg p-5"
              style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{selected}</h2>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedSummary.muscles.map((m) => (
                      <MusclePill key={m} muscle={m} />
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-gray-500 hover:text-white"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                {[
                  { label: 'PR Weight', value: selectedSummary.prWeightKg > 0 ? `${selectedSummary.prWeightKg} kg` : '—' },
                  { label: 'Est. 1RM', value: selectedSummary.est1RM > 0 ? `${selectedSummary.est1RM} kg` : '—', accent: true },
                  {
                    label: 'PR Date',
                    value: selectedSummary.prDate
                      ? format(parseISO(selectedSummary.prDate), 'MMM d, yyyy')
                      : '—',
                  },
                  { label: 'Total Sessions', value: selectedSummary.totalSessions },
                  { label: 'Avg Sets/Session', value: selectedSummary.avgSetsPerSession },
                  { label: 'Last Trained', value: selectedSummary.lastDoneDate ? format(parseISO(selectedSummary.lastDoneDate), 'MMM d, yyyy') : '—' },
                ].map(({ label, value, accent }) => (
                  <div key={label}>
                    <p className="text-xs uppercase tracking-wider" style={{ color: '#555' }}>
                      {label}
                    </p>
                    <p className="text-lg font-semibold mt-0.5" style={{ color: accent ? '#e86a2e' : '#fff' }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Max weight chart */}
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
            >
              <h3 className="text-sm font-semibold text-white mb-3">Max weight over time</h3>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={selectedHistory} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#555', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(d) => format(parseISO(d), 'MMM d')}
                  />
                  <YAxis
                    tick={{ fill: '#555', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    unit=" kg"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#252525',
                      border: '1px solid #333',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: 12,
                    }}
                    labelFormatter={(d) => format(parseISO(String(d)), 'MMM d, yyyy')}
                  />
                  <Line
                    type="monotone"
                    dataKey="maxWeightKg"
                    stroke="#e86a2e"
                    strokeWidth={2}
                    dot={{ fill: '#e86a2e', r: 3 }}
                    name="Max Weight (kg)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Volume chart */}
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
            >
              <h3 className="text-sm font-semibold text-white mb-3">Total volume per session</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={selectedHistory} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#555', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(d) => format(parseISO(d), 'MMM d')}
                  />
                  <YAxis
                    tick={{ fill: '#555', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => formatVolume(v).replace(' kg', '')}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#252525',
                      border: '1px solid #333',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: 12,
                    }}
                    labelFormatter={(d) => format(parseISO(String(d)), 'MMM d, yyyy')}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any) => [`${formatVolume(Number(v))}`, 'Volume']}
                  />
                  <Bar dataKey="totalVolumeKg" fill="#e86a2e" radius={[3, 3, 0, 0]} name="Volume (kg)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
