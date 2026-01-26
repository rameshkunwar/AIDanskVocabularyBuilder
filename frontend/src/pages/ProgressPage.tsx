import { useQuery } from "@tanstack/react-query";
import { Trophy, Star, BookCheck, Flame, Loader2 } from "lucide-react";
import { getProgress, getBadges } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/Badge";
import { cn } from "@/lib/utils";

export function ProgressPage() {
    const { data: progress, isLoading: isLoadingProgress } = useQuery({
        queryKey: ["progress"],
        queryFn: getProgress,
    });

    const { data: badges = [], isLoading: isLoadingBadges } = useQuery({
        queryKey: ["badges"],
        queryFn: getBadges,
    });

    if (isLoadingProgress || isLoadingBadges) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                <p className="text-lg text-gray-600">Indlæser fremskridt...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                    Dine fremskridt 🏆
                </h2>
                <p className="text-gray-600">
                    Se hvor langt du er nået!
                </p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-4">
                <StatCard
                    icon={<Star className="w-8 h-8" />}
                    label="Point"
                    value={progress?.total_points.toLocaleString("da-DK") || "0"}
                    color="yellow"
                />
                <StatCard
                    icon={<BookCheck className="w-8 h-8" />}
                    label="Ord mestret"
                    value={progress?.words_mastered.toString() || "0"}
                    color="green"
                />
                <StatCard
                    icon={<Flame className="w-8 h-8" />}
                    label="Stave-streak"
                    value={progress?.spelling_streak.toString() || "0"}
                    color="orange"
                />
                <StatCard
                    icon={<Trophy className="w-8 h-8" />}
                    label="Badges"
                    value={progress?.badges.length.toString() || "0"}
                    color="purple"
                />
            </div>

            {/* Badges section */}
            <Card variant="gradient">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-yellow-500" />
                        Dine badges
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {badges.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-6">
                            {badges.map((badge) => (
                                <Badge
                                    key={badge.id}
                                    badge={{
                                        ...badge,
                                        earned: progress?.badges.includes(badge.id),
                                    }}
                                    size="md"
                                    showDescription
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p>Ingen badges endnu. Bliv ved med at øve!</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Motivational message */}
            <Card variant="glass" className="text-center py-8">
                <p className="text-2xl font-bold text-gray-700 mb-2">
                    {getMotivationalMessage(progress?.words_mastered || 0)}
                </p>
                <p className="text-gray-500">
                    Bliv ved det gode arbejde! 💪
                </p>
            </Card>
        </div>
    );
}

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: "yellow" | "green" | "orange" | "purple";
}

function StatCard({ icon, label, value, color }: StatCardProps) {
    const colorClasses = {
        yellow: "from-yellow-400 to-orange-400 shadow-xl shadow-yellow-200/50",
        green: "from-green-400 to-emerald-500 shadow-xl shadow-green-200/50",
        orange: "from-orange-400 to-red-400 shadow-xl shadow-orange-200/50",
        purple: "from-purple-400 to-pink-500 shadow-xl shadow-purple-200/50",
    };

    return (
        <div
            className={cn(
                "bg-gradient-to-br text-white rounded-2xl p-5 shadow-lg",
                colorClasses[color]
            )}
        >
            <div className="opacity-80 mb-2">{icon}</div>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-sm opacity-80">{label}</p>
        </div>
    );
}

function getMotivationalMessage(wordsMastered: number): string {
    if (wordsMastered === 0) {
        return "Start din ordrejse i dag! 🚀";
    } else if (wordsMastered < 5) {
        return "Godt begyndt! Fortsæt sådan! 🌟";
    } else if (wordsMastered < 10) {
        return "Du er på vej til at blive en ordmester! ⚔️";
    } else if (wordsMastered < 25) {
        return "Imponerende fremskridt! 🛡️";
    } else {
        return "Du er en ægte ordviking! 👑";
    }
}
