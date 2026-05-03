import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Workouts from './pages/Workouts'
import WorkoutDetail from './pages/WorkoutDetail'
import Exercises from './pages/Exercises'
import BodyHeatmap from './pages/BodyHeatmap'
import Bodyweight from './pages/Bodyweight'

export default function App() {
  return (
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
  )
}
