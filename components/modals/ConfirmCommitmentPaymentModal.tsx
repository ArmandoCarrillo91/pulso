'use client'

import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import { getLocalDateString } from '@/lib/date'
import type { Commitment } from '@/types'

interface Props {
  commitment: Commitment | null
  onClose: () => void
  onConfirm: (
    commitment: Commitment,
    opts: { date: string; note: string }
  ) => Promise<void>
}

function formatMoney(amount: number): string {
  const formatted = Math.abs(amount).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `$${formatted}`
}

export default function ConfirmCommitmentPaymentModal({
  commitment,
  onClose,
  onConfirm,
}: Props) {
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (commitment) {
      setDate(getLocalDateString())
      setNote('')
      setSaving(false)
    }
  }, [commitment])

  if (!commitment) return null

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await onConfirm(commitment, {
        date: date || getLocalDateString(),
        note,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-app bg-[var(--bg-card)] rounded-t-[24px] p-6 pb-8 animate-slide-up">
        <h2 className="text-lg font-bold mb-1">¿Confirmar pago?</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          {commitment.name}
        </p>
        <div className="flex items-center justify-center mb-4">
          <span className="text-3xl font-bold">
            {formatMoney(commitment.amount)}
          </span>
        </div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">
          Fecha
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={getLocalDateString()}
          className="input-field mb-3"
        />
        <label className="block text-xs text-[var(--text-secondary)] mb-1">
          Nota (opcional)
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={`Pago: ${commitment.name}`}
          className="input-field mb-4"
        />
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button fullWidth disabled={saving} onClick={handleSubmit}>
            {saving ? 'Guardando...' : 'Confirmar pago'}
          </Button>
        </div>
      </div>
    </div>
  )
}
