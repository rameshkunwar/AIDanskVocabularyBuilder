import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, BookOpenCheck, RotateCcw } from "lucide-react";
import { getNextWords, getProgress, resetProgress } from "@/lib/api";
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
    const [isResetting, setIsResetting] = useState(false);

    const [searchParams] = useSearchParams();
    const collectionId = searchParams.get("collection_id") ? parseInt(searchParams.get("collection_id")!) : undefined;

    const { data: allWords = [], isLoading: isLoadingWords } = useQuery({
        queryKey: ["words", "next", collectionId],
        queryFn: () => getNextWords(collectionId),
    });

    // Filter out mastered words from the practice queue
    const practiceQueue = allWords.filter(w => !w.mastered);

    // Calculate progress based on read counts
    const totalWords = allWords.length;

    // Check if we are truly done (all words read 5 times OR explicitly finished according to logic)
    // Let's interpret "all words read" as the queue being empty.
    const isFinished = practiceQueue.length === 0 && totalWords > 0;

    // Safety check for index
    if (currentIndex >= practiceQueue.length && practiceQueue.length > 0) {
        setCurrentIndex(0);
    }

    const { data: progress } = useQuery({
        queryKey: ["progress"],
        queryFn: getProgress,
    });

    const currentWord = practiceQueue[currentIndex];

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

    const handleReset = async () => {
        if (!confirm("Er du sikker? Dette vil slette al din fremgang og starte helt forfra.")) return;

        setIsResetting(true);
        try {
            await resetProgress();
            queryClient.invalidateQueries({ queryKey: ["words"] });
            queryClient.invalidateQueries({ queryKey: ["progress"] });
            queryClient.invalidateQueries({ queryKey: ["badges"] });
            // Add a small delay for feeling only
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (error) {
            console.error("Reset failed:", error);
            alert("Kunne ikke nulstille. Prøv igen.");
        } finally {
            setIsResetting(false);
        }
    };

    const goToNext = () => {
        if (currentIndex < practiceQueue.length - 1) {
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

    if (isFinished) {
        return (
            <Card variant="gradient" className="text-center py-12 max-w-2xl mx-auto mt-8">
                <div className="mb-6">
                    <Celebration show={true} onComplete={() => { }} />
                    <div className="relative">
                        <BookOpenCheck className="w-24 h-24 text-green-500 mx-auto" />
                        <div className="absolute top-0 right-[40%] text-4xl">🎉</div>
                    </div>
                </div>

                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                    Du har læst alle ordene!
                </h2>

                <p className="text-xl text-gray-600 mb-8 max-w-md mx-auto">
                    Fantastisk arbejde! Du har været igennem alle {totalWords} ord.
                    <br /><br />
                    Vil du starte forfra og øve dem igen?
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Button
                        variant="destructive"
                        size="lg"
                        onClick={handleReset}
                        disabled={isResetting}
                        className="w-full sm:w-auto min-w-[200px]"
                    >
                        {isResetting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Nulstiller...
                            </>
                        ) : (
                            <>
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Ja, start forfra
                            </>
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        size="lg"
                        onClick={() => (window.location.href = "/upload")}
                        className="w-full sm:w-auto"
                    >
                        Upload ny side 📸
                    </Button>
                </div>

                <p className="text-xs text-red-400 mt-4">
                    * Dette vil slette al fremgang for disse ord
                </p>
            </Card>
        );
    }

    const readWords = allWords.filter(w => w.read_count > 0);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-6">
                {/* Header with points */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            {collectionId ? "Øv din samling" : "Øv dine ord"}
                        </h2>
                        <p className="text-gray-600">
                            Ord {currentIndex + 1} af {practiceQueue.length}
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
                        disabled={currentIndex === practiceQueue.length - 1}
                        className="flex-1"
                    >
                        Næste
                        <ChevronRight className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Sidebar with read words */}
            <div className="lg:col-span-1">
                <Card className="p-4 h-full bg-white/50 backdrop-blur-sm sticky top-4">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <BookOpenCheck className="w-5 h-5 text-purple-600" />
                        Læste ord ({readWords.length})
                    </h3>

                    {readWords.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">
                            Ord du har læst vil dukke op her...
                        </p>
                    ) : (
                        <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                            {readWords.map((word) => (
                                <div
                                    key={word.id}
                                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100 shadow-sm"
                                >
                                    <span className="font-medium text-gray-800">{word.text}</span>
                                    {word.mastered ? (
                                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                            Mestret
                                        </span>
                                    ) : (
                                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                            Læst {word.read_count}x
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
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
