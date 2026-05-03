import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'
import { fetchAllWorkouts } from '../api/hevy'
import type { Workout } from '../types/hevy'
import {
  getWeeklyStats,
  getWeeklyWorkoutCounts,
  getPeriodStats,
  getPeriodBarData,
  computeWorkoutVolume,
  computeWorkoutDuration,
  formatDuration,
  formatVolume,
  percentChange,
  getPRsInPeriod,
  getWeeklyMuscleFrequency,
  detectWorkoutSplit,
  getConsistencyStreak,
  getWeeklyGoalProgress,
  getMuscleNeglectAlerts,
  getMuscleBalance,
  getTrainTodaySuggestion,
  getConsecutiveTrainingDays,
  getMilestones,
  getProgressionSuggestions,
  estimateOneRepMax,
} from '../utils/stats'
import StatCard from '../components/StatCard'
import MusclePill from '../components/MusclePill'
import Tooltip from '../components/Tooltip'
import { FullPageSpinner } from '../components/Spinner'
import ErrorBanner from '../components/ErrorBanner'

type Period = 'week' | '30d' | '90d' | '365d'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'This Week' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: '365d', label: '365 Days' },
]

const MUSCLE_CATEGORY: Record<string, string> = {
  chest: 'push', shoulders: 'push', triceps: 'push',
  back: 'pull', biceps: 'pull',
  legs: 'lower', core: 'core',
}

const SPLIT_TIPS: Record<string, string> = {
  'Full Body': 'Great for beginners — trains all muscles each session.',
  'Upper / Lower': 'Splits training into upper body days and lower body days.',
  'Push / Pull / Legs': 'Push (chest/shoulders/triceps), Pull (back/biceps), and Legs on separate days.',
  'Bro Split': 'One muscle group per day. Works, but beginners often progress faster with Full Body or Upper/Lower.',
}

