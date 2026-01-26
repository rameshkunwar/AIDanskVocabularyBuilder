# AIDanskVocabularyBuilder 🇩🇰

A Danish vocabulary learning app for children that uses AI to extract words from book pages and helps kids learn through repetition and gamification.

## Features

- 📚 **Book Page Upload**: Upload images of Danish book pages
- 🤖 **AI Word Extraction**: Uses Gemini API to extract words and generate kid-friendly definitions
- 🔊 **Text-to-Speech**: Danish pronunciation via ElevenLabs
- ⭐ **Gamification**: Points, badges, and streaks for motivation
- ✍️ **Spelling Practice**: Type words correctly to master them

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 19 + TypeScript + Tailwind CSS |
| Backend | FastAPI + SQLModel + SQLite |
| LLM | Google Gemini API (free tier) |
| TTS | ElevenLabs |

## Quick Start

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Add API keys to .env
echo "GEMINI_API_KEY=your_key" >> .env

uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Documentation

See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for detailed architecture and API documentation.

## License

See [LICENSE](LICENSE) file.
