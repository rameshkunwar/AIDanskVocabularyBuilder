import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "gradient" | "glass";
}

const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = "default", children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-3xl p-6 transition-all duration-300",
                    variant === "default" && [
                        "bg-white shadow-xl shadow-gray-200/50",
                        "hover:shadow-2xl hover:shadow-gray-200/60",
                    ],
                    variant === "gradient" && [
                        "bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50",
                        "shadow-xl shadow-purple-100/50",
                        "hover:shadow-2xl hover:shadow-purple-200/60",
                    ],
                    variant === "glass" && [
                        "bg-white/70 backdrop-blur-xl",
                        "border border-white/50",
                        "shadow-xl shadow-gray-100/40",
                    ],
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn("mb-4", className)} {...props} />
    )
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h3
            ref={ref}
            className={cn("text-2xl font-bold text-gray-800", className)}
            {...props}
        />
    )
);
CardTitle.displayName = "CardTitle";

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn("", className)} {...props} />
    )
);
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };
