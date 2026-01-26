"""
Text-to-Speech using ElevenLabs API with Danish voice
"""
import os
import hashlib
from pathlib import Path
from typing import Optional
import httpx
from dotenv import load_dotenv

load_dotenv()

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech"

# Danish voice ID from ElevenLabs (Freya - Danish female voice)
# You can change this to another Danish voice ID
DANISH_VOICE_ID = "jsCqWAovK2LkecY7zXl4"  # Freya voice

# Cache directory for audio files
AUDIO_CACHE_DIR = Path(__file__).parent.parent / "audio_cache"
AUDIO_CACHE_DIR.mkdir(exist_ok=True)


def get_cache_path(word: str) -> Path:
    """Generate cache file path for a word"""
    word_hash = hashlib.md5(word.lower().encode()).hexdigest()
    return AUDIO_CACHE_DIR / f"{word_hash}.mp3"


async def get_audio(word: str) -> Optional[bytes]:
    """
    Get audio pronunciation for a Danish word.
    Uses cache to avoid repeated API calls.
    
    Args:
        word: The Danish word to pronounce
        
    Returns:
        MP3 audio bytes or None if failed
    """
    # Check cache first
    cache_path = get_cache_path(word)
    if cache_path.exists():
        return cache_path.read_bytes()
    
    # Generate new audio
    audio_bytes = await generate_audio(word)
    
    if audio_bytes:
        # Save to cache
        cache_path.write_bytes(audio_bytes)
    
    return audio_bytes


async def generate_audio(word: str) -> Optional[bytes]:
    """
    Generate audio for a word using ElevenLabs API.
    
    Args:
        word: The Danish word to pronounce
        
    Returns:
        MP3 audio bytes or None if failed
    """
    if not ELEVENLABS_API_KEY:
        print("Warning: ELEVENLABS_API_KEY not set")
        return None
    
    url = f"{ELEVENLABS_API_URL}/{DANISH_VOICE_ID}"
    
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }
    
    data = {
        "text": word,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True
        }
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers=headers,
                json=data,
                timeout=30.0
            )
            
            if response.status_code == 200:
                return response.content
            else:
                print(f"ElevenLabs API error: {response.status_code} - {response.text}")
                return None
                
    except Exception as e:
        print(f"Error generating audio for '{word}': {e}")
        return None


def clear_cache():
    """Clear all cached audio files"""
    for file in AUDIO_CACHE_DIR.glob("*.mp3"):
        file.unlink()