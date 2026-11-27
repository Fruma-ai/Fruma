import type { ReactNode } from 'react'
const frumaMark = '/fruma/assets/fruma-purple-mark.jpeg'
import { cn } from '../lib/shadcn/utils'

export function BrandMark({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={cn('fruma-mark', className)}><img src={frumaMark} alt="" /></span>
}

export function BrandWordmark({ className = '' }: { className?: string }) {
  return <span className={cn('fruma-wordmark', className)}>Fruma</span>
}

export function Brand({ className = '' }: { className?: string }) {
  return (
    <a href="#top" aria-label="Fruma home" className={cn('inline-flex shrink-0 items-center gap-2.5 leading-none', className)}>
      <BrandMark /><BrandWordmark className="text-[36px] sm:text-[38px]" />
    </a>
  )
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-[10px] font-semibold uppercase tracking-[0.19em]', className)}>{children}</p>
}
