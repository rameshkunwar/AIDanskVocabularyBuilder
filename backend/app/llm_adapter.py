"""
LLM Adapter Module

This module handles all external integrations with Large Language Models (LLMs)
using Pydantic AI. By defining strict structural models (WordList, DefinitionResult),
it enforces deterministic JSON output and abstracts away the underlying provider
(e.g., Gemini vs Ollama).
"""

import os
from typing import Optional
from dotenv import load_dotenv

from pydantic import BaseModel, Field
from pydantic_ai import Agent
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.messages import BinaryImage

# ---------------------------------------------------------
# Configuration Initialization
# ---------------------------------------------------------
# Standard environment loading
load_dotenv()

# Aggressive secondary loading from the backend directory
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(dotenv_path=env_path)

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini").lower()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# For Ollama models (which conform to the OpenAI API schema via v1 routing)
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3-vl:235b-cloud")
OLLAMA_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/generate")

print(f"DEBUG: LLM Config - Provider: {LLM_PROVIDER}")


# ---------------------------------------------------------
# Data Schemas (Pydantic)
# ---------------------------------------------------------

class ExtractedWord(BaseModel):
    """Schema representing a single extracted word and its definition."""
    word: str = Field(description="The extracted Danish vocabulary word.")
    definition: str = Field(description="A simple 1-sentence Danish definition suitable for a 3rd-grade child.")


class WordList(BaseModel):
    """Schema representing the total expected extraction output from an image."""
    words: list[ExtractedWord] = Field(description="List of extracted educational Danish words.")


class DefinitionResult(BaseModel):
    """Schema for requesting a single word definition."""
    definition: str = Field(description="A simple 1-sentence Danish definition suitable for a 3rd-grade child.")


# ---------------------------------------------------------
# Agent Factory
# ---------------------------------------------------------

def get_vision_agent() -> Agent:
    """
    Constructs a Pydantic AI Agent pre-configured with the active LLM provider.
    The agent essentially acts as a strict mapper, guaranteeing that output matches
    the `WordList` schema without hallucination.
    """
    if LLM_PROVIDER == "ollama":
        # Pydantic AI natively interacts with standard v1 OpenAI endpoints.
        # So we adapt the standard `/api/generate` Ollama URL backwards.
        base_url = OLLAMA_URL.replace("/api/generate", "/v1")
        provider = OpenAIProvider(base_url=base_url, api_key="ollama")
        model = OpenAIChatModel(OLLAMA_MODEL, provider=provider)
    else:
        # Default natively to the high-performance Gemini 2.0 system.
        # The GEMINI_API_KEY environment variable is automatically detected by GoogleModel.
        model = GoogleModel("gemini-2.0-flash")
        
    return Agent(model, output_type=WordList)


def get_text_agent() -> Agent:
    """
    Constructs a specialized Pydantic AI agent geared purely towards text output
    like single dictionary definitions.
    """
    if LLM_PROVIDER == "ollama":
        base_url = OLLAMA_URL.replace("/api/generate", "/v1")
        provider = OpenAIProvider(base_url=base_url, api_key="ollama")
        model = OpenAIChatModel(OLLAMA_MODEL, provider=provider)
    else:
        model = GoogleModel("gemini-2.0-flash")
        
    return Agent(model, output_type=DefinitionResult)


# ---------------------------------------------------------
# Core Abstractions
# ---------------------------------------------------------

async def extract_words_from_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> list[dict]:
    """
    Analyzes an image structurally to extract interesting Danish words.
    
    Args:
        image_bytes: The raw data stream of the image
        mime_type: The standard MIME (e.g. image/jpeg, image/png)
        
    Returns:
        A list of dictionaries representing standard Danish words,
        fully type-checked prior to return. Example:
        [{"word": "eksempel", "definition": "..."}]
    """
    prompt = (
        "Analyze this image of a Danish book page. "
        "Extract a comprehensive list of educational, descriptive, and interesting Danish words "
        "(aim for 20-30 words if the text allows). "
        "STRICT EXCLUSION CRITERIA: "
        "- Do NOT include common high-frequency stopwords, articles, prepositions, or simple pronouns. "
        "- Specifically avoid words like: 'at', 'for', 'en', 'et', 'og', 'men', 'eller', 'det', 'den', 'de', 'er', 'var', 'har', 'jeg', 'du', 'vi', 'her', 'der'. "
        "Focus instead on nouns, distinct verbs, and adjectives that add meaning to the text."
    )
    
    # Structure the input dynamically
    # `BinaryImage` encapsulates the binary payload properly for Pydantic AI
    img_payload = BinaryImage(data=image_bytes, media_type=mime_type)
    
    prompt_parts = [prompt, img_payload]
    
    agent = get_vision_agent()
    
    try:
        print(f"DEBUG: Triggering Pydantic API Image processing (Size: {len(image_bytes)} bytes)")
        
        # We pass prompt elements to agent run cycle.
        # Pydantic AI natively takes over here handling logic, parsing schema, and syntax retries.
        result = await agent.run(prompt_parts)
        
        # We serialize back to dictionary to maintain complete compatibility
        # with endpoints and the underlying API routes.
        return [word.model_dump() for word in result.data.words]
    
    except Exception as e:
        print(f"ERROR: Pydantic AI Structural Exception: {type(e).__name__}: {e}")
        return []


async def get_word_definition(word: str) -> Optional[str]:
    """
    Fetches a guaranteed one-sentence definition block struct internally through Pydantic.
    """
    agent = get_text_agent()
    prompt = f'Giv en simpel dansk definition af ordet "{word}" for et barn i 3. klasse. Én kort sætning.'
    
    try:
        result = await agent.run(prompt)
        return result.data.definition
    except Exception as e:
        print(f"ERROR: Agent definition retrieval issue: {e}")
        return None


async def get_next_words_to_practice(words: list[dict], limit: int = 5) -> list[int]:
    """
    Prioritize learning words locally array manipulation.
    A fallback to standard logical sorting.
    """
    unmastered = [w for w in words if not w.get("mastered", False)]
    if not unmastered:
        return []
    
    # Sort initially intelligently by read count historically in standard python
    sorted_words = sorted(unmastered, key=lambda w: w.get("read_count", 0))
    if len(unmastered) <= limit:
        return [w["id"] for w in sorted_words]

    return [w["id"] for w in sorted_words[:limit]]
