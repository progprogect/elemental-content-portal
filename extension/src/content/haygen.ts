// Content Script for Haygen pages

interface HaygenResult {
  taskId: string
  resultUrl: string
  downloadUrl?: string
  status: 'success' | 'error'
  error?: string
}

// Function to extract share link and download link from Haygen page
function extractHaygenLinks(): { shareLink?: string; downloadLink?: string } {
  // Try multiple selectors to find share/download links
  // These selectors may need to be updated based on Haygen's actual DOM structure
  
  const shareLinkSelectors = [
    '[data-share-link]',
    'a[href*="share"]',
    '.share-link',
    '[class*="share"]',
  ]

  const downloadLinkSelectors = [
    '[data-download-link]',
    'a[href*="download"]',
    '.download-link',
    '[class*="download"]',
  ]

  let shareLink: string | undefined
  let downloadLink: string | undefined

  // Try to find share link
  for (const selector of shareLinkSelectors) {
    const element = document.querySelector(selector) as HTMLAnchorElement
    if (element?.href) {
      shareLink = element.href
      break
    }
  }

  // Try to find download link
  for (const selector of downloadLinkSelectors) {
    const element = document.querySelector(selector) as HTMLAnchorElement
    if (element?.href) {
      downloadLink = element.href
      break
    }
  }

  // Fallback: look for any link that might be a share/download link
  if (!shareLink || !downloadLink) {
    const links = document.querySelectorAll('a[href]')
    links.forEach((link) => {
      const href = (link as HTMLAnchorElement).href
      if (href.includes('share') && !shareLink) {
        shareLink = href
      }
      if (href.includes('download') && !downloadLink) {
        downloadLink = href
      }
    })
  }

  return { shareLink, downloadLink }
}

// Function to inject "Save to Portal" button
function injectSaveButton() {
  // Check if button already exists
  if (document.getElementById('elemental-save-button')) {
    return
  }

  // Try to find a suitable container for the button
  const containers = [
    document.querySelector('.actions'),
    document.querySelector('.toolbar'),
    document.querySelector('[class*="action"]'),
    document.querySelector('[class*="toolbar"]'),
    document.body,
  ]

  let container: Element | null = null
  for (const c of containers) {
    if (c) {
      container = c
      break
    }
  }

  if (!container) return

  const button = document.createElement('button')
  button.id = 'elemental-save-button'
  button.textContent = 'Save to Portal'
  button.style.cssText = `
    padding: 8px 16px;
    background: #0ea5e9;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    margin-left: 8px;
  `

  button.addEventListener('click', async () => {
    const { shareLink, downloadLink } = extractHaygenLinks()
    
    if (!shareLink) {
      alert('Could not find share link. Please copy it manually.')
      return
    }

    // Get task ID from storage
    const storage = await chrome.storage.local.get()
    const taskId = Object.keys(storage)
      .find(key => key.startsWith('haygen_task_'))
      ?.replace('haygen_task_', '')

    if (!taskId) {
      alert('Task ID not found. Please initiate generation from the portal.')
      return
    }

    const result: HaygenResult = {
      taskId,
      resultUrl: shareLink,
      downloadUrl,
      status: 'success',
    }

    // Send result to background script
    chrome.runtime.sendMessage({
      type: 'HAYGEN_RESULT',
      payload: result,
    })

    button.textContent = 'Saved!'
    button.disabled = true
    setTimeout(() => {
      button.textContent = 'Save to Portal'
      button.disabled = false
    }, 2000)
  })

  container.appendChild(button)
}

// Monitor DOM changes to inject button when page loads
const observer = new MutationObserver(() => {
  injectSaveButton()
})

observer.observe(document.body, {
  childList: true,
  subtree: true,
})

// Initial injection attempt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectSaveButton)
} else {
  injectSaveButton()
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_LINKS') {
    const links = extractHaygenLinks()
    sendResponse(links)
  }
  return true
})

