import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Loader2, Check, X, BookOpen, Plus, FolderOpen } from "lucide-react";
import { uploadImage, getCollections } from "@/lib/api";
import type { Word } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function UploadPage() {
    const queryClient = useQueryClient();
    const [dragActive, setDragActive] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [extractedWords, setExtractedWords] = useState<Word[]>([]);
    const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
    const [newCollectionName, setNewCollectionName] = useState("");
    const [isCreatingNewCollection, setIsCreatingNewCollection] = useState(false);
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);

    const { data: collections = [] } = useQuery({
        queryKey: ["collections"],
        queryFn: getCollections,
    });

    const uploadMutation = useMutation({
        mutationFn: ({ file, collectionId, collectionName }: { file: File, collectionId?: number, collectionName?: string }) =>
            uploadImage(file, collectionId, collectionName),
        onSuccess: (data) => {
            setExtractedWords(data.words);
            queryClient.invalidateQueries({ queryKey: ["words"] });
            queryClient.invalidateQueries({ queryKey: ["collections"] });
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
        setFileToUpload(file);
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const startUpload = () => {
        if (!fileToUpload) return;

        if (isCreatingNewCollection && !newCollectionName.trim()) {
            alert("Giv venligst den nye samling et navn.");
            return;
        }

        uploadMutation.mutate({
            file: fileToUpload,
            collectionId: isCreatingNewCollection ? undefined : (selectedCollectionId || undefined),
            collectionName: isCreatingNewCollection ? newCollectionName : undefined
        });
    };

    const handleReset = () => {
        setPreviewUrl(null);
        setExtractedWords([]);
        setFileToUpload(null);
        setIsCreatingNewCollection(false);
        setNewCollectionName("");
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
                            className="w-full h-64 object-cover"
                        />
                        <button
                            onClick={handleReset}
                            className="absolute top-4 right-4 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>

                    {!uploadMutation.isPending && !uploadMutation.isSuccess && !uploadMutation.isError && (
                        <div className="p-8 bg-purple-50/50 border-t border-purple-100 flex flex-col items-center justify-center">
                            <div className="w-full max-w-md space-y-6">
                                <div className="text-center">
                                    <h3 className="text-xl font-bold text-gray-800">Hvor skal billedet gemmes? 💾</h3>
                                    <p className="text-gray-600 text-sm mt-1">
                                        Vælg en samling eller lav en ny til dine ord.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex p-1 bg-white border border-gray-200 rounded-xl">
                                        <button
                                            onClick={() => setIsCreatingNewCollection(false)}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                                                !isCreatingNewCollection
                                                    ? "bg-purple-100 text-purple-700 shadow-sm"
                                                    : "text-gray-500 hover:text-gray-700"
                                            )}
                                        >
                                            <FolderOpen className="w-4 h-4" />
                                            Eksisterende
                                        </button>
                                        <button
                                            onClick={() => setIsCreatingNewCollection(true)}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                                                isCreatingNewCollection
                                                    ? "bg-purple-100 text-purple-700 shadow-sm"
                                                    : "text-gray-500 hover:text-gray-700"
                                            )}
                                        >
                                            <Plus className="w-4 h-4" />
                                            Ny Samling
                                        </button>
                                    </div>

                                    {isCreatingNewCollection ? (
                                        <div className="space-y-2 animate-fade-in">
                                            <label className="text-sm font-medium text-gray-700 ml-1">Samlingens navn</label>
                                            <input
                                                type="text"
                                                placeholder="F.eks. Kapittel 1, Min yndlingsbog..."
                                                value={newCollectionName}
                                                onChange={(e) => setNewCollectionName(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white transition-all shadow-sm"
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-2 animate-fade-in">
                                            <label className="text-sm font-medium text-gray-700 ml-1">Vælg samling</label>
                                            <select
                                                value={selectedCollectionId || ""}
                                                onChange={(e) => setSelectedCollectionId(e.target.value ? parseInt(e.target.value) : null)}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white transition-all shadow-sm appearance-none cursor-pointer"
                                            >
                                                <option value="">Vælg en samling...</option>
                                                {collections.map((col) => (
                                                    <option key={col.id} value={col.id}>
                                                        {col.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <Button
                                        variant="primary"
                                        size="lg"
                                        className="w-full py-6 text-lg font-bold shadow-lg shadow-purple-200"
                                        onClick={startUpload}
                                    >
                                        Start scanning 🚀
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-6">
                        {uploadMutation.isPending && (
                            <div className="flex flex-col items-center justify-center gap-4 py-8">
                                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                                <div className="text-center">
                                    <span className="text-lg font-medium text-gray-700 block mb-1">
                                        Finder ord i billedet...
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        Dette kan tage op til 30 sekunder. Vi bruger AI til at finde de bedste ord! 🤖
                                    </span>
                                </div>
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
                                <p className="text-sm text-gray-500 mb-6">
                                    {uploadMutation.error?.message || "Kunne ikke uploade billedet."}
                                </p>
                                <Button variant="outline" onClick={handleReset}>
                                    Prøv igen
                                </Button>
                            </div>
                        )}

                        {uploadMutation.isSuccess && extractedWords.length > 0 && (
                            <div className="space-y-6">
                                <div className="flex flex-col items-center justify-center text-center gap-2">
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
                                        <Check className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800">
                                        Succes! Vi fandt {extractedWords.length} ord
                                    </h3>
                                    <p className="text-gray-600 text-sm">
                                        Her er ordene fra din bogside. De er nu klar til at blive øvet.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {extractedWords.map((word) => (
                                        <div
                                            key={word.id}
                                            className="bg-purple-50/50 border border-purple-100 rounded-lg p-3 hover:bg-purple-50 transition-colors text-left"
                                        >
                                            <div className="flex justify-between items-start">
                                                <p className="font-bold text-purple-900">{word.text}</p>
                                                {word.mastered && (
                                                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                                                        Mestret
                                                    </span>
                                                )}
                                            </div>
                                            {word.definition && (
                                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                                    {word.definition}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        className="flex-1"
                                        onClick={() => {
                                            const cid = uploadMutation.data?.collection_id;
                                            window.location.href = cid ? `/practice?collection_id=${cid}` : "/practice";
                                        }}
                                    >
                                        <BookOpen className="w-5 h-5 mr-2" />
                                        Start at øve nu
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={handleReset}
                                    >
                                        Upload ny side
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
}
