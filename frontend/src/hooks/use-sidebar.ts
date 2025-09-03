'use client'

import { useState, useEffect } from 'react'

export function useSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024 // lg breakpoint
      setIsMobile(mobile)

      // Auto-close sidebar when screen size changes to desktop
      if (!mobile) {
        setIsOpen(false)
      }
    }

    // Check initial screen size
    checkScreenSize()

    // Add event listener for window resize
    window.addEventListener('resize', checkScreenSize)

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const toggle = () => setIsOpen(prev => !prev)
  const close = () => setIsOpen(false)
  const open = () => setIsOpen(true)

  return {
    isOpen,
    isMobile,
    toggle,
    close,
    open,
  }
}
