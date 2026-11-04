import * as React from 'react'
import { cn } from '@/lib/utils'

/** Full-screen on phones; a device frame on larger screens so the booth laptop still looks like an app. */
export function PhoneShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full md:max-w-[400px] md:rounded-[2.6rem] md:border-[10px] md:border-navy md:shadow-[0_30px_70px_rgba(20,33,61,.3)]', className)}>
      <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-paper md:h-[780px] md:rounded-[1.9rem]">{children}</div>
    </div>
  )
}
