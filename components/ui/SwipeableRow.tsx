'use client'

import { useRef, useState, useCallback } from 'react'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface SwipeableRowProps {
  children: React.ReactNode
  onEdit?: () => void
  onDelete: () => void
  deletable?: boolean
}

export default function SwipeableRow({
  children,
  onEdit,
  onDelete,
  deletable = true,
}: SwipeableRowProps) {
  const [offset, setOffset] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)

  const startX = useRef(0)
  const startY = useRef(0)
  const swiping = useRef(false)
  const decided = useRef(false)

  const reset = useCallback(() => setOffset(0), [])

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

    // Negative = swipe left (delete), positive = swipe right (edit)
    const maxLeft = deletable ? -160 : 0
    const maxRight = onEdit ? 160 : 0
    setOffset(Math.max(maxLeft, Math.min(dx, maxRight)))
  }

  const handleTouchEnd = () => {
    if (!swiping.current) {
      reset()
      return
    }

    // Past threshold → trigger action immediately
    if (offset <= -120 && deletable) {
      reset()
      setShowConfirm(true)
      return
    }
    if (offset >= 120 && onEdit) {
      reset()
      onEdit()
      return
    }

    // Under threshold → snap back
    reset()
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-btn">
        {/* Red delete background (left side) */}
        {deletable && (
          <div className="absolute inset-y-0 left-0 w-full bg-negative flex items-center pl-5 gap-2 text-white text-[10px] font-semibold rounded-btn">
            <span>🗑</span>
            Eliminar
          </div>
        )}

        {/* Green edit background (right side) */}
        {onEdit && (
          <div className="absolute inset-y-0 right-0 w-full bg-positive flex items-center justify-end pr-5 gap-2 text-white text-[10px] font-semibold rounded-btn">
            Editar
            <span>✏️</span>
          </div>
        )}

        {/* Swipeable content */}
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
        onConfirm={() => { setShowConfirm(false); onDelete() }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}
