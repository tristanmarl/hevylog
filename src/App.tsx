import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { FullPageSpinner } from './components/Spinner'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Workouts = lazy(() => import('./pages/Workouts'))
const WorkoutDetail = lazy(() => import('./pages/WorkoutDetail'))
const Exercises = lazy(() => import('./pages/Exercises'))
const BodyHeatmap = lazy(() => import('./pages/BodyHeatmap'))
const Bodyweight = lazy(() => import('./pages/Bodyweight'))

export default function App() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="workouts" element={<Workouts />} />
          <Route path="workouts/:id" element={<WorkoutDetail />} />
          <Route path="exercises" element={<Exercises />} />
          <Route path="body-heatmap" element={<BodyHeatmap />} />
          <Route path="bodyweight" element={<Bodyweight />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
