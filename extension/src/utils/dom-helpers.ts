// DOM manipulation utilities

/**
 * Wait for an element to appear in the DOM
 */
export function waitForElement(
  selector: string,
  timeout: number = 10000
): Promise<Element> {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector)
    if (element) {
      resolve(element)
      return
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector)
      if (element) {
        observer.disconnect()
        resolve(element)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    setTimeout(() => {
      observer.disconnect()
      reject(new Error(`Element not found: ${selector}`))
    }, timeout)
  })
}

/**
 * Find element using multiple selectors (tries each until one works)
 */
export function findElementByMultipleSelectors(
  selectors: string[]
): Element | null {
  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector)
      if (element) {
        return element
      }
    } catch (error) {
      // Invalid selector, continue to next
      continue
    }
  }
  return null
}

/**
 * Wait for element using multiple selectors
 */
export async function waitForElementBySelectors(
  selectors: string[],
  timeout: number = 10000
): Promise<Element> {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeout) {
    const element = findElementByMultipleSelectors(selectors)
    if (element) {
      return element
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  throw new Error(`Element not found with any selector: ${selectors.join(', ')}`)
}

/**
 * Trigger input and change events on an element
 */
export function triggerInputEvent(element: HTMLElement): void {
  // Create and dispatch input event
  const inputEvent = new Event('input', {
    bubbles: true,
    cancelable: true,
  })
  element.dispatchEvent(inputEvent)

  // Create and dispatch change event
  const changeEvent = new Event('change', {
    bubbles: true,
    cancelable: true,
  })
  element.dispatchEvent(changeEvent)

  // Also trigger focus/blur to simulate user interaction
  element.focus()
  element.blur()
}

/**
 * Set value on input/textarea and trigger events
 */
export function setInputValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
): void {
  element.value = value
  triggerInputEvent(element)
}

/**
 * Check if element is visible
 */
export function isElementVisible(element: Element): boolean {
  const style = window.getComputedStyle(element)
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.getBoundingClientRect().width > 0 &&
    element.getBoundingClientRect().height > 0
  )
}

/**
 * Scroll element into view
 */
export function scrollIntoView(element: Element): void {
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'center',
  })
}

