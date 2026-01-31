# import os
# # Set HF_HOME before any transformers imports
# CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "hf_cache")
# os.makedirs(CACHE_DIR, exist_ok=True)
# os.environ["HF_HOME"] = CACHE_DIR
# os.environ["HUGGINGFACE_HUB_CACHE"] = CACHE_DIR

# import torch
# from transformers import CsmForConditionalGeneration, AutoProcessor
# import io
# from pathlib import Path
# from typing import Optional

# class LocalTTSProvider:
#     _instance = None
#     _model = None
#     _processor = None
#     _device = "cuda" if torch.cuda.is_available() else "cpu"
#     _model_id = "nicolajreck/csm-1b-danish-tts"

#     def __new__(cls):
#         if cls._instance is None:
#             cls._instance = super(LocalTTSProvider, cls).__new__(cls)
#         return cls._instance

#     def _load_model(self):
#         if self._model is None:
#             print(f"DEBUG: Loading Local CSM Model ({self._model_id}) on {self._device}...")
#             try:
#                 # Official classes from model card
#                 self._model = CsmForConditionalGeneration.from_pretrained(
#                     self._model_id,
#                     cache_dir=CACHE_DIR,
#                     trust_remote_code=True
#                 ).to(self._device)
                
#                 self._processor = AutoProcessor.from_pretrained(
#                     self._model_id,
#                     cache_dir=CACHE_DIR,
#                     trust_remote_code=True
#                 )
                
#                 print(f"DEBUG: CSM Model and Processor loaded successfully on {self._device}!")
#             except Exception as e:
#                 print(f"ERROR: Failed to load CSM model: {type(e).__name__}: {e}")
#                 raise e

#     async def generate_dan_audio(self, text: str) -> Optional[bytes]:
#         """Generate high-quality Danish audio using official processor settings"""
#         import tempfile
#         import shutil
        
#         try:
#             self._load_model()
            
#             # Use requested speaker prefix ([0] - Male)
#             voice_text = f"[0]{text}"
#             print(f"DEBUG: Generating voice audio for: '{voice_text}'...")
            
#             # Official preprocessing
#             inputs = self._processor(text=voice_text, add_special_tokens=True, return_tensors="pt").to(self._device)

#             with torch.no_grad():
#                 # Official generation settings
#                 output = self._model.generate(
#                     **inputs,
#                     output_audio=True,
#                     do_sample=True,
#                     temperature=0.96,
#                     depth_decoder_temperature=0.7, 
#                     top_k=50,
#                     top_p=0.9,
#                     repetition_penalty=1.0
#                 )
            
#             # Use a temporary file to save the audio
#             with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
#                 tmp_path = tmp_file.name
            
#             try:
#                 # The official processor handles decoding and PCM conversion internally
#                 self._processor.save_audio(output, tmp_path)
                
#                 # Read back the high-quality file
#                 with open(tmp_path, "rb") as f:
#                     audio_bytes = f.read()
                
#                 print(f"DEBUG: Audio generation complete ({len(audio_bytes)} bytes).")
#                 return audio_bytes
#             finally:
#                 # Cleanup temporary file
#                 if os.path.exists(tmp_path):
#                     os.remove(tmp_path)

#         except Exception as e:
#             print(f"ERROR: Local TTS Generation failed: {type(e).__name__}: {e}")
#             import traceback
#             traceback.print_exc()
#             return None

# # Singleton access
# local_tts = LocalTTSProvider()
