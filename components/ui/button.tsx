import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7191F] focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900',
  {
    variants: {
      variant: {
        default:     'bg-[#E7191F] text-white hover:bg-[#c41218] shadow-sm',
        secondary:   'bg-zinc-800 text-zinc-200 hover:bg-zinc-700',
        ghost:       'hover:bg-zinc-800 text-zinc-400 hover:text-white',
        outline:     'border border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white',
        destructive: 'bg-red-700 text-white hover:bg-red-800',
        link:        'text-[#E7191F] underline-offset-4 hover:underline',
      },
      size: {
        default:  'h-9 px-4 py-2',
        sm:       'h-8 px-3 text-xs',
        lg:       'h-11 px-6 text-base',
        icon:     'h-9 w-9',
        'icon-sm': 'h-7 w-7',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
