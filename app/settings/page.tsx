'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useFixedExpenses } from '@/hooks/useFixedExpenses'
import { loadCustomCategories } from '@/lib/categories'

export default function SettingsPage() {
  const { expenses } = useFixedExpenses()
  const supabase = createClient()
  const router = useRouter()

  const [userName, setUserName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserName(user.user_metadata?.full_name || '')
    })
  }, [supabase])

  useEffect(() => {
    if (editingName && nameRef.current) nameRef.current.focus()
  }, [editingName])

  const saveName = async () => {
    const trimmed = nameInput.trim()
    setEditingName(false)
    if (trimmed === userName) return
    setUserName(trimmed)
    await supabase.auth.updateUser({ data: { full_name: trimmed } })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const customCount = loadCustomCategories().length

  return (
    <div className="min-h-screen p-4" style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold">Configuración</h1>
      </div>

      <div className="space-y-2">
        {/* Fixed Expenses */}
        <Link
          href="/settings/fixed-expenses"
          className="flex items-center gap-3 p-4 rounded-card bg-[var(--bg-card)]"
          style={{ border: '0.5px solid var(--pill-border)' }}
        >
          <span className="text-xl">💳</span>
          <div className="flex-1">
            <p className="text-sm font-semibold">Gastos fijos</p>
            <p className="text-xs text-[var(--text-muted)]">
              {expenses.length} {expenses.length === 1 ? 'gasto fijo' : 'gastos fijos'}
            </p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>

        {/* Categories */}
        <Link
          href="/settings/categories"
          className="flex items-center gap-3 p-4 rounded-card bg-[var(--bg-card)]"
          style={{ border: '0.5px solid var(--pill-border)' }}
        >
          <span className="text-xl">🏷️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold">Categorías</p>
            <p className="text-xs text-[var(--text-muted)]">
              {customCount > 0 ? `${customCount} personalizadas` : 'Predeterminadas'}
            </p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>

        {/* Profile */}
        <div
          className="flex items-center gap-3 p-4 rounded-card bg-[var(--bg-card)]"
          style={{ border: '0.5px solid var(--pill-border)' }}
        >
          <span className="text-xl">👤</span>
          <div className="flex-1">
            <p className="text-xs text-[var(--text-muted)] mb-0.5">Nombre</p>
            {editingName ? (
              <input
                ref={nameRef}
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName()
                  if (e.key === 'Escape') setEditingName(false)
                }}
                className="text-sm font-semibold bg-transparent outline-none border-b border-positive w-full"
              />
            ) : (
              <button
                onClick={() => { setNameInput(userName); setEditingName(true) }}
                className="text-sm font-semibold text-left"
              >
                {userName || <span className="text-[var(--text-muted)]">Tu nombre</span>}
              </button>
            )}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 p-4 rounded-card bg-[var(--bg-card)] w-full text-left"
          style={{ border: '0.5px solid var(--pill-border)' }}
        >
          <span className="text-xl">🚪</span>
          <p className="text-sm font-semibold text-negative">Cerrar sesión</p>
        </button>
      </div>
    </div>
  )
}
