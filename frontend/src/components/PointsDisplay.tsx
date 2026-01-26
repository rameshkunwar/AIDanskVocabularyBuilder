import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface PointsDisplayProps {
    points: number;
    className?: string;
}

export function PointsDisplay({ points, className }: PointsDisplayProps) {
    const [displayPoints, setDisplayPoints] = useState(points);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (points !== displayPoints) {
            setIsAnimating(true);

            // Animate counting up
            const diff = points - displayPoints;
            const steps = Math.min(Math.abs(diff), 20);
            const increment = diff / steps;
            let current = displayPoints;
            let step = 0;

            const interval = setInterval(() => {
                step++;
                if (step >= steps) {
                    setDisplayPoints(points);
                    clearInterval(interval);
                    setTimeout(() => setIsAnimating(false), 300);
                } else {
                    current += increment;
                    setDisplayPoints(Math.round(current));
                }
            }, 30);

            return () => clearInterval(interval);
        }
    }, [points, displayPoints]);

    return (
        <div
            className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full",
                "bg-gradient-to-r from-yellow-400 to-orange-400",
                "text-white font-bold shadow-lg shadow-orange-300/50",
                isAnimating && "animate-pulse scale-110",
                "transition-transform duration-200",
                className
            )}
        >
            <Star className="w-5 h-5 fill-white" />
            <span className="text-lg">{displayPoints.toLocaleString("da-DK")}</span>
        </div>
    );
}

interface PointsPopupProps {
    amount: number;
    onComplete?: () => void;
}

export function PointsPopup({ amount, onComplete }: PointsPopupProps) {
    useEffect(() => {
        const timer = setTimeout(() => onComplete?.(), 1500);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
            <div className="text-4xl font-bold text-green-500 animate-float-up">
                +{amount} ⭐
            </div>
        </div>
    );
}
