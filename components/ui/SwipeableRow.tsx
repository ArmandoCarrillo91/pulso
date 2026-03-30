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
  const lockedDir = useRef<'left' | 'right' | null>(null)

  const reset = useCallback(() => {
    setOffset(0)
    lockedDir.current = null
  }, [])

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

    // Clamp: negative = swipe left (delete), positive = swipe right (edit)
    const base = lockedDir.current === 'left' ? -72 : lockedDir.current === 'right' ? 72 : 0
    const raw = base + dx
    const clamped = Math.max(-150, Math.min(raw, onEdit ? 150 : 0))
    setOffset(deletable ? clamped : Math.max(0, clamped))
  }

  const handleTouchEnd = () => {
    if (!swiping.current) {
      if (lockedDir.current) reset()
      return
    }

    // Auto-trigger at 140px
    if (offset <= -140 && deletable) {
      setShowConfirm(true)
      reset()
      return
    }
    if (offset >= 140 && onEdit) {
      reset()
      onEdit()
      return
    }

    // Lock at 72px threshold
    if (offset <= -72 && deletable) {
      setOffset(-72)
      lockedDir.current = 'left'
    } else if (offset >= 72 && onEdit) {
      setOffset(72)
      lockedDir.current = 'right'
    } else {
      reset()
    }
  }

  const handleDeleteTap = () => {
    setShowConfirm(true)
  }

  const handleEditTap = () => {
    reset()
    onEdit?.()
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-btn">
        {/* Left side: red delete (revealed on swipe left) */}
        {deletable && (
          <button
            className="absolute inset-y-0 left-0 w-24 bg-negative flex flex-col items-center justify-center gap-1 text-white text-[10px] font-semibold rounded-l-btn"
            onClick={handleDeleteTap}
          >
            <span>🗑</span>
            Eliminar
          </button>
        )}

        {/* Right side: green edit (revealed on swipe right) */}
        {onEdit && (
          <button
            className="absolute inset-y-0 right-0 w-24 bg-positive flex flex-col items-center justify-center gap-1 text-white text-[10px] font-semibold rounded-r-btn"
            onClick={handleEditTap}
          >
            <span>✏️</span>
            Editar
          </button>
        )}

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
        onConfirm={() => { setShowConfirm(false); reset(); onDelete() }}
        onCancel={() => { setShowConfirm(false); reset() }}
      />
    </>
  )
}
