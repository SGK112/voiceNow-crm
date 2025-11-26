"""
XTTS v2 TTS Server
FastAPI server for text-to-speech using Coqui XTTS v2

Endpoints:
- POST /tts - Generate speech from text
- POST /clone - Clone a voice from audio sample
- GET /voices - List available voices
- GET /health - Health check
"""

import os
import io
import time
import uuid
import hashlib
from pathlib import Path
from typing import Optional

import torch
import numpy as np
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import Response, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from TTS.api import TTS

# Initialize FastAPI
app = FastAPI(
    title="XTTS TTS Server",
    description="Self-hosted text-to-speech using XTTS v2",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global TTS model
tts_model = None
device = "cuda" if torch.cuda.is_available() else "cpu"

# Voice storage directory
VOICES_DIR = Path("/app/voices")
VOICES_DIR.mkdir(exist_ok=True)

# Default speaker voices (built-in XTTS voices)
DEFAULT_VOICES = {
    "female_1": "Claribel Dervla",
    "female_2": "Daisy Studious",
    "female_3": "Gracie Wise",
    "female_4": "Tammie Ema",
    "male_1": "Alison Dietlinde",
    "male_2": "Ana Florence",
    "male_3": "Annmarie Nele",
    "male_4": "Asya Anara",
}

# Custom cloned voices (loaded from disk)
custom_voices = {}


class TTSRequest(BaseModel):
    text: str
    speaker_id: str = "female_1"
    language: str = "en"
    temperature: float = 0.7
    length_penalty: float = 1.0
    repetition_penalty: float = 2.0
    top_k: int = 50
    top_p: float = 0.85


class CloneRequest(BaseModel):
    name: str


@app.on_event("startup")
async def startup_event():
    """Load TTS model on startup"""
    global tts_model, custom_voices

    print(f"🚀 Starting XTTS server on {device}...")

    # Load XTTS v2 model
    try:
        tts_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
        print("✅ XTTS v2 model loaded successfully")
    except Exception as e:
        print(f"❌ Failed to load XTTS model: {e}")
        raise

    # Load custom voices from disk
    for voice_file in VOICES_DIR.glob("*.wav"):
        voice_name = voice_file.stem
        custom_voices[voice_name] = str(voice_file)
        print(f"📢 Loaded custom voice: {voice_name}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "device": device,
        "model": "xtts_v2",
        "cuda_available": torch.cuda.is_available(),
        "voices_loaded": len(custom_voices)
    }


@app.get("/voices")
async def list_voices():
    """List all available voices"""
    voices = []

    # Add default voices
    for voice_id, voice_name in DEFAULT_VOICES.items():
        voices.append({
            "id": voice_id,
            "name": voice_name,
            "type": "builtin",
            "language": "multilingual"
        })

    # Add custom voices
    for voice_id, voice_path in custom_voices.items():
        voices.append({
            "id": voice_id,
            "name": voice_id,
            "type": "custom",
            "language": "multilingual"
        })

    return {"voices": voices}


@app.post("/tts")
async def text_to_speech(request: TTSRequest):
    """Generate speech from text"""
    global tts_model

    if tts_model is None:
        raise HTTPException(status_code=503, detail="TTS model not loaded")

    start_time = time.time()

    try:
        # Determine speaker wav or speaker name
        speaker_wav = None
        speaker = None

        if request.speaker_id in custom_voices:
            # Use custom cloned voice
            speaker_wav = custom_voices[request.speaker_id]
        elif request.speaker_id in DEFAULT_VOICES:
            # Use built-in speaker
            speaker = DEFAULT_VOICES[request.speaker_id]
        else:
            # Default to first female voice
            speaker = DEFAULT_VOICES["female_1"]

        # Generate audio
        if speaker_wav:
            # Clone voice synthesis
            wav = tts_model.tts(
                text=request.text,
                speaker_wav=speaker_wav,
                language=request.language,
                temperature=request.temperature,
                length_penalty=request.length_penalty,
                repetition_penalty=request.repetition_penalty,
                top_k=request.top_k,
                top_p=request.top_p
            )
        else:
            # Standard synthesis with built-in speaker
            wav = tts_model.tts(
                text=request.text,
                speaker=speaker,
                language=request.language
            )

        # Convert to bytes
        wav_np = np.array(wav)

        # Normalize audio
        wav_np = wav_np / np.max(np.abs(wav_np))

        # Convert to 16-bit PCM
        wav_int16 = (wav_np * 32767).astype(np.int16)

        # Create WAV buffer
        import wave
        buffer = io.BytesIO()
        with wave.open(buffer, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(22050)
            wf.writeframes(wav_int16.tobytes())

        buffer.seek(0)

        generation_time = time.time() - start_time
        print(f"✅ Generated {len(request.text)} chars in {generation_time:.2f}s")

        return Response(
            content=buffer.read(),
            media_type="audio/wav",
            headers={
                "X-Generation-Time": str(generation_time),
                "X-Text-Length": str(len(request.text))
            }
        )

    except Exception as e:
        print(f"❌ TTS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/clone")
async def clone_voice(
    audio: UploadFile = File(...),
    name: str = Form(...)
):
    """Clone a voice from audio sample"""
    global custom_voices

    if tts_model is None:
        raise HTTPException(status_code=503, detail="TTS model not loaded")

    try:
        # Validate name
        safe_name = "".join(c for c in name if c.isalnum() or c in "_-").lower()
        if not safe_name:
            raise HTTPException(status_code=400, detail="Invalid voice name")

        # Save uploaded audio
        voice_path = VOICES_DIR / f"{safe_name}.wav"

        content = await audio.read()
        with open(voice_path, "wb") as f:
            f.write(content)

        # Register voice
        custom_voices[safe_name] = str(voice_path)

        print(f"✅ Cloned voice saved: {safe_name}")

        return {
            "success": True,
            "speaker_id": safe_name,
            "message": f"Voice '{safe_name}' cloned successfully"
        }

    except Exception as e:
        print(f"❌ Clone error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/voices/{voice_id}")
async def delete_voice(voice_id: str):
    """Delete a custom voice"""
    global custom_voices

    if voice_id not in custom_voices:
        raise HTTPException(status_code=404, detail="Voice not found")

    if voice_id in DEFAULT_VOICES:
        raise HTTPException(status_code=400, detail="Cannot delete built-in voice")

    # Delete file
    voice_path = Path(custom_voices[voice_id])
    if voice_path.exists():
        voice_path.unlink()

    # Remove from registry
    del custom_voices[voice_id]

    return {"success": True, "message": f"Voice '{voice_id}' deleted"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
