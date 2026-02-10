// TypeScript interfaces for the Danish Vocabulary Builder

export interface Word {
    id: number;
    text: string;
    definition: string;
    read_count: number;
    spelling_verified: boolean;
    mastered: boolean;
    source_id?: number;
    syllables?: string;
    difficulty_score?: number;
    collection_id?: number;
}

export interface Collection {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
    word_count: number;
}

export interface UserProgress {
    total_points: number;
    words_mastered: number;
    spelling_streak: number;
    badges: number[];
}

export interface Badge {
    id: number;
    name: string;
    emoji: string;
    description: string;
    requirement_type: string;
    requirement_value: number;
    earned?: boolean;
}

export interface ExtractedWordsResponse {
    success: boolean;
    words_extracted: number;
    words_added: number;
    source_id: number;
    collection_id?: number;
    words: Word[];
}

export interface PracticeResponse {
    word: Word;
    points_earned: number;
    new_total_points: number;
    badges_earned?: Badge[];
}

export interface SpellingVerifyResponse {
    correct: boolean;
    word: Word;
    points_earned: number;
    new_total_points: number;
    badges_earned?: Badge[];
}
