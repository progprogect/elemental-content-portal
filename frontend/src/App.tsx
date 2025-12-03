import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import TasksList from './pages/TasksList'
import TaskDetail from './pages/TaskDetail'
import TaskForm from './pages/TaskForm'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<TasksList />} />
          <Route path="/tasks/new" element={<TaskForm />} />
          <Route path="/tasks/:id/edit" element={<TaskForm />} />
          <Route path="/tasks/:id" element={<TaskDetail />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App

