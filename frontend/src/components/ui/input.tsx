import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
    success?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, error, success, ...props }, ref) => {
        return (
            <input
                ref={ref}
                className={cn(
                    // Base styles
                    "w-full px-6 py-4 text-xl text-center font-medium rounded-2xl",
                    "bg-white border-2 transition-all duration-200",
                    "placeholder:text-gray-400",
                    "focus:outline-none focus:ring-4",
                    // Default state
                    !error && !success && [
                        "border-gray-200",
                        "focus:border-purple-400 focus:ring-purple-100",
                    ],
                    // Error state
                    error && [
                        "border-red-400 bg-red-50",
                        "focus:border-red-500 focus:ring-red-100",
                        "animate-shake",
                    ],
                    // Success state
                    success && [
                        "border-green-400 bg-green-50",
                        "focus:border-green-500 focus:ring-green-100",
                    ],
                    className
                )}
                {...props}
            />
        );
    }
);

Input.displayName = "Input";

export { Input };
