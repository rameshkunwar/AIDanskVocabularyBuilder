import { useEffect, useState } from "react";

interface CelebrationProps {
    show: boolean;
    onComplete?: () => void;
}

interface Particle {
    id: number;
    x: number;
    color: string;
    delay: number;
    size: number;
}

export function Celebration({ show, onComplete }: CelebrationProps) {
    const [particles, setParticles] = useState<Particle[]>([]);

    useEffect(() => {
        if (show) {
            const colors = [
                "#a855f7", // purple
                "#ec4899", // pink
                "#f97316", // orange
                "#22c55e", // green
                "#3b82f6", // blue
                "#eab308", // yellow
            ];

            const newParticles: Particle[] = Array.from({ length: 50 }).map((_, i) => ({
                id: i,
                x: Math.random() * 100,
                color: colors[Math.floor(Math.random() * colors.length)],
                delay: Math.random() * 0.5,
                size: Math.random() * 8 + 4,
            }));

            setParticles(newParticles);

            const timer = setTimeout(() => {
                setParticles([]);
                onComplete?.();
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [show, onComplete]);

    if (!show && particles.length === 0) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {particles.map((particle) => (
                <div
                    key={particle.id}
                    className="absolute animate-confetti"
                    style={{
                        left: `${particle.x}%`,
                        top: "-20px",
                        width: particle.size,
                        height: particle.size,
                        backgroundColor: particle.color,
                        borderRadius: Math.random() > 0.5 ? "50%" : "0",
                        animationDelay: `${particle.delay}s`,
                    }}
                />
            ))}
        </div>
    );
}
