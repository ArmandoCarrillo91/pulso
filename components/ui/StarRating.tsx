'use client'

import { useState } from 'react'

const emojis = ['😬', '😐', '🙂', '😊', '🤩']

interface StarRatingProps {
  value: number
  onChange: (value: number) => void
}

export default function StarRating({ value, onChange }: StarRatingProps) {
  const [hover, setHover] = useState(0)
  const active = hover || value

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-5xl">{active > 0 ? emojis[active - 1] : '🤔'}</div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`text-3xl transition-transform ${
              star <= active ? 'scale-110' : 'opacity-30'
            }`}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star)}
          >
            ⭐
          </button>
        ))}
      </div>
    </div>
  )
}
