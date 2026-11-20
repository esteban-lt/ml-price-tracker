import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-transparent bg-clip-padding font-semibold whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-60 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        outline:
          "border-input bg-card text-foreground hover:bg-secondary aria-expanded:bg-secondary",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-muted aria-expanded:bg-muted",
        ghost:
          "text-foreground hover:bg-secondary aria-expanded:bg-secondary",
        destructive:
          "bg-destructive text-white hover:bg-destructive-hover focus-visible:outline-destructive",
        "destructive-ghost":
          "text-destructive hover:bg-destructive-soft",
        link: "h-auto! px-0! text-accent-foreground underline-offset-4 hover:underline",
        ink: "bg-ink text-ink-foreground hover:bg-ink/90",
        mint: "bg-mint text-[#0a2a20] hover:bg-mint/90",
      },
      size: {
        default: "min-h-11 px-[18px] text-[15px]",
        xs: "min-h-7 gap-1 rounded-lg px-2 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "min-h-9 gap-1.5 rounded-[10px] px-3 text-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "min-h-13 px-6 text-base",
        xl: "min-h-14 px-6 text-base",
        icon: "size-11 [&_svg:not([class*='size-'])]:size-5",
        "icon-xs": "size-7 rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9 rounded-[10px]",
        "icon-lg": "size-12 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
