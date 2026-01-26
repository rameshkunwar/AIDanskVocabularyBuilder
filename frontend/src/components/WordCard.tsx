import { useState, useRef } from "react";
import { Volume2, VolumeX, Check, Sparkles } from "lucide-react";
import type { Word } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getWordTTSUrl, practiceWord, verifySpelling } from "@/lib/api";

interface WordCardProps {
    word: Word;
    onWordUpdate?: (word: Word) => void;
    onPointsEarned?: (points: number) => void;
    onBadgeEarned?: (badge: { emoji: string; name: string }) => void;
}

export function WordCard({
    word,
    onWordUpdate,
    onPointsEarned,
    onBadgeEarned,
}: WordCardProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [localReadCount, setLocalReadCount] = useState(word.read_count);
    const [showSpelling, setShowSpelling] = useState(word.read_count >= 5);
    const [spellingAttempt, setSpellingAttempt] = useState("");
    const [spellingError, setSpellingError] = useState(false);
    const [spellingSuccess, setSpellingSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const canPractice = localReadCount < 5;
    const needsSpelling = localReadCount >= 5 && !word.spelling_verified;

    const handlePlayAudio = async () => {
        if (isPlaying) {
            audioRef.current?.pause();
            setIsPlaying(false);
            return;
        }

        try {
            if (!audioRef.current) {
                audioRef.current = new Audio(getWordTTSUrl(word.id));
                audioRef.current.onended = () => setIsPlaying(false);
                audioRef.current.onerror = () => setIsPlaying(false);
            }
            await audioRef.current.play();
            setIsPlaying(true);
        } catch (error) {
            console.error("Error playing audio:", error);
            setIsPlaying(false);
        }
    };

    const handleReadIt = async () => {
        if (!canPractice || isLoading) return;
        setIsLoading(true);

        try {
            const response = await practiceWord(word.id);
            const newCount = response.word.read_count;
            setLocalReadCount(newCount);
            onWordUpdate?.(response.word);
            onPointsEarned?.(response.points_earned);

            if (newCount >= 5) {
                setShowSpelling(true);
            }

            // Check for earned badges
            response.badges_earned?.forEach((badge) => {
                onBadgeEarned?.({ emoji: badge.emoji, name: badge.name });
            });
        } catch (error) {
            console.error("Error recording practice:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifySpelling = async () => {
        if (!spellingAttempt.trim() || isLoading) return;
        setIsLoading(true);
        setSpellingError(false);

        try {
            const response = await verifySpelling(word.id, spellingAttempt.trim());

            if (response.correct) {
                setSpellingSuccess(true);
                onWordUpdate?.(response.word);
                onPointsEarned?.(response.points_earned);
                response.badges_earned?.forEach((badge) => {
                    onBadgeEarned?.({ emoji: badge.emoji, name: badge.name });
                });
            } else {
                setSpellingError(true);
                setSpellingAttempt("");
                setTimeout(() => setSpellingError(false), 1000);
            }
        } catch (error) {
            console.error("Error verifying spelling:", error);
            setSpellingError(true);
        } finally {
            setIsLoading(false);
        }
    };

    if (word.mastered) {
        return (
            <Card variant="gradient" className="text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">{word.text}</h2>
                <p className="text-green-600 font-medium flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" />
                    Mestret!
                </p>
            </Card>
        );
    }

    return (
        <Card
            variant="gradient"
            className={cn(
                "text-center relative overflow-hidden",
                spellingSuccess && "ring-4 ring-green-400"
            )}
        >
            {/* Decorative sparkles */}
            <div className="absolute top-4 right-4 text-purple-300 opacity-50">
                <Sparkles className="w-8 h-8" />
            </div>

            {/* Word display */}
            <div className="mb-6">
                <h2 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent mb-4">
                    {word.text}
                </h2>
                <p className="text-xl text-gray-600">{word.definition}</p>
            </div>

            {/* Audio button */}
            <Button
                variant="secondary"
                size="lg"
                onClick={handlePlayAudio}
                className="mb-6"
            >
                {isPlaying ? (
                    <>
                        <VolumeX className="w-6 h-6" />
                        Stop
                    </>
                ) : (
                    <>
                        <Volume2 className="w-6 h-6" />
                        Lyt 🔊
                    </>
                )}
            </Button>

            {/* Progress bar */}
            <Progress value={localReadCount} max={5} className="mb-6" />

            {/* Practice or Spelling section */}
            {canPractice ? (
                <Button
                    variant="primary"
                    size="lg"
                    onClick={handleReadIt}
                    disabled={isLoading}
                    className="w-full"
                >
                    {isLoading ? "Gemmer..." : "Jeg læste det! 📖"}
                </Button>
            ) : needsSpelling && showSpelling ? (
                <div className="space-y-4">
                    <p className="text-lg text-gray-700 font-medium">
                        Fantastisk! Stav nu ordet:
                    </p>
                    <Input
                        type="text"
                        placeholder="Skriv ordet her..."
                        value={spellingAttempt}
                        onChange={(e) => setSpellingAttempt(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleVerifySpelling()}
                        error={spellingError}
                        success={spellingSuccess}
                        autoFocus
                    />
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={handleVerifySpelling}
                        disabled={isLoading || !spellingAttempt.trim()}
                        className="w-full"
                    >
                        {isLoading ? "Tjekker..." : "Tjek stavning ✍️"}
                    </Button>
                </div>
            ) : (
                <div className="py-4 text-center">
                    <span className="text-2xl text-green-600 font-bold flex items-center justify-center gap-2">
                        <Check className="w-6 h-6" />
                        Godt gået! 🌟
                    </span>
                </div>
            )}
        </Card>
    );
}
