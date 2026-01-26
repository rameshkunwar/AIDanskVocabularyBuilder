# AIDanskVocabularyBuilder - Implementation Plan

A Danish vocabulary builder app for a 3rd-grade student that extracts words from book pages, presents them for practice with TTS, tracks reading repetitions, and verifies spelling mastery.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 + React Compiler, TypeScript, Tailwind CSS v4, custom UI components |
| **Libraries** | React Router 7, TanStack Query, Lucide React, clsx, tailwind-merge |
| **Backend** | FastAPI, SQLModel, SQLite |
| **LLM** | Google Gemini API (free tier via AI Studio) |
| **TTS** | ElevenLabs (Danish voice) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React 19)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  UploadPage  │  │ PracticePage │  │ ProgressPage │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI)                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │                  API Endpoints                      │     │
│  │  /upload-image  /words/next  /words/{id}/practice  │     │
│  │  /words/{id}/verify-spelling  /words/{id}/tts      │     │
│  │  /progress  /badges                                 │     │
│  └────────────────────────────────────────────────────┘     │
│           │                │                │               │
│           ▼                ▼                ▼               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ llm_adapter  │  │     tts      │  │   SQLite     │      │
│  │ (Gemini API) │  │ (ElevenLabs) │  │  (vocab.db)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Models

### Word
- `id`, `text`, `definition` (Danish, kid-friendly)
- `read_count` (target: 5), `spelling_verified`, `mastered`
- `source_id`, `syllables`, `difficulty_score`

### UserProgress
- `total_points`, `words_mastered`, `spelling_streak`
- `badges` (JSON array of badge IDs)

### Badge
- `name`, `emoji`, `description`
- `requirement_type`, `requirement_value`

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload-image` | POST | Upload book page, extract words + definitions via LLM |
| `/api/words/next` | GET | Get next words to practice (LLM prioritized) |
| `/api/words/{id}` | GET | Get specific word details |
| `/api/words/{id}/practice` | POST | Increment read counter, award points |
| `/api/words/{id}/verify-spelling` | POST | Check spelling, award badges |
| `/api/words/{id}/tts` | GET | Get audio pronunciation (MP3) |
| `/api/progress` | GET | Get stats, points, badges |
| `/api/badges` | GET | Get all available badges |

---

## Gamification System

| Action | Points | Badge |
|--------|--------|-------|
| Read a word | +5 | - |
| First word read | - | 🐣 First Steps |
| Word mastered | +20 | - |
| 5 words mastered | +50 | ⚔️ Word Warrior |
| 10 words mastered | +100 | 🛡️ Vocabulary Viking |
| 25 words mastered | - | 👑 Word Master |
| 5 correct spellings in a row | +30 | ⭐ Spelling Star |
| Daily practice | +10 | 📚 Daily Learner |

---

## User Flow

1. **Upload**: Parent uploads book page image
2. **Extract**: LLM extracts Danish words + kid-friendly definitions
3. **Practice**: Child sees word card with TTS button
4. **Read**: Click "I read it!" 5 times (with audio playback)
5. **Spell**: Type the word correctly to master it
6. **Celebrate**: Earn points and badges! 🎉

---

## Setup Instructions

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Add to `.env`:
```
ELEVENLABS_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here  # Get free from https://aistudio.google.com
```

Run:
```bash
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Frontend Structure
```
frontend/src/
├── components/      # WordCard, Badge, PointsDisplay, Layout, Celebration
│   └── ui/          # Reusable Button, Card, Input, Progress
├── lib/             # api.ts (Backend client), utils.ts (styling)
├── pages/           # UploadPage, PracticePage, ProgressPage
├── types/           # index.ts (TypeScript interfaces)
├── App.tsx          # Routes & QueryClient
└── index.css        # Tailwind v4 & Animations
```

---

## Future Features (v2)
- 🎤 Pronunciation feedback via speech recognition
- 🔄 Spaced repetition for mastered words
- 📊 Parent dashboard with progress reports
