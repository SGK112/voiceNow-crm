# RunPod Serverless XTTS v2
# Build and push to Docker Hub, then deploy on RunPod

FROM runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV COQUI_TOS_AGREED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    TTS==0.22.0 \
    runpod==1.6.0 \
    numpy==1.24.3 \
    scipy==1.11.4

# Pre-download XTTS model during build (faster cold starts)
RUN python -c "from TTS.api import TTS; TTS('tts_models/multilingual/multi-dataset/xtts_v2')"

# Copy handler
WORKDIR /app
COPY handler.py /app/handler.py

# RunPod serverless entrypoint
CMD ["python", "-u", "handler.py"]
