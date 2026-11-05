import io
import os
import shutil
import subprocess
import tempfile
import wave
from pathlib import Path

import riva.client
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

load_dotenv(Path(__file__).with_name(".env"))

NIM_URI = "grpc.nvcf.nvidia.com:443"
ASR_FUNCTION_ID = "71203149-d3b7-4460-8231-1be2543a1fca"
TTS_FUNCTION_ID = "877104f7-e885-42b9-8de8-f6e4c6303969"

app = FastAPI(title="Disha NVIDIA NIM proxy")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TtsRequest(BaseModel):
    text: str
    lang: str


def _key() -> str:
    return os.getenv("NVIDIA_API_KEY", "").strip()


def _auth(function_id: str) -> riva.client.Auth:
    key = _key()
    if not key:
        raise HTTPException(status_code=503, detail="NVIDIA_API_KEY is not configured")
    return riva.client.Auth(
        use_ssl=True,
        uri=NIM_URI,
        metadata_args=[
            ["function-id", function_id],
            ["authorization", f"Bearer {key}"],
        ],
    )


def _wav_bytes(pcm: bytes, sample_rate: int) -> bytes:
    output = io.BytesIO()
    with wave.open(output, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(pcm)
    return output.getvalue()


def _ffmpeg_exe() -> str | None:
    found = shutil.which("ffmpeg")
    if found:
        return found
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def _convert_to_wav(audio: bytes) -> bytes:
    ffmpeg = _ffmpeg_exe()
    if ffmpeg is None:
        raise HTTPException(status_code=500, detail="ffmpeg is not installed")
    with tempfile.TemporaryDirectory() as directory:
        input_path = Path(directory) / "input"
        output_path = Path(directory) / "output.wav"
        input_path.write_bytes(audio)
        try:
            subprocess.run(
                [
                    ffmpeg, "-y", "-i", str(input_path), "-ac", "1",
                    "-ar", "16000", "-sample_fmt", "s16", str(output_path),
                ],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
            )
        except FileNotFoundError as error:
            raise HTTPException(status_code=500, detail="ffmpeg is not installed") from error
        except subprocess.CalledProcessError as error:
            raise HTTPException(status_code=400, detail="Audio conversion failed") from error
        return output_path.read_bytes()


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True, "key_configured": bool(_key())}


@app.get("/")
def root() -> dict[str, bool]:
    return health()


@app.post("/stt")
async def stt(audio: UploadFile = File(...)) -> dict[str, str]:
    wav = _convert_to_wav(await audio.read())
    try:
        config = riva.client.RecognitionConfig(
            encoding=riva.client.AudioEncoding.LINEAR_PCM,
            sample_rate_hertz=16000,
            language_code="multi",
            max_alternatives=1,
            enable_automatic_punctuation=True,
            verbatim_transcripts=True,
        )
        service = riva.client.ASRService(_auth(ASR_FUNCTION_ID))
        responses = service.streaming_response_generator(
            (wav,),
            riva.client.StreamingRecognitionConfig(config=config, interim_results=False),
        )
        transcripts = [
            result.alternatives[0].transcript.strip()
            for response in responses
            for result in response.results
            if result.is_final and result.alternatives
        ]
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=502, detail="NIM speech recognition failed") from error
    transcript = " ".join(item for item in transcripts if item)
    if not transcript:
        raise HTTPException(status_code=502, detail="NIM returned no transcript")
    return {"transcript": transcript, "engine": "nim-parakeet"}


@app.post("/tts")
def tts(request: TtsRequest) -> Response:
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="text is required")
    voices = {
        "hi-IN": ("Magpie-Multilingual.HI-IN.Aria", "hi-IN"),
        "en-IN": ("Magpie-Multilingual.EN-US.Aria", "en-US"),
    }
    voice, language = voices.get(request.lang, voices["en-IN"])
    try:
        service = riva.client.SpeechSynthesisService(_auth(TTS_FUNCTION_ID))
        result = service.synthesize(
            request.text,
            voice,
            language,
            sample_rate_hz=22050,
        )
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=502, detail="NIM speech synthesis failed") from error
    return Response(
        content=_wav_bytes(result.audio, 22050),
        media_type="audio/wav",
        headers={"Cache-Control": "no-store"},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
