'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  visible: boolean
  onHide: () => void
  duration?: number
}

export default function Toast({
  message,
  visible,
  onHide,
  duration = 3000,
}: ToastProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (visible) {
      setShow(true)
      const t = setTimeout(() => {
        setShow(false)
        setTimeout(onHide, 300)
      }, duration)
      return () => clearTimeout(t)
    }
  }, [visible, duration, onHide])

  if (!visible && !show) return null

  return (
    <div
      className={`fixed top-12 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 rounded-btn bg-negative text-white text-sm font-medium shadow-lg transition-all duration-300 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      {message}
    </div>
  )
}
