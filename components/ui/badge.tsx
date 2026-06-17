import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-[#E7191F]/20 text-red-400',
        variant === 'secondary' && 'bg-zinc-800 text-zinc-300',
        variant === 'outline' && 'border border-zinc-700 text-zinc-400',
        className
      )}
      {...props}
    />
  )
}
