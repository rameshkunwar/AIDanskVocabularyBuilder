import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl",
                destructive:
                    "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 rounded-2xl",
                outline:
                    "border-2 border-purple-400 text-purple-600 bg-white shadow-xs hover:bg-purple-50 hover:border-purple-500 rounded-2xl",
                secondary:
                    "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30 hover:from-blue-600 hover:to-cyan-600 hover:shadow-xl hover:shadow-blue-500/40 rounded-2xl active:scale-95",
                ghost:
                    "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 rounded-2xl",
                link: "text-primary underline-offset-4 hover:underline",
                primary: "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 hover:from-purple-600 hover:to-pink-600 hover:shadow-xl hover:shadow-purple-500/40 rounded-2xl active:scale-95",
            },
            size: {
                default: "h-11 px-6 py-3 has-[>svg]:px-4 text-base",
                xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
                sm: "h-9 rounded-xl gap-1.5 px-3 has-[>svg]:px-2.5 text-sm",
                lg: "h-14 rounded-2xl px-8 has-[>svg]:px-6 text-lg",
                icon: "size-11",
                "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
                "icon-sm": "size-9 rounded-xl",
                "icon-lg": "size-14 rounded-2xl",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                ref={ref}
                data-slot="button"
                data-variant={variant}
                data-size={size}
                className={cn(buttonVariants({ variant, size, className }))}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
