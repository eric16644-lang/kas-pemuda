// src/components/Container.tsx
'use client'
import * as React from 'react'

type Props = {
  children: React.ReactNode
  className?: string
}

/**
 * Consistent responsive wrapper (mobile-first).
 * - Centers content
 * - Sets max width
 * - Adds horizontal padding that adapts to breakpoints
 */
export default function Container({ children, className = '' }: Props) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  )
}
