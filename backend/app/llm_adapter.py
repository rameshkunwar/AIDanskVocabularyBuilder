import os
import json
import base64
import httpx
from typing import Optional
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Load environment variables explicitly from the backend directory
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(dotenv_path=env_path)

# Configuration
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini").lower()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3-vl:235b-cloud") # Use user's cloud model as default
OLLAMA_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/generate")

print(f"DEBUG: LLM Config - Provider: {LLM_PROVIDER}, Model: {OLLAMA_MODEL}")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


def get_model():
    """Get the Gemini model instance"""
    return genai.GenerativeModel("gemini-2.0-flash")


async def extract_words_from_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> list[dict]:
    """
    Extract Danish words from a book page image.
    Uses either Gemini or local Ollama based on configuration.
    """
    if LLM_PROVIDER == "ollama":
        return await extract_words_with_ollama(image_bytes, mime_type)
    return await extract_words_with_gemini(image_bytes, mime_type)


async def extract_words_with_gemini(image_bytes: bytes, mime_type: str = "image/jpeg") -> list[dict]:
    """Original Gemini extraction logic"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("CRITICAL ERROR: GEMINI_API_KEY not found in environment!")
        return []

    model = get_model()
    image_part = {"mime_type": mime_type, "data": image_bytes}
    
    prompt = """Analyze this image of a Danish book page.

     Extract a comprehensive list of educational, descriptive, and interesting Danish words (aim for 20-30 words if the text allows).

STRICT EXCLUSION CRITERIA:
- Do NOT include common high-frequency stopwords, articles, prepositions, or simple pronouns.
- Specifically avoid words like: "at", "for", "en", "et", "og", "men", "eller", "det", "den", "de", "er", "var", "har", "jeg", "du", "vi", "her", "der".
- Focus instead on nouns, distinct verbs, and adjectives that add meaning to the text.

For each extracted word, provide a simple 1-sentence Danish definition suitable for a 3rd-grade child.

Return ONLY a valid JSON array of objects, with no other text or markdown formatting:
[
  {"word": "eksempel", "definition": "En forklaring der viser hvordan noget virker."},
  {"word": "eventyr", "definition": "En spændende historie der ofte handler om magi og helte."}
]
    
    """

    try:
        print(f"DEBUG: Processing image with Gemini. MIME: {mime_type}, Size: {len(image_bytes)} bytes")
        response = model.generate_content([prompt, image_part])
        
        if not response.candidates:
            print("DEBUG: Gemini returned no candidates (blocked?)")
            return []

        text = response.text.strip()
        return parse_words_json(text)
    except Exception as e:
        print(f"ERROR: Gemini extraction error: {e}")
        return []


async def extract_words_with_ollama(image_bytes: bytes, mime_type: str) -> list[dict]:
    """Extract words using a local Ollama vision model"""
    print(f"DEBUG: Using Ollama ({OLLAMA_MODEL}) for image extraction")
    
    # Ollama expects base64 for images
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    
    prompt = """Analyze this image of a Danish book page.

     Extract a comprehensive list of educational, descriptive, and interesting Danish words (aim for 20-30 words if the text allows).

STRICT EXCLUSION CRITERIA:
- Do NOT include common high-frequency stopwords, articles, prepositions, or simple pronouns.
- Specifically avoid words like: "at", "for", "en", "et", "og", "men", "eller", "det", "den", "de", "er", "var", "har", "jeg", "du", "vi", "her", "der".
- Focus instead on nouns, distinct verbs, and adjectives that add meaning to the text.

For each extracted word, provide a simple 1-sentence Danish definition suitable for a 3rd-grade child.

Return ONLY a valid JSON array of objects, with no other text or markdown formatting:
[
  {"word": "eksempel", "definition": "En forklaring der viser hvordan noget virker."},
  {"word": "eventyr", "definition": "En spændende historie der ofte handler om magi og helte."}
]"""

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "images": [image_b64],
        "stream": False,
        "format": "json"
    }

    try:
        # Increase timeout significantly for the massive 235B model
        # Cloud/high-parameter models can take minutes to process images
        async with httpx.AsyncClient(timeout=300.0) as client:
            print(f"DEBUG: Requesting Ollama... (Timeout set to 300s)")
            response = await client.post(OLLAMA_URL, json=payload)
            
            if response.status_code != 200:
                print(f"ERROR: Ollama returned {response.status_code}: {response.text}")
                return []
                
            result = response.json()
            text = result.get("response", "").strip()
            
            if not text:
                print(f"DEBUG: Ollama returned empty 'response' field. Full result keys: {list(result.keys())}")
                return []
                
            print(f"DEBUG: Ollama response length: {len(text)}")
            return parse_words_json(text)
    except httpx.ReadTimeout:
        print("ERROR: Ollama request timed out after 300 seconds. The 235B model might be too slow or busy.")
        return []
    except Exception as e:
        print(f"ERROR: Ollama extraction exception: {type(e).__name__}: {e}")
        return []


def parse_words_json(text: str) -> list[dict]:
    """Shared robust JSON parsing for list of words"""
    try:
        start_idx = text.find('[')
        end_idx = text.rfind(']') + 1
        if start_idx != -1 and end_idx != 0:
            json_text = text[start_idx:end_idx]
            return json.loads(json_text)
        print(f"DEBUG: No JSON array found in: {text[:100]}...")
    except Exception as e:
        print(f"DEBUG: JSON parsing error: {e}")
    return []


async def get_word_definition(word: str) -> Optional[str]:
    """Get definition using current provider"""
    prompt = f'Giv en simpel dansk definition af ordet "{word}" for et barn i 3. klasse. Én kort sætning.'

    if LLM_PROVIDER == "ollama":
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(
                    OLLAMA_URL,
                    json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
                )
                return res.json().get("response", "").strip()
        except Exception:
            return None

    try:
        model = get_model()
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception:
        return None


async def get_next_words_to_practice(words: list[dict], limit: int = 5) -> list[int]:
    """Prioritize words using current provider"""
    unmastered = [w for w in words if not w.get("mastered", False)]
    if not unmastered:
        return []
    
    # Sort initially by read count
    sorted_words = sorted(unmastered, key=lambda w: w.get("read_count", 0))
    if len(unmastered) <= limit:
        return [w["id"] for w in sorted_words]

    # For prioritization, we just use the sorted list as a smart fallback 
    # to avoid hitting quota for simple sorting logic
    return [w["id"] for w in sorted_words[:limit]]
