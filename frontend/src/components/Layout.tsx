import { ReactNode, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Bars3Icon } from '@heroicons/react/24/outline'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const isWelcomePage = location.pathname === '/'
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved ? JSON.parse(saved) : false
  })
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isSidebarCollapsed))
  }, [isSidebarCollapsed])

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed)
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!isWelcomePage && (
          <header className="bg-white border-b border-gray-200 flex-shrink-0">
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                  aria-label="Toggle menu"
                >
                  <Bars3Icon className="h-6 w-6" />
                </button>
                <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
                  Elemental Content Creation Portal
                </h1>
              </div>
            </div>
          </header>
        )}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}

