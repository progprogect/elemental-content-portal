import { useState, useEffect } from 'react'
import Button from './ui/Button'
import PromptSettingsStep from './PromptSettingsStep'
import { PromptSettings, WizardStep } from '../types/prompt-settings'

interface PromptSettingsWizardProps {
  isOpen: boolean
  onClose: () => void
  onContinue: (settings: PromptSettings) => void
  onSkipAll: () => void
  contentType?: string
}

const wizardSteps: WizardStep[] = [
  {
    id: 'goal',
    title: 'Goal Description',
    fields: ['goalDescription'],
  },
  {
    id: 'basic',
    title: 'Basic Settings',
    fields: ['orientation', 'duration', 'language'],
  },
  {
    id: 'video',
    title: 'Video Settings',
    fields: ['movement', 'sceneTransitions', 'background'],
  },
  {
    id: 'audio',
    title: 'Audio & Text',
    fields: ['voice', 'hasText', 'textContent', 'textToRead'],
  },
  {
    id: 'additional',
    title: 'Additional Requirements',
    fields: ['additionalRequirements'],
  },
]

export default function PromptSettingsWizard({
  isOpen,
  onClose,
  onContinue,
  onSkipAll,
  contentType,
}: PromptSettingsWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [settings, setSettings] = useState<PromptSettings>({})

  const handleFieldChange = (field: keyof PromptSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleNext = () => {
    if (currentStep < wizardSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleContinue()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkipStep = () => {
    if (currentStep < wizardSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleContinue()
    }
  }

  const handleContinue = () => {
    // Filter out empty values
    const filteredSettings: PromptSettings = {}
    Object.entries(settings).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // For strings, check if trimmed value is not empty
        if (typeof value === 'string') {
          if (value.trim() !== '') {
            ;(filteredSettings as any)[key] = value
          }
        } else {
          // For booleans and other types, include as is
          ;(filteredSettings as any)[key] = value
        }
      }
    })
    onContinue(filteredSettings)
    handleClose()
  }

  const handleSkipAll = () => {
    onSkipAll()
    handleClose()
  }

  const handleClose = () => {
    setCurrentStep(0)
    setSettings({})
    onClose()
  }

  const currentStepData = wizardSteps[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === wizardSteps.length - 1
  const progress = ((currentStep + 1) / wizardSteps.length) * 100

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className={isOpen ? 'fixed inset-0 z-50 overflow-y-auto' : 'hidden'}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        />
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Configure Prompt Settings</h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-6">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>
                    Step {currentStep + 1} of {wizardSteps.length}
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Step content */}
              <PromptSettingsStep
                stepId={currentStepData.id}
                title={currentStepData.title}
                fields={currentStepData.fields}
                settings={settings}
                onChange={handleFieldChange}
                contentType={contentType}
              />
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 w-full">
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleSkipAll}>
                  Skip All
                </Button>
                {!isFirstStep && (
                  <Button variant="secondary" onClick={handlePrevious}>
                    Previous
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {!isLastStep && (
                  <Button variant="secondary" onClick={handleSkipStep}>
                    Skip Step
                  </Button>
                )}
                <Button variant="primary" onClick={handleNext}>
                  {isLastStep ? 'Continue' : 'Next'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

