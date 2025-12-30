import { useState, useRef, useEffect, ReactNode } from 'react'

export interface MenuOption {
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
}

interface ContextMenuProps {
  options: MenuOption[]
  position?: 'right' | 'left'
  trigger: ReactNode
  className?: string
}

export default function ContextMenu({ options, position = 'right', trigger, className = '' }: ContextMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  const handleOptionClick = (onClick: () => void) => {
    onClick()
    setIsMenuOpen(false)
  }

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <div className={`relative ${className}`} ref={triggerRef}>
      <div onClick={handleTriggerClick}>
        {trigger}
      </div>
      {isMenuOpen && (
        <div
          ref={menuRef}
          className={`absolute ${position === 'right' ? 'right-0' : 'left-0'} mt-1 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionClick(option.onClick)}
                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors ${
                  option.variant === 'danger' ? 'text-red-600' : 'text-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

