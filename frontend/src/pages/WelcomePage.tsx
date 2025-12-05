import { useQuery } from '@tanstack/react-query'
import { taskListsApi } from '../services/api/tasks'
import { 
  SparklesIcon,
  DocumentTextIcon,
  VideoCameraIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export default function WelcomePage() {
  const { data: lists } = useQuery({
    queryKey: ['task-lists'],
    queryFn: taskListsApi.getLists,
  })

  const hasProjects = lists && lists.length > 0

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to Elemental Content Creation Portal
        </h1>
        <p className="text-lg text-gray-600">
          A powerful platform for managing your content plan and generating marketing content through AI services.
        </p>
      </div>

      <div className="space-y-6">
        {/* Overview */}
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <SparklesIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold mb-3">What is this portal?</h2>
              <p className="text-gray-700 mb-3">
                The Elemental Content Creation Portal helps you organize, plan, and generate marketing content 
                efficiently. Create tasks, manage your content calendar, and leverage AI-powered tools to produce 
                high-quality videos, images, and other marketing materials.
              </p>
              <p className="text-gray-700">
                All your content projects are organized in a flexible table format, allowing you to track progress, 
                manage assets, and collaborate seamlessly.
              </p>
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold mb-3">Key Features</h2>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <DocumentTextIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Task Management:</strong> Create and organize content tasks in a flexible table view with custom columns and fields.</span>
                </li>
                <li className="flex items-start gap-2">
                  <VideoCameraIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span><strong>AI Content Generation:</strong> Generate videos and other content through integrated AI services like HeyGen.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Project Organization:</strong> Group tasks into projects for better organization and workflow management.</span>
                </li>
                <li className="flex items-start gap-2">
                  <SparklesIcon className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Publication Tracking:</strong> Track content publications across different platforms and manage results.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <SparklesIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold mb-3">Getting Started</h2>
              {hasProjects ? (
                <p className="text-gray-700">
                  Select a project from the sidebar to view and manage your tasks. You can create new tasks, 
                  organize them by scheduled dates, and generate content using AI-powered tools.
                </p>
              ) : (
                <p className="text-gray-700">
                  Start by creating your first project using the "New Project" button in the sidebar. 
                  Then add tasks to organize your content creation workflow.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

