import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
    value: number;
    max?: number;
    showLabel?: boolean;
}

const Progress = forwardRef<HTMLDivElement, ProgressProps>(
    ({ className, value, max = 5, showLabel = true, ...props }, ref) => {
        const percentage = Math.min(100, (value / max) * 100);

        return (
            <div ref={ref} className={cn("w-full", className)} {...props}>
                {showLabel && (
                    <div className="flex justify-between mb-2 text-sm font-medium">
                        <span className="text-gray-600">Læst</span>
                        <span className="text-purple-600">
                            {value} / {max}
                        </span>
                    </div>
                )}
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all duration-500 ease-out",
                            "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400",
                            percentage === 100 && "animate-pulse"
                        )}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                {/* Progress dots */}
                <div className="flex justify-between mt-2 px-1">
                    {Array.from({ length: max }).map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "w-3 h-3 rounded-full transition-all duration-300",
                                i < value
                                    ? "bg-gradient-to-br from-purple-500 to-pink-500 scale-110"
                                    : "bg-gray-200"
                            )}
                        />
                    ))}
                </div>
            </div>
        );
    }
);

Progress.displayName = "Progress";

export { Progress };
