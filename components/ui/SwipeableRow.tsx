'use client'

import { useRef, useState } from 'react'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface SwipeableRowProps {
  children: React.ReactNode
  onTap: () => void
  onDelete: () => void
}

export default function SwipeableRow({
  children,
  onTap,
  onDelete,
}: SwipeableRowProps) {
  const [offset, setOffset] = useState(0)
  const [locked, setLocked] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const startX = useRef(0)
  const startY = useRef(0)
  const swiping = useRef(false)
  const decided = useRef(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    swiping.current = false
    decided.current = false
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    if (!decided.current) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) {
        decided.current = true
        return
      }
      if (Math.abs(dx) > 5) {
        decided.current = true
        swiping.current = true
      }
      return
    }

    if (!swiping.current) return

    const base = locked ? 80 : 0
    const raw = base + dx
    setOffset(Math.max(0, Math.min(raw, 120)))
  }

  const handleTouchEnd = () => {
    if (swiping.current) {
      if (offset > 80) {
        setLocked(true)
        setOffset(80)
      } else {
        setLocked(false)
        setOffset(0)
      }
    } else if (!decided.current || !swiping.current) {
      if (locked) {
        setLocked(false)
        setOffset(0)
      } else {
        onTap()
      }
    }
  }

  const handleDeleteTap = () => {
    setShowConfirm(true)
  }

  const handleConfirm = () => {
    setShowConfirm(false)
    setLocked(false)
    setOffset(0)
    onDelete()
  }

  const handleCancel = () => {
    setShowConfirm(false)
    setLocked(false)
    setOffset(0)
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-btn">
        {/* Red delete background */}
        <button
          className="absolute inset-0 bg-negative flex items-center gap-2 pl-4 text-white text-xs font-semibold rounded-btn"
          onClick={handleDeleteTap}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Eliminar
        </button>

        {/* Content */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: `translateX(${offset}px)`,
            transition: swiping.current ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          {children}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        message="¿Eliminar este registro?"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  )
}
