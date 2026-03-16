import { Routes, Route } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import GraphView from './components/GraphView'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/graph/:projectId" element={<GraphView />} />
    </Routes>
  )
}

export default App
