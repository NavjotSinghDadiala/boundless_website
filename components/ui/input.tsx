import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-[#3B001B]/20 bg-white px-3.5 py-2 text-sm text-[#1C1917] placeholder:text-stone-400 focus-visible:outline-none focus-visible:border-[#3B001B] focus-visible:ring-2 focus-visible:ring-[#FFE878] transition-all disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
