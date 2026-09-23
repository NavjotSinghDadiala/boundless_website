import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#3B001B] text-[#FFE878] hover:bg-[#46001D]",
        secondary:
          "border-transparent bg-[#FAF6ED] text-[#3B001B] hover:bg-[#faebd4]",
        destructive:
          "border-transparent bg-rose-600 text-white hover:bg-rose-700",
        outline: "text-[#3B001B] border-[#3B001B]/20",
        gold: "border-transparent bg-[#FCE16D] text-[#3B001B] hover:bg-[#FFE878]",
        success: "border-transparent bg-emerald-100 text-emerald-800",
        warning: "border-transparent bg-amber-100 text-amber-900",
        info: "border-transparent bg-sky-100 text-sky-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
