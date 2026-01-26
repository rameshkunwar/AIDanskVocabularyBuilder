import { cn } from "@/lib/utils";
import type { Badge as BadgeType } from "@/types";

interface BadgeProps {
    badge: BadgeType;
    size?: "sm" | "md" | "lg";
    showDescription?: boolean;
}

export function Badge({ badge, size = "md", showDescription = false }: BadgeProps) {
    const earned = badge.earned !== false;

    return (
        <div
            className={cn(
                "flex flex-col items-center text-center transition-all duration-300",
                !earned && "opacity-40 grayscale"
            )}
        >
            <div
                className={cn(
                    "rounded-full bg-gradient-to-br flex items-center justify-center transition-transform",
                    earned && "hover:scale-110",
                    earned
                        ? "from-yellow-300 to-orange-400 shadow-lg shadow-orange-200"
                        : "from-gray-200 to-gray-300",
                    size === "sm" && "w-12 h-12 text-xl",
                    size === "md" && "w-16 h-16 text-3xl",
                    size === "lg" && "w-24 h-24 text-5xl"
                )}
            >
                <span className={cn(!earned && "filter blur-[1px]")}>{badge.emoji}</span>
            </div>
            <p
                className={cn(
                    "font-semibold mt-2",
                    size === "sm" && "text-xs",
                    size === "md" && "text-sm",
                    size === "lg" && "text-base",
                    earned ? "text-gray-800" : "text-gray-400"
                )}
            >
                {badge.name}
            </p>
            {showDescription && (
                <p
                    className={cn(
                        "text-xs mt-1 max-w-[120px]",
                        earned ? "text-gray-600" : "text-gray-400"
                    )}
                >
                    {badge.description}
                </p>
            )}
        </div>
    );
}

interface BadgeNotificationProps {
    emoji: string;
    name: string;
    onComplete?: () => void;
}

export function BadgeNotification({
    emoji,
    name,
    onComplete,
}: BadgeNotificationProps) {
    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm animate-fade-in"
            onClick={onComplete}
        >
            <div className="bg-white rounded-3xl p-8 shadow-2xl animate-bounce-in text-center">
                <div className="text-7xl mb-4 animate-wiggle">{emoji}</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Ny Badge!</h3>
                <p className="text-xl text-purple-600 font-medium">{name}</p>
                <p className="text-sm text-gray-500 mt-4">Tryk for at fortsætte</p>
            </div>
        </div>
    );
}
