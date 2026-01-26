import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
    "rounded-3xl border transition-all duration-300",
    {
        variants: {
            variant: {
                default: "bg-card text-card-foreground shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-gray-200/60 p-6 flex flex-col gap-6",
                gradient: "bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 shadow-xl shadow-purple-100/50 hover:shadow-2xl hover:shadow-purple-200/60 p-6 flex flex-col gap-6",
                glass: "bg-white/70 backdrop-blur-xl border-white/50 shadow-xl shadow-gray-100/40 p-6 flex flex-col gap-6",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

interface CardProps
    extends React.ComponentProps<"div">,
    VariantProps<typeof cardVariants> { }

function Card({ className, variant, ...props }: CardProps) {
    return (
        <div
            data-slot="card"
            className={cn(cardVariants({ variant, className }))}
            {...props}
        />
    )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-header"
            className={cn(
                "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
                className
            )}
            {...props}
        />
    )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-title"
            className={cn("text-2xl font-bold text-gray-800 leading-none", className)}
            {...props}
        />
    )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-description"
            className={cn("text-muted-foreground text-sm", className)}
            {...props}
        />
    )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-action"
            className={cn(
                "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
                className
            )}
            {...props}
        />
    )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-content"
            className={cn("px-6", className)}
            {...props}
        />
    )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-footer"
            className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
            {...props}
        />
    )
}

export {
    Card,
    CardHeader,
    CardFooter,
    CardTitle,
    CardAction,
    CardDescription,
    CardContent,
    cardVariants
}
