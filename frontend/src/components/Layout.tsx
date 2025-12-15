import { ReactNode, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Bars3Icon } from '@heroicons/react/24/outline'
import Sidebar from './Sidebar'
import PromptSettingsWizard from './PromptSettingsWizard'
import VideoPromptModal from './VideoPromptModal'
import ImageGenerationModal from './ImageGenerationModal'
import { PromptSettings, ImageGenerationSettings } from '../types/prompt-settings'
import { imagesApi } from '../services/api/images'
import { useQueryClient } from '@tanstack/react-query'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const isWelcomePage = location.pathname === '/'
  const queryClient = useQueryClient()
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved ? JSON.parse(saved) : false
  })
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isGlobalWizardOpen, setIsGlobalWizardOpen] = useState(false)
  const [isGlobalPromptModalOpen, setIsGlobalPromptModalOpen] = useState(false)
  const [globalPromptSettings, setGlobalPromptSettings] = useState<PromptSettings | undefined>()
  const [isImageGenerationModalOpen, setIsImageGenerationModalOpen] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [isSavingImage, setIsSavingImage] = useState(false)

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
        onOpenVideoWizard={() => setIsGlobalWizardOpen(true)}
        onOpenImageGeneration={() => setIsImageGenerationModalOpen(true)}
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

      {/* Global Prompt Settings Wizard for sidebar video generation */}
      <PromptSettingsWizard
        isOpen={isGlobalWizardOpen}
        onClose={() => {
          setIsGlobalWizardOpen(false)
        }}
        onContinue={() => {}}
        onSkipAll={() => {}}
        contentType="video"
        onShowPrompt={(settings: PromptSettings) => {
          setGlobalPromptSettings(settings)
          setIsGlobalWizardOpen(false)
          setIsGlobalPromptModalOpen(true)
        }}
      />

      {/* Global Video Prompt Modal for sidebar video generation */}
      <VideoPromptModal
        isOpen={isGlobalPromptModalOpen}
        onClose={() => {
          setIsGlobalPromptModalOpen(false)
          setGlobalPromptSettings(undefined)
        }}
        settings={globalPromptSettings}
        contentType="video"
      />

      {/* Global Image Generation Modal for sidebar image generation */}
      <ImageGenerationModal
        isOpen={isImageGenerationModalOpen}
        onClose={() => {
          setIsImageGenerationModalOpen(false)
        }}
        mode="standalone"
        isLoading={isGeneratingImage}
        isSaving={isSavingImage}
        onGenerate={async (settings: ImageGenerationSettings) => {
          setIsGeneratingImage(true)
          try {
            const result = await imagesApi.generateStandaloneImage(settings)
            setIsGeneratingImage(false)
            return result
          } catch (error) {
            setIsGeneratingImage(false)
            throw error
          }
        }}
        onRegenerate={async (settings: ImageGenerationSettings) => {
          setIsGeneratingImage(true)
          try {
            const result = await imagesApi.generateStandaloneImage(settings)
            setIsGeneratingImage(false)
            return result
          } catch (error) {
            setIsGeneratingImage(false)
            throw error
          }
        }}
        onSaveResult={async (result: { assetUrl: string; assetPath: string }) => {
          setIsSavingImage(true)
          try {
            await imagesApi.addToGallery({
              assetUrl: result.assetUrl,
              assetPath: result.assetPath,
              source: 'nanobanana',
            })
            // Invalidate gallery query to refresh the gallery
            queryClient.invalidateQueries({ queryKey: ['gallery'] })
            setIsSavingImage(false)
          } catch (error) {
            setIsSavingImage(false)
            throw error
          }
        }}
      />
    </div>
  )
}

