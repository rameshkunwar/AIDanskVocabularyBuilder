import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Loader2, Check, X, BookOpen } from "lucide-react";
import { uploadImage } from "@/lib/api";
import type { Word } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function UploadPage() {
    const queryClient = useQueryClient();
    const [dragActive, setDragActive] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [extractedWords, setExtractedWords] = useState<Word[]>([]);

    const uploadMutation = useMutation({
        mutationFn: uploadImage,
        onSuccess: (data) => {
            setExtractedWords(data.words);
            queryClient.invalidateQueries({ queryKey: ["words"] });
        },
    });

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) {
            handleFile(file);
        }
    }, []);

    const handleFileInput = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                handleFile(file);
            }
        },
        []
    );

    const handleFile = (file: File) => {
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Upload file
        uploadMutation.mutate(file);
    };

    const handleReset = () => {
        setPreviewUrl(null);
        setExtractedWords([]);
        uploadMutation.reset();
    };

    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                    Upload en bogside 📸
                </h2>
                <p className="text-gray-600">
                    Tag et billede af en side, og vi finder de vigtige ord!
                </p>
            </div>

            {/* Upload zone */}
            {!previewUrl && (
                <Card
                    variant="glass"
                    className={cn(
                        "border-2 border-dashed transition-all duration-300 cursor-pointer",
                        dragActive
                            ? "border-purple-500 bg-purple-50/50 scale-102"
                            : "border-gray-300 hover:border-purple-400 hover:bg-purple-50/30"
                    )}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("file-input")?.click()}
                >
                    <div className="py-16 text-center">
                        <div
                            className={cn(
                                "w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center transition-all",
                                dragActive
                                    ? "bg-purple-500 text-white scale-110"
                                    : "bg-purple-100 text-purple-500"
                            )}
                        >
                            <Upload className="w-10 h-10" />
                        </div>
                        <p className="text-xl font-medium text-gray-700 mb-2">
                            {dragActive
                                ? "Slip billedet her! 📥"
                                : "Træk et billede hertil"}
                        </p>
                        <p className="text-gray-500">eller klik for at vælge en fil</p>
                    </div>
                    <input
                        id="file-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileInput}
                    />
                </Card>
            )}

            {/* Preview and loading state */}
            {previewUrl && (
                <Card variant="default" className="overflow-hidden">
                    <div className="relative">
                        <img
                            src={previewUrl}
                            alt="Uploaded book page"
                            className="w-full h-64 object-cover rounded-t-2xl"
                        />
                        <button
                            onClick={handleReset}
                            className="absolute top-4 right-4 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>

                    <div className="p-6">
                        {uploadMutation.isPending && (
                            <div className="flex items-center justify-center gap-3 py-8">
                                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                                <span className="text-lg text-gray-600">
                                    Finder ord i billedet...
                                </span>
                            </div>
                        )}

                        {uploadMutation.isError && (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <X className="w-8 h-8 text-red-500" />
                                </div>
                                <p className="text-red-600 font-medium mb-4">
                                    Hov, noget gik galt!
                                </p>
                                <Button variant="outline" onClick={handleReset}>
                                    Prøv igen
                                </Button>
                            </div>
                        )}

                        {uploadMutation.isSuccess && extractedWords.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-green-600">
                                    <Check className="w-6 h-6" />
                                    <span className="font-medium text-lg">
                                        Vi fandt {extractedWords.length} ord!
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {extractedWords.map((word) => (
                                        <div
                                            key={word.id}
                                            className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-3 text-center"
                                        >
                                            <p className="font-bold text-purple-700">{word.text}</p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {word.definition}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <Button
                                    variant="primary"
                                    size="lg"
                                    className="w-full"
                                    onClick={() => (window.location.href = "/")}
                                >
                                    <BookOpen className="w-5 h-5" />
                                    Start at øve!
                                </Button>
                            </div>
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
}
