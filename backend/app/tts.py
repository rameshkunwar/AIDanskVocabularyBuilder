"""
Text-to-Speech using DR.dk's API with Danish voice
"""
import os
import hashlib
from pathlib import Path
from typing import Optional
import httpx
from dotenv import load_dotenv

load_dotenv()

TTS_PROVIDER = os.getenv("TTS_PROVIDER", "dr").lower()

# Cache directory for audio files
AUDIO_CACHE_DIR = Path(__file__).parent.parent / "audio_cache"
AUDIO_CACHE_DIR.mkdir(exist_ok=True)


def get_cache_path(word: str, voice_id: str, provider: str) -> Path:
    """Generate cache file path for a word, specific voice, and provider"""
    # Hash includes word, voice and provider to avoid mixups
    extension = "wav" if provider == "local" else "mp3"
    cache_key = f"{word.lower()}_{voice_id}_{provider}"
    name_hash = hashlib.md5(cache_key.encode()).hexdigest()
    return AUDIO_CACHE_DIR / f"{name_hash}.{extension}"


async def get_audio(word: str) -> Optional[bytes]:
    """
    Get audio pronunciation for a Danish word.
    Uses DR (Danish Broadcasting Corporation) TTS.
    """
    # Check cache first
    cache_path = get_cache_path(word, "default", "dr")
    if cache_path.exists():
        return cache_path.read_bytes()
    
    # Generate new audio
    audio_bytes = await generate_audio_dr(word)
    
    if audio_bytes:
        cache_path.write_bytes(audio_bytes)
    
    return audio_bytes


async def generate_audio_dr(word: str) -> Optional[bytes]:
    """Generate audio using DR's public TTS endpoint"""
    url = f"https://www.dr.dk/tjenester/tts"
    params = {"text": word}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10.0)
            if response.status_code == 200:
                return response.content
            print(f"DR TTS API error: {response.status_code}")
            return None
    except Exception as e:
        print(f"Error calling DR TTS: {e}")
        return None


def clear_cache():
    """Clear all cached audio files"""
    for file in AUDIO_CACHE_DIR.glob("*.mp3"):
        file.unlink()