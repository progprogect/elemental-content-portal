import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import WelcomePage from './pages/WelcomePage'
import TasksList from './pages/TasksList'
import TaskDetail from './pages/TaskDetail'
import TaskForm from './pages/TaskForm'
import Settings from './pages/Settings'
import LearningMaterials from './pages/LearningMaterials'
import TrainingTopicDetail from './pages/TrainingTopicDetail'
import Gallery from './pages/Gallery'
import StockMedia from './pages/StockMedia'
import SceneGeneration from './pages/SceneGeneration'
import SceneGenerationDetail from './pages/SceneGenerationDetail'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/lists/:listId" element={<TasksList />} />
          <Route path="/tasks/new" element={<TaskForm />} />
          <Route path="/tasks/:id/edit" element={<TaskForm />} />
          <Route path="/tasks/:id" element={<TaskDetail />} />
          <Route path="/learning-materials" element={<LearningMaterials />} />
          <Route path="/learning-materials/:id" element={<TrainingTopicDetail />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/stock-media" element={<StockMedia />} />
              <Route path="/scene-generation" element={<SceneGeneration />} />
              <Route path="/scene-generation/:id" element={<SceneGenerationDetail />} />
              <Route path="/scene-generation/:id/review-scenario" element={<ScenarioReview />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App

