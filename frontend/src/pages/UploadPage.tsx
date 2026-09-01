import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Loader2, Check, X, BookOpen, Plus, FolderOpen, FileText, Camera, RefreshCw } from "lucide-react";
import { uploadImage, getCollections, checkUploadStatus, addWordsToCollection } from "@/lib/api";
import type { Word } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function UploadPage() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<"ocr" | "manual">("ocr");
    const [dragActive, setDragActive] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [extractedWords, setExtractedWords] = useState<Word[]>([]);
    const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
    const [newCollectionName, setNewCollectionName] = useState("");
    const [isCreatingNewCollection, setIsCreatingNewCollection] = useState(false);
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [pollingSourceId, setPollingSourceId] = useState<number | null>(null);
    const [manualWords, setManualWords] = useState("");
    const [addedWordsSummary, setAddedWordsSummary] = useState<{ text: string; definition: string }[]>([]);
    const [wordsAddedCount, setWordsAddedCount] = useState(0);
    const [wordsSkippedCount, setWordsSkippedCount] = useState(0);
    const [successCollectionId, setSuccessCollectionId] = useState<number | null>(null);

    // Camera states and refs
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
    const [activeCameraId, setActiveCameraId] = useState<string>("");
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // Clean up camera stream on unmount
    useEffect(() => {
        return () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach((track) => track.stop());
            }
        };
    }, [cameraStream]);

    const { data: collections = [] } = useQuery({
        queryKey: ["collections"],
        queryFn: getCollections,
    });

    const isDuplicateName = isCreatingNewCollection && newCollectionName.trim() !== "" && collections.some(
        (col) => col.name.trim().toLowerCase() === newCollectionName.trim().toLowerCase()
    );

    const uploadMutation = useMutation({
        mutationFn: ({ file, collectionId, collectionName }: { file: File, collectionId?: number, collectionName?: string }) =>
            uploadImage(file, collectionId, collectionName),
        onSuccess: (data) => {
            setPollingSourceId(data.source_id);
        },
    });

    const addWordsMutation = useMutation({
        mutationFn: ({ words, collectionName }: { words: string, collectionName: string }) =>
            addWordsToCollection({ words, collection_name: collectionName }),
        onSuccess: (data) => {
            setWordsAddedCount(data.words_added);
            setWordsSkippedCount(data.words_skipped);
            setAddedWordsSummary(data.added_words);
            setSuccessCollectionId(data.collection_id);
            queryClient.invalidateQueries({ queryKey: ["words"] });
            queryClient.invalidateQueries({ queryKey: ["collections"] });
        },
    });

    const { data: uploadStatus, isError: isPollingError, error: pollingError } = useQuery({
        queryKey: ["uploadStatus", pollingSourceId],
        queryFn: () => checkUploadStatus(pollingSourceId!),
        enabled: !!pollingSourceId,
        refetchInterval: (query) => {
            const data = query.state.data;
            if (data?.status === "completed" || data?.status === "failed") {
                return false;
            }
            return 2000;
        },
    });

    useEffect(() => {
        if (uploadStatus?.status === "completed" && uploadStatus.words) {
            setExtractedWords(uploadStatus.words);
            queryClient.invalidateQueries({ queryKey: ["words"] });
            queryClient.invalidateQueries({ queryKey: ["collections"] });
            setPollingSourceId(null);
        }
    }, [uploadStatus, queryClient]);

    const handleFile = (file: File) => {
        setFileToUpload(file);
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

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

    const startUpload = () => {
        if (!fileToUpload) return;

        if (isCreatingNewCollection) {
            if (!newCollectionName.trim()) {
                alert("Giv venligst den nye samling et navn.");
                return;
            }
            if (isDuplicateName) {
                alert(`En samling med navnet "${newCollectionName.trim()}" findes allerede. Vælg "Eksisterende" eller angiv et andet navn.`);
                return;
            }
        }

        uploadMutation.mutate({
            file: fileToUpload,
            collectionId: isCreatingNewCollection ? undefined : (selectedCollectionId || undefined),
            collectionName: isCreatingNewCollection ? newCollectionName.trim() : undefined
        });
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach((track) => track.stop());
            setCameraStream(null);
        }
        setIsCameraActive(false);
    };

    const startCamera = async (deviceId?: string) => {
        // Stop existing stream if any
        if (cameraStream) {
            cameraStream.getTracks().forEach((track) => track.stop());
        }

        try {
            const constraints: MediaStreamConstraints = {
                video: deviceId 
                    ? { deviceId: { exact: deviceId } } 
                    : { facingMode: "environment" }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setCameraStream(stream);
            setIsCameraActive(true);

            // Wait a tick for videoRef to mount if it was just set active
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(err => console.error("Error playing video:", err));
                }
            }, 50);

            // Enumerate devices to list available cameras
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === "videoinput");
            setCameras(videoDevices);
            
            // Set active camera ID
            if (deviceId) {
                setActiveCameraId(deviceId);
            } else {
                const activeTrack = stream.getVideoTracks()[0];
                if (activeTrack) {
                    const settings = activeTrack.getSettings();
                    if (settings.deviceId) {
                        setActiveCameraId(settings.deviceId);
                    }
                }
            }
        } catch (err) {
            console.error("Kunne ikke få adgang til kameraet:", err);
            alert("Kunne ikke få adgang til kameraet. Kontroller dine tilladelser.");
            setIsCameraActive(false);
        }
    };

    const switchCamera = () => {
        if (cameras.length <= 1) return;
        const currentIndex = cameras.findIndex(c => c.deviceId === activeCameraId);
        const nextIndex = (currentIndex + 1) % cameras.length;
        const nextDevice = cameras[nextIndex];
        if (nextDevice) {
            startCamera(nextDevice.deviceId);
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;

        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
                setFileToUpload(file);
                setPreviewUrl(URL.createObjectURL(blob));
                stopCamera();
            }
        }, "image/jpeg", 0.95);
    };

    const handleReset = () => {
        stopCamera();
        setPreviewUrl(null);
        setExtractedWords([]);
        setFileToUpload(null);
        setIsCreatingNewCollection(false);
        setNewCollectionName("");
        setPollingSourceId(null);
        setManualWords("");
        setAddedWordsSummary([]);
        setWordsAddedCount(0);
        setWordsSkippedCount(0);
        setSuccessCollectionId(null);
        uploadMutation.reset();
        addWordsMutation.reset();
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualWords.trim()) {
            alert("Indtast venligst nogle ord.");
            return;
        }

        let collectionName = "";
        if (isCreatingNewCollection) {
            if (!newCollectionName.trim()) {
                alert("Giv venligst den nye samling et navn.");
                return;
            }
            if (isDuplicateName) {
                alert(`En samling med navnet "${newCollectionName.trim()}" findes allerede. Vælg "Eksisterende" eller angiv et andet navn.`);
                return;
            }
            collectionName = newCollectionName.trim();
        } else {
            if (!selectedCollectionId) {
                alert("Vælg venligst en samling.");
                return;
            }
            const col = collections.find(c => c.id === selectedCollectionId);
            collectionName = col ? col.name : "";
        }

        addWordsMutation.mutate({
            words: manualWords,
            collectionName
        });
    };


    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                    Tilføj nye ord 📚
                </h2>
                <p className="text-gray-600">
                    Udvid dit ordforråd ved at uploade et billede eller skrive ord selv.
                </p>
            </div>

            {/* Tabs Selector */}
            {!previewUrl && !addWordsMutation.isPending && !addWordsMutation.isSuccess && !addWordsMutation.isError && !addedWordsSummary.length && (
                <div className="flex p-1 bg-gray-100 border border-gray-200 rounded-xl max-w-md mx-auto mb-6">
                    <button
                        onClick={() => setActiveTab("ocr")}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                            activeTab === "ocr"
                                ? "bg-white text-purple-700 shadow-sm font-semibold"
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <Upload className="w-4 h-4" />
                        Scan Billede (OCR)
                    </button>
                    <button
                        onClick={() => setActiveTab("manual")}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                            activeTab === "manual"
                                ? "bg-white text-purple-700 shadow-sm font-semibold"
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <FileText className="w-4 h-4" />
                        Skriv Manuelt
                    </button>
                </div>
            )}

            {/* TAB 1: OCR File Upload Zone */}
            {activeTab === "ocr" && !previewUrl && !isCameraActive && (
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
                        <p className="text-gray-500 mb-4">eller klik for at vælge en fil</p>

                        <div className="flex justify-center mt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    startCamera();
                                }}
                                className="flex items-center gap-2 border-purple-200 text-purple-700 hover:bg-purple-50/50 px-5 py-2.5 rounded-xl transition-all shadow-sm"
                            >
                                <Camera className="w-4 h-4" />
                                Tag Billede 📷
                            </Button>
                        </div>
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

            {/* TAB 1: Live Camera Stream View */}
            {activeTab === "ocr" && !previewUrl && isCameraActive && (
                <Card variant="glass" className="overflow-hidden max-w-xl mx-auto p-4 relative">
                    <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3] sm:aspect-video flex items-center justify-center">
                        {/* Live video feed */}
                        <video
                            ref={videoRef}
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />

                        {/* Scanner/Framing Guides */}
                        <div className="absolute inset-6 border-2 border-white/40 border-dashed rounded-xl pointer-events-none flex items-center justify-center">
                            <span className="text-[10px] text-white/80 bg-black/50 px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold">
                                Indram bogside her
                            </span>
                        </div>

                        {/* Camera Switching (if multiple cameras are available) */}
                        {cameras.length > 1 && (
                            <button
                                type="button"
                                onClick={switchCamera}
                                className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-all shadow-md active:scale-95 z-10"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Camera Control Buttons */}
                    <div className="flex items-center justify-between mt-6 px-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={stopCamera}
                            className="text-gray-500"
                        >
                            Fortryd
                        </Button>

                        {/* Snap Button */}
                        <button
                            type="button"
                            onClick={capturePhoto}
                            className="w-16 h-16 rounded-full bg-white border-4 border-purple-500 flex items-center justify-center shadow-lg active:scale-90 transition-all cursor-pointer relative"
                        >
                            <span className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 block transition-colors" />
                        </button>

                        <div className="w-16" /> {/* Visual spacer for balance */}
                    </div>
                </Card>
            )}

            {/* TAB 2: Manual Word Input Form */}
            {activeTab === "manual" && !addWordsMutation.isPending && !addWordsMutation.isSuccess && !addedWordsSummary.length && (
                <Card variant="glass" className="p-8 max-w-xl mx-auto">
                    <form onSubmit={handleManualSubmit} className="space-y-6">
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-800">Hvor skal ordene gemmes? 💾</h3>
                            <p className="text-gray-600 text-sm mt-1">
                                Vælg en samling eller lav en ny til dine ord.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex p-1 bg-white border border-gray-200 rounded-xl">
                                <button
                                    type="button"
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
                                    type="button"
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
                                        placeholder="F.eks. Kapitel 1, Min yndlingsbog..."
                                        value={newCollectionName}
                                        onChange={(e) => setNewCollectionName(e.target.value)}
                                        className={cn(
                                            "w-full px-4 py-3 rounded-xl border focus:outline-none transition-all shadow-sm",
                                            isDuplicateName
                                                ? "border-amber-400 focus:ring-2 focus:ring-amber-400 bg-amber-50/30 text-amber-900"
                                                : "border-gray-200 focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white"
                                        )}
                                    />
                                    {isDuplicateName && (
                                        <p className="text-xs text-amber-600 font-medium ml-1">
                                            ⚠️ En samling med dette navn findes allerede. Vælg &quot;Eksisterende&quot; for at tilføje til den, eller vælg et andet navn.
                                        </p>
                                    )}
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

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 ml-1">
                                    Indtast ord
                                </label>
                                <Textarea
                                    rows={4}
                                    placeholder="Indtast ord adskilt af kommaer (f.eks. kartoffel, cykel, vindue)"
                                    value={manualWords}
                                    onChange={(e) => setManualWords(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-[3px] bg-white transition-all shadow-sm resize-none"
                                />
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                className="w-full py-6 text-lg font-bold shadow-lg shadow-purple-200 mt-2"
                            >
                                Tilføj ord 🚀
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* OCR Preview and Loading/Selection Area */}
            {activeTab === "ocr" && previewUrl && (
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

                    {!uploadMutation.isPending && !uploadMutation.isSuccess && !uploadMutation.isError && !pollingSourceId && !extractedWords.length && (
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
                                                placeholder="F.eks. Kapitel 1, Min yndlingsbog..."
                                                value={newCollectionName}
                                                onChange={(e) => setNewCollectionName(e.target.value)}
                                                className={cn(
                                                    "w-full px-4 py-3 rounded-xl border focus:outline-none transition-all shadow-sm",
                                                    isDuplicateName
                                                        ? "border-amber-400 focus:ring-2 focus:ring-amber-400 bg-amber-50/30 text-amber-900"
                                                        : "border-gray-200 focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white"
                                                )}
                                            />
                                            {isDuplicateName && (
                                                <p className="text-xs text-amber-600 font-medium ml-1">
                                                    ⚠️ En samling med dette navn findes allerede. Vælg &quot;Eksisterende&quot; for at tilføje til den, eller vælg et andet navn.
                                                </p>
                                            )}
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
                        {(uploadMutation.isPending || (pollingSourceId && uploadStatus?.status !== "failed" && uploadStatus?.status !== "completed")) && (
                            <div className="flex flex-col items-center justify-center gap-4 py-8">
                                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                                <div className="text-center">
                                    <span className="text-lg font-medium text-gray-700 block mb-1">
                                        {uploadMutation.isPending ? "Uploader billede..." : "Finder ord i billedet..."}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        Dette kan tage op til et minut. Vi arbejder i baggrunden! 🤖
                                    </span>
                                </div>
                            </div>
                        )}

                        {(uploadMutation.isError || isPollingError || uploadStatus?.status === "failed") && (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <X className="w-8 h-8 text-red-500" />
                                </div>
                                <p className="text-red-600 font-medium mb-4">
                                    Hov, noget gik galt!
                                </p>
                                <p className="text-sm text-gray-500 mb-6">
                                    {uploadMutation.error?.message || pollingError?.message || uploadStatus?.error || "Kunne ikke uploade billedet."}
                                </p>
                                <Button variant="outline" onClick={handleReset}>
                                    Prøv igen
                                </Button>
                            </div>
                        )}

                        {extractedWords.length > 0 && (
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
                                            const cid = uploadMutation.data?.collection_id || uploadStatus?.collection_id;
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

            {/* Manual Status, Loading, and Success States */}
            {activeTab === "manual" && (
                <div className="max-w-xl mx-auto">
                    {addWordsMutation.isPending && (
                        <Card className="p-8">
                            <div className="flex flex-col items-center justify-center gap-4 py-8">
                                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                                <div className="text-center">
                                    <span className="text-lg font-medium text-gray-700 block mb-1">
                                        Henter definitioner fra AI... 🤖
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        Dette kan tage et øjeblik, da vi analyserer ordene.
                                    </span>
                                </div>
                            </div>
                        </Card>
                    )}

                    {addWordsMutation.isError && (
                        <Card className="p-8">
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <X className="w-8 h-8 text-red-500" />
                                </div>
                                <p className="text-red-600 font-medium mb-4">
                                    Hov, noget gik galt!
                                </p>
                                <p className="text-sm text-gray-500 mb-6">
                                    {addWordsMutation.error?.message || "Kunne ikke tilføje ord."}
                                </p>
                                <Button variant="outline" onClick={handleReset}>
                                    Prøv igen
                                </Button>
                            </div>
                        </Card>
                    )}

                    {addWordsMutation.isSuccess && (
                        <Card className="p-8">
                            <div className="space-y-6">
                                <div className="flex flex-col items-center justify-center text-center gap-2">
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
                                        <Check className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800">
                                        {wordsAddedCount > 0 ? `Succes! Tilføjede ${wordsAddedCount} ord` : "Ingen nye ord tilføjet"}
                                    </h3>
                                    <p className="text-gray-600 text-sm">
                                        {wordsSkippedCount > 0 
                                            ? `${wordsSkippedCount} eksisterende ord blev sprunget over.` 
                                            : "Alle ord er nu oprettet med definitioner."}
                                    </p>
                                </div>

                                {addedWordsSummary.length > 0 && (
                                    <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {addedWordsSummary.map((word, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-purple-50/50 border border-purple-100 rounded-lg p-3 hover:bg-purple-50 transition-colors text-left"
                                            >
                                                <p className="font-bold text-purple-900">{word.text}</p>
                                                {word.definition && (
                                                    <p className="text-xs text-gray-600 mt-1">
                                                        {word.definition}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        className="flex-1"
                                        onClick={() => {
                                            window.location.href = successCollectionId ? `/practice?collection_id=${successCollectionId}` : "/practice";
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
                                        Tilføj flere ord
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
