import { useState, useEffect } from 'react'
import { useExtension } from '../hooks/useExtension'
import Button from '../components/ui/Button'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  LinkIcon,
  PuzzlePieceIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

// Check if browser is Chrome
function isChromeBrowser(): boolean {
  if (typeof window === 'undefined') return false
  const userAgent = navigator.userAgent
  // Check for Chrome but exclude Edge and Opera
  return /Chrome/.test(userAgent) && !/Edg/.test(userAgent) && !/OPR/.test(userAgent) && !/Brave/.test(userAgent)
}

export default function Settings() {
  const { isInstalled } = useExtension()
  const [isChrome, setIsChrome] = useState(false)

  useEffect(() => {
    setIsChrome(isChromeBrowser())
  }, [])

  const handleInstallExtension = () => {
    // chrome:// protocol cannot be opened from web pages due to browser security
    // Just show instructions - user needs to navigate manually
    if (!isChromeBrowser()) {
      alert('Please use Google Chrome to install the extension. Download Chrome first, then return to this page.')
      return
    }
    // Show instructions - user needs to navigate to chrome://extensions/ manually
    alert('Please navigate to chrome://extensions/ in your browser address bar, enable Developer mode, then click "Load unpacked" and select the extension folder.')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="mt-2 text-gray-600">
          Follow these steps to get started with the Elemental Content Creation Portal
        </p>
      </div>

      <div className="space-y-6">
        {/* Step 1: Chrome Recommendation */}
        <div className="card">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              isChrome ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              {isChrome ? (
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold mb-2">1. Use Google Chrome</h3>
              {!isChrome ? (
                <>
                  <p className="text-gray-700 mb-4">
                    For the best experience with the browser extension, we recommend using Google Chrome. 
                    If you're not currently using Chrome, please download and install it.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => window.open('https://www.google.com/chrome/', '_blank')}
                    className="inline-flex items-center gap-2"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    Download Chrome
                  </Button>
                </>
              ) : (
                <p className="text-gray-700">
                  ✓ You're using Google Chrome. Perfect for working with the extension!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Step 2: HeyGen Authorization */}
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <LinkIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold mb-2">2. Authorize in HeyGen</h3>
              <p className="text-gray-700 mb-4">
                To generate content, you need to be authorized in HeyGen AI Content Creator. 
                Login credentials have been provided by the administrator.
              </p>
              <div className="space-y-3">
                <Button
                  variant="primary"
                  onClick={() => window.open('https://app.heygen.com/', '_blank')}
                  className="inline-flex items-center gap-2"
                >
                  <LinkIcon className="w-4 h-4" />
                  Open HeyGen
                </Button>
                <div className="text-sm text-gray-600 mt-3">
                  <p className="mb-1">
                    <strong>Don't have credentials?</strong> Contact the administrator:
                  </p>
                  <p className="font-mono bg-gray-50 px-2 py-1 rounded inline-block">
                    Telegram: @volknick
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Install Extension */}
        <div className="card">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              isInstalled ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              {isInstalled ? (
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              ) : (
                <PuzzlePieceIcon className="w-5 h-5 text-gray-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold mb-2">3. Install Browser Extension</h3>
              {isInstalled ? (
                <p className="text-gray-700">
                  ✓ Browser extension is installed and ready to use!
                </p>
              ) : (
                <>
                  <p className="text-gray-700 mb-4">
                    To easily generate content and save results to this system, install the browser extension.
                  </p>
                  <div className="space-y-4">
                    <Button
                      variant="primary"
                      onClick={handleInstallExtension}
                      className="inline-flex items-center gap-2"
                    >
                      <PuzzlePieceIcon className="w-4 h-4" />
                      Install Extension
                    </Button>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">Installation Instructions:</h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                        <li>Click the "Install Extension" button above to see detailed instructions</li>
                        <li>Navigate to <code className="bg-blue-100 px-1 rounded">chrome://extensions/</code> in your browser address bar</li>
                        <li>Enable "Developer mode" in the top right corner</li>
                        <li>Click "Load unpacked"</li>
                        <li>Navigate to and select the <code className="bg-blue-100 px-1 rounded">extension</code> folder from this project</li>
                        <li>The extension will be installed and ready to use</li>
                      </ol>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Step 4: Additional Information */}
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <InformationCircleIcon className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold mb-2">4. You're All Set!</h3>
              <p className="text-gray-700 mb-4">
                Continue using the portal as usual. The extension will automatically help you generate content 
                and save results back to the system.
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>Have questions?</strong> Contact the administrator:
                </p>
                <p className="font-mono bg-white px-2 py-1 rounded inline-block mt-2">
                  Telegram: @volknick
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