const WORKOUT_MILESTONE_TARGETS: Record<string, number> = {
  first: 1, w10: 10, w25: 25, w50: 50, w100: 100, w200: 200,
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>(
    () => (localStorage.getItem('dashboard-period') as Period) ?? 'week',
  )
  const [weeklyGoal, setWeeklyGoal] = useState<number>(
    () => Number(localStorage.getItem('weekly-goal') ?? 3),
  )
  const [overtainingDismissed, setOvertainingDismissed] = useState(false)

  const handlePeriodChange = (p: Period) => {
    setPeriod(p)
    localStorage.setItem('dashboard-period', p)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAllWorkouts()
      setWorkouts(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load workouts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <FullPageSpinner />
  if (error) return <ErrorBanner message={error} onRetry={load} />

  const isWeek = period === 'week'
  const periodDays = period === 'week' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365

  const current = isWeek ? getWeeklyStats(workouts, 0) : getPeriodStats(workouts, periodDays, 0)
  const previous = isWeek ? getWeeklyStats(workouts, 1) : getPeriodStats(workouts, periodDays, 1)

  const barData = isWeek
    ? getWeeklyWorkoutCounts(workouts, 12).map((d) => ({ label: d.weekLabel, count: d.count }))
    : getPeriodBarData(workouts, period === '30d' ? 7 : period === '90d' ? 14 : 30, 12)

  const recentWorkouts = workouts.slice(0, 3)

  const volumeChange = percentChange(current.totalVolumeKg, previous.totalVolumeKg)
  const durationChange = percentChange(current.durationMinutes, previous.durationMinutes)
  const countChange = percentChange(current.workoutCount, previous.workoutCount)

  function trendDir(val: number | null): 'up' | 'down' | 'neutral' {
    if (val === null) return 'neutral'
    return val > 0 ? 'up' : val < 0 ? 'down' : 'neutral'
  }

  function trendLabel(val: number | null): string | undefined {
    if (val === null) return undefined
    return `${val > 0 ? '+' : ''}${val}%`
  }

  const periodLabel = isWeek ? 'this week' : `last ${period}`
  const compLabel = isWeek ? 'vs last week' : `vs prev ${period}`

  const chartTitle = isWeek
    ? 'Workouts per week (last 12 weeks)'
    : period === '30d' ? 'Workouts per week (last 12 weeks)'
    : period === '90d' ? 'Workouts per fortnight (last 24 weeks)'
    : 'Workouts per month (last 12 months)'

  const prs = getPRsInPeriod(workouts, periodDays)
  const muscleFrequency = getWeeklyMuscleFrequency(workouts, isWeek ? 1 : periodDays / 7)
  const split = detectWorkoutSplit(workouts)
  const streak = getConsistencyStreak(workouts)
  const weeklyGoalProgress = getWeeklyGoalProgress(workouts, weeklyGoal)
  const neglectAlerts = getMuscleNeglectAlerts(workouts, 7)
  const muscleBalance = getMuscleBalance(workouts, 4)
  const trainSuggestion = getTrainTodaySuggestion(workouts)
  const consecutiveDays = getConsecutiveTrainingDays(workouts)
  const milestones = getMilestones(workouts)
  const progressionSuggestions = getProgressionSuggestions(workouts, 4)

  const nextMilestone = milestones.find((m) => !m.achieved)
  const achievedCount = milestones.filter((m) => m.achieved).length

  const hasMuscleData =
    muscleFrequency.length > 0 ||
    neglectAlerts.length > 0 ||
    muscleBalance.pushSets + muscleBalance.pullSets + muscleBalance.lowerSets > 0

  return (
    <div className="space-y-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            {split !== 'Unknown' && (
              <Tooltip text={SPLIT_TIPS[split] ?? split}>
                <span
                  className="text-xs px-2 py-0.5 rounded cursor-default"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', color: '#666' }}
                >
                  {split}
                </span>
              </Tooltip>
            )}
          </div>
          <p className="text-sm mt-1" style={{ color: '#999' }}>
            {isWeek
              ? (current as ReturnType<typeof getWeeklyStats>).weekLabel
              : (current as ReturnType<typeof getPeriodStats>).label}
          </p>
        </div>
        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{ border: '1px solid #333', backgroundColor: '#1a1a1a' }}
        >
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handlePeriodChange(key)}
              className="px-3 py-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: period === key ? '#e86a2e' : 'transparent',
                color: period === key ? '#fff' : '#888',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            title: 'Workouts',
            value: current.workoutCount,
            trend: trendDir(countChange),
            trendValue: trendLabel(countChange),
          },
          {
            title: 'Volume',
            hint: 'Total weight moved: sets × reps × weight across all exercises. Trending up over time means you\'re getting stronger.',
            value: formatVolume(current.totalVolumeKg),
            trend: trendDir(volumeChange),
            trendValue: trendLabel(volumeChange),
          },
          {
            title: 'Duration',
            value: formatDuration(current.durationMinutes),
            trend: trendDir(durationChange),
            trendValue: trendLabel(durationChange),
          },
        ].map((card) => (
          <div
            key={card.title}
            className="cursor-pointer rounded-lg transition-all"
            onClick={() => navigate('/workouts')}
            onMouseEnter={(e) => {
              ;(e.currentTarget.firstChild as HTMLElement | null)?.setAttribute(
                'style',
                'background-color: #1a1a1a; border-color: #e86a2e',
              )
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget.firstChild as HTMLElement | null)?.setAttribute(
                'style',
                'background-color: #1a1a1a; border-color: #2a2a2a',
              )
            }}
          >
            <StatCard
              title={card.title}
              hint={card.hint}
              value={card.value}
              subtitle={periodLabel}
              trend={card.trend}
              trendValue={card.trendValue}
              secondaryLabel={compLabel}
            />
          </div>
        ))}
      </div>

      {/* Overtraining alert */}
      {consecutiveDays >= 6 && !overtainingDismissed && (
        <div
          className="rounded-lg p-4 flex items-start justify-between gap-4"
          style={{ backgroundColor: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.3)' }}
        >
          <div className="flex items-start gap-3">
            <span style={{ fontSize: 18 }}>⚠️</span>
            <p className="text-sm" style={{ color: '#facc15' }}>
              You've trained {consecutiveDays} days in a row. Consider a rest day — muscles grow during
              recovery, not during training.
            </p>
          </div>
          <button
            onClick={() => setOvertainingDismissed(true)}
            className="text-xs shrink-0"
            style={{ color: '#666' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Train Today suggestion */}
      {trainSuggestion && (
        <div
          className="rounded-lg p-5"
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
        >
          <h2 className="text-base font-semibold text-white mb-3">Train Today?</h2>
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex flex-wrap gap-2">
              {trainSuggestion.muscles[0] === 'rest' ? (
                <span
                  className="text-sm px-3 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: 'rgba(250,204,21,0.15)',
                    color: '#facc15',
                    border: '1px solid rgba(250,204,21,0.3)',
                  }}
                >
                  Rest Day Recommended
                </span>
              ) : (
                trainSuggestion.muscles.map((m) => (
                  <span
                    key={m}
                    className="text-sm px-3 py-1 rounded-full font-medium capitalize"
                    style={{
                      backgroundColor: 'rgba(232,106,46,0.15)',
                      color: '#e86a2e',
                      border: '1px solid rgba(232,106,46,0.3)',
                    }}
                  >
                    {m}
                  </span>
                ))
              )}
            </div>
            <p className="text-sm" style={{ color: '#888' }}>{trainSuggestion.reason}</p>
          </div>
        </div>
      )}

      {/* Weekly Goal + Streak */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          className="rounded-lg p-5"
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-white">Weekly Goal</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const next = Math.max(1, weeklyGoal - 1)
                  setWeeklyGoal(next)
                  localStorage.setItem('weekly-goal', String(next))
                }}
                className="w-7 h-7 flex items-center justify-center rounded text-sm font-bold"
                style={{ backgroundColor: '#252525', color: '#888', border: '1px solid #333' }}
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-semibold text-white">{weeklyGoal}</span>
              <button
                onClick={() => {
                  const next = Math.min(7, weeklyGoal + 1)
                  setWeeklyGoal(next)
                  localStorage.setItem('weekly-goal', String(next))
                }}
                className="w-7 h-7 flex items-center justify-center rounded text-sm font-bold"
                style={{ backgroundColor: '#252525', color: '#888', border: '1px solid #333' }}
              >
                +
              </button>
            </div>
          </div>
          <div className="rounded-full overflow-hidden h-2.5 mb-2" style={{ backgroundColor: '#252525' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${weeklyGoalProgress.pct * 100}%`, backgroundColor: '#e86a2e' }}
            />
          </div>
          {weeklyGoalProgress.done >= weeklyGoal ? (
            <p className="text-sm font-medium" style={{ color: '#4ade80' }}>Goal reached! 🎯</p>
          ) : (
            <p className="text-sm" style={{ color: '#888' }}>
              {weeklyGoalProgress.done} of {weeklyGoalProgress.goal} workouts this week
            </p>
          )}
        </div>

        <div
          className="rounded-lg p-5 flex flex-col justify-center"
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
        >
          <p className="text-4xl font-bold" style={{ color: streak >= 4 ? '#e86a2e' : '#fff' }}>
            {streak}
          </p>
          <p className="text-sm font-semibold text-white mt-1">Week Streak</p>
          <p className="text-xs mt-0.5" style={{ color: '#666' }}>consecutive weeks training</p>
        </div>
      </div>

      {/* Recent Workouts */}
      {recentWorkouts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-white">Recent Workouts</h2>
            <button
              onClick={() => navigate('/workouts')}
              className="text-xs"
              style={{ color: '#e86a2e' }}
            >
              View all →
            </button>
          </div>
          <div className="space-y-2">
            {recentWorkouts.map((workout) => {
              const duration = computeWorkoutDuration(workout)
              const volume = computeWorkoutVolume(workout)
              const muscles = Array.from(new Set(workout.exercises.flatMap((e) => e.muscle_groups ?? [])))
              return (
                <button
                  key={workout.id}
                  onClick={() => navigate(`/workouts/${workout.id}`)}
                  className="w-full text-left rounded-lg p-4 transition-colors"
                  style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#222'
                    e.currentTarget.style.borderColor = '#333'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#1a1a1a'
                    e.currentTarget.style.borderColor = '#2a2a2a'
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{workout.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#666' }}>
                        {format(parseISO(workout.start_time), 'EEE, MMM d yyyy')} &middot;{' '}
                        {formatDuration(duration)} &middot; {formatVolume(volume)}
                      </p>
                    </div>
                    {muscles.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-end shrink-0">
                        {muscles.slice(0, 3).map((m) => (
                          <MusclePill key={m} muscle={m} small />
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* PRs with 1RM estimate */}
      {prs.length > 0 && (
        <div
          className="rounded-lg p-5"
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-semibold text-white">PRs this period</h2>
            <Tooltip text="Personal records — your heaviest lift for each exercise this period. Consistent new PRs = you're getting stronger.">
              <span className="text-xs cursor-default" style={{ color: '#555' }}>ⓘ</span>
            </Tooltip>
          </div>
          <div className="space-y-3">
            {prs.slice(0, 5).map((pr) => {
              const orm = estimateOneRepMax(pr.weightKg, pr.reps)
              return (
                <div
                  key={`${pr.exerciseTitle}-${pr.date}`}
                  className="flex items-start justify-between text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-white font-medium truncate block">{pr.exerciseTitle}</span>
                    <span className="text-xs" style={{ color: '#666' }}>
                      {format(parseISO(pr.date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span className="font-semibold" style={{ color: '#e86a2e' }}>
                      {pr.weightKg} kg × {pr.reps}
                    </span>
                    {orm > 0 && (
                      <Tooltip text="Estimated 1-rep max (Epley formula) — the heaviest single rep you could theoretically do right now.">
                        <span className="ml-2 text-xs cursor-default" style={{ color: '#666' }}>
                          ~{orm} kg 1RM
                        </span>
                      </Tooltip>
                    )}
                    {pr.previousBestKg > 0 && (
                      <span className="block text-xs mt-0.5" style={{ color: '#555' }}>
                        ↑ prev {pr.previousBestKg} kg
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
            {prs.length > 5 && (
              <p className="text-xs pt-1" style={{ color: '#555' }}>+{prs.length - 5} more</p>
            )}
          </div>
        </div>
      )}

      {/* Next Session — progressive overload suggestions */}
      {progressionSuggestions.length > 0 && (
        <div
          className="rounded-lg p-5"
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-semibold text-white">Next Session</h2>
            <Tooltip text="Progressive overload: adding a little more weight each session is the #1 driver of getting stronger. Try the suggested weight — if it feels easy, go heavier.">
              <span className="text-xs cursor-default" style={{ color: '#555' }}>ⓘ</span>
            </Tooltip>
          </div>
          <div className="space-y-2.5">
            {progressionSuggestions.map((s) => (
              <div key={s.exerciseTitle} className="flex items-center justify-between text-sm">
                <span className="text-white font-medium truncate flex-1 min-w-0 mr-4">
                  {s.exerciseTitle}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span style={{ color: '#555' }}>{s.lastWeightKg} kg</span>
                  {s.isPlateaued ? (
                    <Tooltip text="Same weight for 3+ sessions. Try changing the rep range (e.g. 3×5 instead of 3×8) or take a deload week with lighter weight.">
                      <span
                        className="text-xs px-2 py-0.5 rounded cursor-default"
                        style={{
                          backgroundColor: 'rgba(250,204,21,0.1)',
                          color: '#facc15',
                          border: '1px solid rgba(250,204,21,0.2)',
                        }}
                      >
                        plateau
                      </span>
                    </Tooltip>
                  ) : (
                    <>
                      <span style={{ color: '#444' }}>→</span>
                      <span className="font-semibold" style={{ color: '#4ade80' }}>
                        try {s.suggestedWeightKg} kg
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Muscle Health — consolidated */}
      {hasMuscleData && (
        <div
          className="rounded-lg p-5"
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
        >
          <h2 className="text-base font-semibold text-white mb-4">Muscle Health</h2>

          {/* Push / Pull / Lower balance */}
          {muscleBalance.pushSets + muscleBalance.pullSets + muscleBalance.lowerSets > 0 &&
            (() => {
              const total =
                muscleBalance.pushSets + muscleBalance.pullSets + muscleBalance.lowerSets
              const pushPct = Math.round((muscleBalance.pushSets / total) * 100)
              const pullPct = Math.round((muscleBalance.pullSets / total) * 100)
              const lowerPct = 100 - pushPct - pullPct
              return (
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-medium" style={{ color: '#888' }}>
                      Push / Pull / Lower balance (last 4 weeks)
                    </p>
                    <Tooltip text="Healthy training has roughly equal push and pull sets, plus regular leg work. Imbalances build up slowly and can cause shoulder or knee issues over time.">
                      <span className="text-xs cursor-default" style={{ color: '#555' }}>ⓘ</span>
                    </Tooltip>
                  </div>
                  <div
                    className="flex rounded-full overflow-hidden h-4"
                    style={{ backgroundColor: '#252525' }}
                  >
                    {pushPct > 0 && (
                      <div
                        className="h-full flex items-center justify-center text-xs font-medium"
                        style={{
                          width: `${pushPct}%`,
                          backgroundColor: '#e86a2e',
                          minWidth: pushPct > 15 ? undefined : 0,
                        }}
                      >
                        {pushPct > 15 ? `Push ${muscleBalance.pushSets}` : ''}
                      </div>
                    )}
                    {pullPct > 0 && (
                      <div
                        className="h-full flex items-center justify-center text-xs font-medium"
                        style={{
                          width: `${pullPct}%`,
                          backgroundColor: '#60a5fa',
                          minWidth: pullPct > 15 ? undefined : 0,
                        }}
                      >
                        {pullPct > 15 ? `Pull ${muscleBalance.pullSets}` : ''}
                      </div>
                    )}
                    {lowerPct > 0 && (
                      <div
                        className="h-full flex items-center justify-center text-xs font-medium"
                        style={{
                          width: `${lowerPct}%`,
                          backgroundColor: '#4ade80',
                          minWidth: lowerPct > 15 ? undefined : 0,
                        }}
                      >
                        {lowerPct > 15 ? `Lower ${muscleBalance.lowerSets}` : ''}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4 mt-1.5">
                    <span className="text-xs" style={{ color: '#e86a2e' }}>
                      Push {muscleBalance.pushSets} sets
                    </span>
                    <span className="text-xs" style={{ color: '#60a5fa' }}>
                      Pull {muscleBalance.pullSets} sets
                    </span>
                    <span className="text-xs" style={{ color: '#4ade80' }}>
                      Lower {muscleBalance.lowerSets} sets
                    </span>
                  </div>
                  {muscleBalance.warning && (
                    <p className="text-xs mt-2" style={{ color: '#e86a2e' }}>
                      {muscleBalance.warning}
                    </p>
                  )}
                </div>
              )
            })()}

          {/* Overdue muscles */}
          {neglectAlerts.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-medium mb-2" style={{ color: '#888' }}>Overdue</p>
              <div className="space-y-1.5">
                {neglectAlerts.slice(0, 2).map((alert) => (
                  <div
                    key={alert.muscle}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="capitalize text-white font-medium">{alert.muscle}</span>
                    <span
                      style={{ color: alert.daysSince > 14 ? '#f87171' : '#facc15' }}
                    >
                      {alert.daysSince}d since last trained
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Frequency grid with target progress bars */}
          {muscleFrequency.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-medium" style={{ color: '#888' }}>
                  Sets per week by muscle
                </p>
                <Tooltip text="Aim for 10–20 sets/week per muscle group to see consistent growth. Under 5 = likely not enough stimulus. The bar fills to 10 sets (minimum effective dose).">
                  <span className="text-xs cursor-default" style={{ color: '#555' }}>ⓘ</span>
                </Tooltip>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {muscleFrequency.map((mf) => {
                  const category = MUSCLE_CATEGORY[mf.muscle] ?? ''
                  const barColor =
                    mf.avgSetsPerWeek >= 10
                      ? '#4ade80'
                      : mf.avgSetsPerWeek >= 5
                      ? '#facc15'
                      : '#f87171'
                  const targetPct = Math.min(1, mf.avgSetsPerWeek / 10)
                  return (
                    <div
                      key={mf.muscle}
                      className="rounded-lg px-3 py-2.5"
                      style={{ backgroundColor: '#252525', border: '1px solid #333' }}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-sm font-medium text-white capitalize">{mf.muscle}</p>
                        {category && (
                          <span className="text-xs capitalize" style={{ color: '#555' }}>
                            {category}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium" style={{ color: barColor }}>
                        {mf.avgSetsPerWeek} sets/wk
                      </p>
                      <div
                        className="mt-1.5 rounded-full h-1"
                        style={{ backgroundColor: '#444' }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${targetPct * 100}%`, backgroundColor: barColor }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity chart — workouts over time */}
      <div
        className="rounded-lg p-5"
        style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
      >
        <h2 className="text-base font-semibold text-white mb-4">{chartTitle}</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#666', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#666', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: '#252525',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#fff',
              }}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Bar dataKey="count" fill="#e86a2e" radius={[4, 4, 0, 0]} name="Workouts" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Milestone teaser */}
      {nextMilestone && (
        <div
          className="rounded-lg p-4 flex items-center justify-between"
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
        >
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 20 }}>🏆</span>
            <div>
              <p className="text-sm font-medium text-white">Next: {nextMilestone.label}</p>
              {WORKOUT_MILESTONE_TARGETS[nextMilestone.id] != null && (
                <p className="text-xs" style={{ color: '#666' }}>
                  {WORKOUT_MILESTONE_TARGETS[nextMilestone.id] - workouts.length} workout
                  {WORKOUT_MILESTONE_TARGETS[nextMilestone.id] - workouts.length !== 1 ? 's' : ''}{' '}
                  away
                </p>
              )}
            </div>
          </div>
          <p className="text-xs" style={{ color: '#555' }}>
            {achievedCount}/{milestones.length} achieved
          </p>
        </div>
      )}
    </div>
  )
}
