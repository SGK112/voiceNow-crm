"""
RunPod Serverless Handler for XTTS v2
This handler processes TTS requests in a serverless environment.

Deploy to RunPod Serverless for pay-per-use TTS.
"""

import runpod
import torch
import base64
import io
import wave
import numpy as np
import os
from TTS.api import TTS

# Global model - loaded once when container starts
tts_model = None
device = "cuda" if torch.cuda.is_available() else "cpu"

# Default speaker voices
DEFAULT_VOICES = {
    "female_1": "Claribel Dervla",
    "female_2": "Daisy Studious",
    "female_3": "Gracie Wise",
    "female_4": "Tammie Ema",
    "male_1": "Alison Dietlinde",
    "male_2": "Ana Florence",
    "male_3": "Annmarie Nele",
    "male_4": "Asya Anara",
    # Mapped from ElevenLabs voice names
    "aria": "Claribel Dervla",
    "lily": "Daisy Studious",
    "charlotte": "Gracie Wise",
    "gigi": "Tammie Ema",
    "daniel": "Alison Dietlinde",
    "callum": "Ana Florence",
    "liam": "Annmarie Nele",
    "will": "Asya Anara",
}


def load_model():
    """Load the XTTS model (called once on cold start)"""
    global tts_model
    if tts_model is None:
        print(f"Loading XTTS model on {device}...")
        tts_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
        print("XTTS model loaded successfully!")
    return tts_model


def handler(job):
    """
    RunPod serverless handler for TTS requests.

    Input:
    {
        "input": {
            "text": "Hello, how are you?",
            "speaker_id": "aria",  # or female_1, male_1, etc.
            "language": "en",
            "temperature": 0.7,
            "output_format": "base64"  # or "url"
        }
    }

    Output:
    {
        "audio_base64": "...",  # Base64 encoded WAV audio
        "duration_seconds": 2.5,
        "sample_rate": 22050
    }
    """
    try:
        # Get input
        job_input = job.get("input", {})

        text = job_input.get("text", "")
        if not text:
            return {"error": "No text provided"}

        speaker_id = job_input.get("speaker_id", "aria").lower()
        language = job_input.get("language", "en")
        temperature = job_input.get("temperature", 0.7)
        output_format = job_input.get("output_format", "base64")

        # Load model if not already loaded
        model = load_model()

        # Get speaker name
        speaker = DEFAULT_VOICES.get(speaker_id, DEFAULT_VOICES["aria"])

        print(f"Generating TTS: '{text[:50]}...' with speaker {speaker}")

        # Generate audio
        wav = model.tts(
            text=text,
            speaker=speaker,
            language=language
        )

        # Convert to numpy array
        wav_np = np.array(wav)

        # Normalize audio
        wav_np = wav_np / np.max(np.abs(wav_np))

        # Convert to 16-bit PCM
        wav_int16 = (wav_np * 32767).astype(np.int16)

        # Calculate duration
        sample_rate = 22050
        duration_seconds = len(wav_int16) / sample_rate

        # Create WAV buffer
        buffer = io.BytesIO()
        with wave.open(buffer, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(wav_int16.tobytes())

        buffer.seek(0)
        audio_bytes = buffer.read()

        # Encode to base64
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')

        print(f"Generated {duration_seconds:.2f}s of audio")

        return {
            "audio_base64": audio_base64,
            "duration_seconds": duration_seconds,
            "sample_rate": sample_rate,
            "speaker": speaker,
            "text_length": len(text)
        }

    except Exception as e:
        print(f"Error in handler: {str(e)}")
        return {"error": str(e)}


# RunPod serverless entrypoint
runpod.serverless.start({"handler": handler})
