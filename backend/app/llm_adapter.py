"""
LLM Adapter using Google Gemini API (free tier)
Handles: OCR word extraction, definitions, and practice prioritization
"""
import os
import json
import base64
from typing import Optional
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


def get_model():
    """Get the Gemini model instance"""
    return genai.GenerativeModel("gemini-1.5-flash")


async def extract_words_from_image(image_bytes: bytes) -> list[dict]:
    """
    Extract Danish words from a book page image using Gemini Vision.
    Returns list of {word, definition} dicts.
    """
    model = get_model()
    
    # Prepare the image for Gemini
    image_data = {
        "mime_type": "image/jpeg",
        "data": base64.b64encode(image_bytes).decode("utf-8")
    }
    
    prompt = """Analyze this Danish children's book page and extract all readable Danish words.

For each word, provide:
1. The word itself (lowercase, cleaned)
2. A simple Danish definition suitable for a 3rd-grade child (1 sentence max)

Return ONLY a JSON array like this, with no other text:
[
  {"word": "hund", "definition": "Et dyr der siger vov"},
  {"word": "hus", "definition": "Et sted hvor mennesker bor"}
]

Rules:
- Skip very common words like: og, i, en, et, er, at, den, det, de, på, til, med, for, af, som
- Include nouns, verbs, and adjectives that are educational
- Keep definitions simple and child-friendly in Danish
- Return at least 5 words if possible"""

    try:
        response = model.generate_content([prompt, image_data])
        
        # Parse JSON from response
        text = response.text.strip()
        # Remove markdown code blocks if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0]
        
        words = json.loads(text)
        return words
    except Exception as e:
        print(f"Error extracting words: {e}")
        return []


async def get_word_definition(word: str) -> Optional[str]:
    """
    Get a simple Danish definition for a word.
    Used when extracting words without image context.
    """
    model = get_model()
    
    prompt = f"""Giv en simpel dansk definition af ordet "{word}" for et barn i 3. klasse.
Svaret skal være én kort sætning på dansk. Kun definitionen, intet andet."""

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error getting definition for {word}: {e}")
        return None


async def get_next_words_to_practice(words: list[dict], limit: int = 5) -> list[int]:
    """
    Use LLM to prioritize which words to practice next.
    
    Args:
        words: List of word dicts with id, text, read_count, mastered, difficulty_score
        limit: Max number of word IDs to return
    
    Returns:
        List of word IDs in priority order
    """
    # Filter out mastered words
    unmastered = [w for w in words if not w.get("mastered", False)]
    
    if not unmastered:
        return []
    
    # If few words, just return them sorted by read_count
    if len(unmastered) <= limit:
        sorted_words = sorted(unmastered, key=lambda w: w.get("read_count", 0))
        return [w["id"] for w in sorted_words]
    
    model = get_model()
    
    # Prepare word data for LLM
    word_data = [
        {
            "id": w["id"],
            "word": w["text"],
            "read_count": w.get("read_count", 0),
            "difficulty": w.get("difficulty_score", 0.5)
        }
        for w in unmastered
    ]
    
    prompt = f"""Du er en lærer der hjælper et barn med at lære danske ord.

Her er ordene barnet øver på (JSON format):
{json.dumps(word_data, ensure_ascii=False)}

Vælg de {limit} bedste ord at øve næste gang. Prioriter:
1. Ord med lav read_count (barnet skal øve dem mere)
2. Blanding af svære og nemme ord for motivation
3. Variation i ordtyper

Returner KUN en JSON array med ord-ID'erne i prioriteret rækkefølge, f.eks: [3, 7, 1, 5, 2]"""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Remove markdown if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            text = text.rsplit("```", 1)[0]
        
        word_ids = json.loads(text)
        return word_ids[:limit]
    except Exception as e:
        print(f"Error prioritizing words: {e}")
        # Fallback: sort by read_count
        sorted_words = sorted(unmastered, key=lambda w: w.get("read_count", 0))
        return [w["id"] for w in sorted_words[:limit]]
