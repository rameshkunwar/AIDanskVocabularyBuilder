import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, BookOpenCheck } from "lucide-react";
import { getNextWords, getProgress } from "@/lib/api";
import type { Word } from "@/types";
import { WordCard } from "@/components/WordCard";
import { PointsDisplay, PointsPopup } from "@/components/PointsDisplay";
import { BadgeNotification } from "@/components/Badge";
import { Celebration } from "@/components/Celebration";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function PracticePage() {
    const queryClient = useQueryClient();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [pointsPopup, setPointsPopup] = useState<number | null>(null);
    const [badgeNotification, setBadgeNotification] = useState<{
        emoji: string;
        name: string;
    } | null>(null);
    const [showCelebration, setShowCelebration] = useState(false);

    const { data: words = [], isLoading: isLoadingWords } = useQuery({
        queryKey: ["words", "next"],
        queryFn: getNextWords,
    });

    const { data: progress } = useQuery({
        queryKey: ["progress"],
        queryFn: getProgress,
    });

    const currentWord = words[currentIndex];

    const handleWordUpdate = useCallback(
        (updatedWord: Word) => {
            queryClient.setQueryData(["words", "next"], (old: Word[] | undefined) =>
                old?.map((w) => (w.id === updatedWord.id ? updatedWord : w))
            );

            if (updatedWord.mastered) {
                setShowCelebration(true);
            }
        },
        [queryClient]
    );

    const handlePointsEarned = useCallback((points: number) => {
        setPointsPopup(points);
    }, []);

    const handleBadgeEarned = useCallback(
        (badge: { emoji: string; name: string }) => {
            setBadgeNotification(badge);
        },
        []
    );

    const goToNext = () => {
        if (currentIndex < words.length - 1) {
            setCurrentIndex((i) => i + 1);
        }
    };

    const goToPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex((i) => i - 1);
        }
    };

    if (isLoadingWords) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                <p className="text-lg text-gray-600">Indlæser ord...</p>
            </div>
        );
    }

    if (words.length === 0) {
        return (
            <Card variant="gradient" className="text-center py-12">
                <BookOpenCheck className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    Ingen ord at øve!
                </h2>
                <p className="text-gray-600 mb-6">
                    Upload en bogside for at starte med at lære nye ord.
                </p>
                <Button variant="primary" onClick={() => (window.location.href = "/upload")}>
                    Upload ny side 📸
                </Button>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with points */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Øv dine ord</h2>
                    <p className="text-gray-600">
                        Ord {currentIndex + 1} af {words.length}
                    </p>
                </div>
                {progress && <PointsDisplay points={progress.total_points} />}
            </div>

            {/* Word card */}
            {currentWord && (
                <WordCard
                    key={currentWord.id}
                    word={currentWord}
                    onWordUpdate={handleWordUpdate}
                    onPointsEarned={handlePointsEarned}
                    onBadgeEarned={handleBadgeEarned}
                />
            )}

            {/* Navigation */}
            <div className="flex justify-between gap-4">
                <Button
                    variant="outline"
                    onClick={goToPrev}
                    disabled={currentIndex === 0}
                    className="flex-1"
                >
                    <ChevronLeft className="w-5 h-5" />
                    Forrige
                </Button>
                <Button
                    variant="outline"
                    onClick={goToNext}
                    disabled={currentIndex === words.length - 1}
                    className="flex-1"
                >
                    Næste
                    <ChevronRight className="w-5 h-5" />
                </Button>
            </div>

            {/* Points popup */}
            {pointsPopup !== null && (
                <PointsPopup
                    amount={pointsPopup}
                    onComplete={() => {
                        setPointsPopup(null);
                        queryClient.invalidateQueries({ queryKey: ["progress"] });
                    }}
                />
            )}

            {/* Badge notification */}
            {badgeNotification && (
                <BadgeNotification
                    emoji={badgeNotification.emoji}
                    name={badgeNotification.name}
                    onComplete={() => setBadgeNotification(null)}
                />
            )}

            {/* Celebration effect */}
            <Celebration
                show={showCelebration}
                onComplete={() => setShowCelebration(false)}
            />
        </div>
    );
}
