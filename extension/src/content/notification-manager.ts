// Notification manager for user feedback

interface NotificationOptions {
  duration?: number
  position?: 'top' | 'bottom' | 'center'
  type?: 'info' | 'success' | 'error' | 'warning'
}

class NotificationManager {
  private notificationId = 'elemental-notification'
  private notification: HTMLElement | null = null
  private hideTimeout: number | null = null

  /**
   * Show a notification overlay
   */
  show(message: string, options: NotificationOptions = {}): void {
    const {
      duration = 3000,
      position = 'top',
      type = 'info',
    } = options

    // Remove existing notification
    this.hide()

    // Create notification element
    const notification = document.createElement('div')
    notification.id = this.notificationId
    notification.textContent = message

    // Styles
    const styles: Partial<CSSStyleDeclaration> = {
      position: 'fixed',
      zIndex: '10000',
      padding: '12px 24px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      fontWeight: '500',
      color: '#fff',
      maxWidth: '400px',
      wordWrap: 'break-word',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
      cursor: 'pointer',
    }

    // Position
    switch (position) {
      case 'top':
        styles.top = '20px'
        styles.left = '50%'
        styles.transform = 'translateX(-50%)'
        break
      case 'bottom':
        styles.bottom = '20px'
        styles.left = '50%'
        styles.transform = 'translateX(-50%)'
        break
      case 'center':
        styles.top = '50%'
        styles.left = '50%'
        styles.transform = 'translate(-50%, -50%)'
        break
    }

    // Type colors
    switch (type) {
      case 'success':
        styles.backgroundColor = '#10b981'
        break
      case 'error':
        styles.backgroundColor = '#ef4444'
        break
      case 'warning':
        styles.backgroundColor = '#f59e0b'
        break
      case 'info':
      default:
        styles.backgroundColor = '#3b82f6'
        break
    }

    // Apply styles
    Object.assign(notification.style, styles)

    // Add click to dismiss
    notification.addEventListener('click', () => this.hide())

    // Append to body
    document.body.appendChild(notification)
    this.notification = notification

    // Auto-hide after duration
    if (duration > 0) {
      this.hideTimeout = window.setTimeout(() => {
        this.hide()
      }, duration)
    }
  }

  /**
   * Show progress notification
   */
  showProgress(message: string, progress?: number): void {
    let progressMessage = message
    if (progress !== undefined) {
      progressMessage = `${message} (${Math.round(progress)}%)`
    }
    this.show(progressMessage, {
      type: 'info',
      duration: 0, // Don't auto-hide progress
    })
  }

  /**
   * Show success notification
   */
  showSuccess(message: string): void {
    this.show(message, {
      type: 'success',
      duration: 3000,
    })
  }

  /**
   * Show error notification
   */
  showError(message: string, action?: () => void): void {
    let errorMessage = message
    if (action) {
      // Could add retry button here
      errorMessage = `${message} (Click to retry)`
    }
    
    const notification = this.show(errorMessage, {
      type: 'error',
      duration: 5000,
    })

    if (action && this.notification) {
      this.notification.addEventListener('click', action)
    }
  }

  /**
   * Hide notification
   */
  hide(): void {
    if (this.hideTimeout !== null) {
      window.clearTimeout(this.hideTimeout)
      this.hideTimeout = null
    }

    if (this.notification) {
      // Fade out animation
      this.notification.style.opacity = '0'
      this.notification.style.transform = this.notification.style.transform?.replace(
        /translate[XY]?\([^)]+\)/,
        'translateY(-20px)'
      )

      setTimeout(() => {
        if (this.notification && this.notification.parentNode) {
          this.notification.parentNode.removeChild(this.notification)
        }
        this.notification = null
      }, 300)
    }
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager()

