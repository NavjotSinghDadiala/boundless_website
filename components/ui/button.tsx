import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE878] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#3B001B] text-[#FFE878] hover:bg-[#46001D] hover:scale-[1.02] active:scale-[0.98] shadow-md font-oswald uppercase tracking-wider",
        primary:
          "bg-[#3B001B] text-[#FFE878] hover:bg-[#46001D] hover:scale-[1.02] active:scale-[0.98] shadow-md font-oswald uppercase tracking-wider",
        golden:
          "bg-[#FCE16D] text-[#3B001B] hover:bg-[#FFE878] hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_14px_0_rgba(252,225,109,0.4)] font-oswald uppercase tracking-wider",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 hover:scale-[1.02] active:scale-[0.98] shadow-sm font-oswald uppercase tracking-wider",
        outline:
          "border-2 border-[#3B001B] text-[#3B001B] bg-transparent hover:bg-[#3B001B]/5 hover:scale-[1.01] active:scale-[0.99] font-oswald uppercase tracking-wider",
        secondary:
          "bg-[#FAF6ED] text-[#3B001B] border border-[#3B001B]/15 hover:bg-[#faebd4] font-oswald uppercase tracking-wider",
        ghost:
          "hover:bg-[#3B001B]/10 text-[#3B001B] font-oswald uppercase tracking-wider",
        link:
          "text-[#3B001B] underline-offset-4 hover:underline font-medium",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-2xl px-8 text-base",
        pill: "h-11 px-6 rounded-full",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      )
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="animate-spin size-4 mr-1" />}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
