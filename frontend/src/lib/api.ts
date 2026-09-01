import type {
    Word,
    UserProgress,
    Badge,
    PracticeResponse,
    SpellingVerifyResponse,
    Collection,
    UploadInitResponse,
    UploadStatusResponse,
    AddWordsRequest,
    AddWordsResponse,
} from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function fetchApi<T>(
    endpoint: string,
    options?: RequestInit
): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
        ...options,
    });

    if (!response.ok) {
        let errorMessage = `API Error: ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            if (errorData?.detail) {
                errorMessage = errorData.detail;
            }
        } catch {
            // Ignore parse errors
        }
        throw new Error(errorMessage);
    }

    return response.json();
}

// Upload image and extract words
export async function uploadImage(
    file: File,
    collectionId?: number,
    collectionName?: string
): Promise<UploadInitResponse> {
    const formData = new FormData();
    formData.append("file", file);
    if (collectionId) formData.append("collection_id", collectionId.toString());
    if (collectionName) formData.append("collection_name", collectionName);

    const response = await fetch(`${API_BASE_URL}/api/upload-image`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
    }

    return response.json();
}

// Check status of image extraction
export async function checkUploadStatus(
    sourceId: number
): Promise<UploadStatusResponse> {
    return fetchApi<UploadStatusResponse>(`/api/upload-status/${sourceId}`);
}

// Get next words to practice
export async function getNextWords(collectionId?: number): Promise<Word[]> {
    const url = collectionId
        ? `/api/words/next?collection_id=${collectionId}`
        : "/api/words/next";
    return fetchApi<Word[]>(url);
}

// Get specific word details
export async function getWord(id: number): Promise<Word> {
    return fetchApi<Word>(`/api/words/${id}`);
}

// Increment read counter for a word
export async function practiceWord(id: number): Promise<PracticeResponse> {
    return fetchApi<PracticeResponse>(`/api/words/${id}/practice`, {
        method: "POST",
    });
}

// Verify spelling attempt
export async function verifySpelling(
    id: number,
    attempt: string
): Promise<SpellingVerifyResponse> {
    return fetchApi<SpellingVerifyResponse>(`/api/words/${id}/verify-spelling`, {
        method: "POST",
        body: JSON.stringify({ spelling: attempt }),
    });
}

// Get TTS audio URL for a word
export function getWordTTSUrl(id: number): string {
    return `${API_BASE_URL}/api/words/${id}/tts`;
}

// Get user progress
export async function getProgress(): Promise<UserProgress> {
    return fetchApi<UserProgress>("/api/progress");
}

// Get all badges
export async function getBadges(): Promise<Badge[]> {
    return fetchApi<Badge[]>("/api/badges");
}

// Get all collections
export async function getCollections(): Promise<Collection[]> {
    return fetchApi<Collection[]>("/api/collections");
}

// Create a new collection
export async function createCollection(name: string): Promise<Collection> {
    return fetchApi<Collection>("/api/collections", {
        method: "POST",
        body: JSON.stringify({ name }),
    });
}

// Delete an empty collection
export async function deleteCollection(id: number): Promise<{ success: boolean; message: string }> {
    return fetchApi<{ success: boolean; message: string }>(`/api/collections/${id}`, {
        method: "DELETE",
    });
}

// Reset all progress
export async function resetProgress(): Promise<{ success: boolean; message: string }> {
    return fetchApi("/api/progress/reset", {
        method: "POST",
    });
}

// Add manual words to a collection
export async function addWordsToCollection(request: AddWordsRequest): Promise<AddWordsResponse> {
    return fetchApi<AddWordsResponse>("/api/collections/add-words", {
        method: "POST",
        body: JSON.stringify(request),
    });
}
