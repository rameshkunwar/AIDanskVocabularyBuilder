import os
import asyncio
import io
import wave
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

async def test():
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash-preview-tts")
        prompt = "Please pronounce this Danish word clearly and naturally: test"
        
        response = await model.generate_content_async(
            prompt,
            generation_config={"response_modalities": ["AUDIO"]}
        )
        parts = response.candidates[0].content.parts
        for p in parts:
            print("MIME:", p.inline_data.mime_type)
            if hasattr(p, 'inline_data') and hasattr(p.inline_data, 'mime_type') and p.inline_data.mime_type.startswith('audio'):
                print("MATCH!")
            else:
                print("NO MATCH")
    except Exception as e:
        print("ERROR:", e)

asyncio.run(test())
