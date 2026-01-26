import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost";
    size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    // Base styles
                    "inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-200 ease-out",
                    "focus:outline-none focus:ring-4 focus:ring-offset-2",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "active:scale-95 hover:scale-105",
                    // Variants
                    variant === "primary" && [
                        "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30",
                        "hover:from-purple-600 hover:to-pink-600 hover:shadow-xl hover:shadow-purple-500/40",
                        "focus:ring-purple-400",
                    ],
                    variant === "secondary" && [
                        "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30",
                        "hover:from-blue-600 hover:to-cyan-600 hover:shadow-xl hover:shadow-blue-500/40",
                        "focus:ring-blue-400",
                    ],
                    variant === "outline" && [
                        "border-2 border-purple-400 text-purple-600 bg-white/80",
                        "hover:bg-purple-50 hover:border-purple-500",
                        "focus:ring-purple-300",
                    ],
                    variant === "ghost" && [
                        "text-gray-600 hover:bg-gray-100",
                        "focus:ring-gray-300",
                    ],
                    // Sizes
                    size === "sm" && "px-4 py-2 text-sm",
                    size === "md" && "px-6 py-3 text-base",
                    size === "lg" && "px-8 py-4 text-lg",
                    className
                )}
                {...props}
            >
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";

export { Button };
