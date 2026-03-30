'use client'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  fullWidth?: boolean
}

export default function Button({
  variant = 'primary',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'font-semibold py-3 px-6 rounded-btn transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-positive text-white hover:bg-green-700 active:bg-green-800',
    secondary:
      'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)]',
    ghost: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
