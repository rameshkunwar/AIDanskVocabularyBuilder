import type {
    Word,
    UserProgress,
    Badge,
    ExtractedWordsResponse,
    PracticeResponse,
    SpellingVerifyResponse,
    Collection,
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
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

// Upload image and extract words
export async function uploadImage(
    file: File,
    collectionId?: number,
    collectionName?: string
): Promise<ExtractedWordsResponse> {
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
        body: JSON.stringify({ attempt }),
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

// Reset all progress
export async function resetProgress(): Promise<{ success: boolean; message: string }> {
    return fetchApi("/api/progress/reset", {
        method: "POST",
    });
}
