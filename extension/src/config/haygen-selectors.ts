// Configuration for Haygen DOM selectors
// Versioned to allow updates when Haygen changes their UI

export interface HaygenSelectors {
  version: string
  promptField: string[]
  fileInput: string[]
  shareLink: string[]
  downloadLink: string[]
  resultContainer: string[]
  uploadButton: string[]
}

export const SELECTORS: HaygenSelectors = {
  version: '1.0.0',
  
  // Selectors for prompt textarea/input field
  promptField: [
    'textarea[placeholder*="prompt" i]',
    'textarea[placeholder*="description" i]',
    'textarea[placeholder*="what" i]',
    'textarea[data-testid*="prompt"]',
    'textarea[id*="prompt"]',
    'textarea[name*="prompt"]',
    'textarea[class*="prompt"]',
    '.prompt-input textarea',
    '.prompt-field textarea',
    '#prompt-textarea',
    'textarea',
  ],
  
  // Selectors for file upload input
  fileInput: [
    'input[type="file"][accept*="image"]',
    'input[type="file"][accept*="video"]',
    'input[type="file"][accept*="media"]',
    'input[type="file"]',
    'input[data-testid*="upload"]',
    'input[data-testid*="file"]',
    'input[id*="upload"]',
    'input[id*="file"]',
    '.upload-input input[type="file"]',
    '.file-upload input[type="file"]',
  ],
  
  // Selectors for share/result link
  shareLink: [
    'a[href*="share"]',
    'a[href*="view"]',
    'a[data-share-link]',
    'a[data-testid*="share"]',
    '.share-link',
    '.share-button',
    '[class*="share"] a',
    'button[data-share-link]',
    '.result-link',
    '.public-link',
  ],
  
  // Selectors for download link
  downloadLink: [
    'a[href*="download"]',
    'a[data-download-link]',
    'a[data-testid*="download"]',
    '.download-link',
    '.download-button',
    '[class*="download"] a',
    'button[data-download-link]',
    'a[download]',
  ],
  
  // Selectors for result container (where results appear)
  resultContainer: [
    '.result-container',
    '.result-wrapper',
    '.video-result',
    '.output-container',
    '[class*="result"]',
    '[data-testid*="result"]',
    '.generated-content',
  ],
  
  // Selectors for upload button/area
  uploadButton: [
    'button[data-testid*="upload"]',
    'button[class*="upload"]',
    '.upload-button',
    '.upload-area',
    'label[for*="file"]',
    '.dropzone',
  ],
}

// Function to get selectors for a specific element type
export function getSelectors(type: keyof Omit<HaygenSelectors, 'version'>): string[] {
  return SELECTORS[type] || []
}

// Function to check if selectors need update
export function checkSelectorVersion(currentVersion: string): boolean {
  return SELECTORS.version !== currentVersion
}

