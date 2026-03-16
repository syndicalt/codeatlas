import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import LandingPage from './components/LandingPage'
import GraphView from './components/GraphView'
import SharedGraphView from './components/SharedGraphView'
import AuthCallback from './components/AuthCallback'
import SettingsPage from './components/SettingsPage'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/graph/:projectId" element={<GraphView />} />
        <Route path="/shared/:shareId" element={<SharedGraphView />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
