import io
import json
import os
import sys
import urllib.request
import wave


BASE_URL = os.getenv("DISHA_NIM_URL", "http://127.0.0.1:8000")
SENTENCE = "This is a NVIDIA Parakeet smoke test."


def request_json(path: str, payload: dict) -> dict:
    body = json.dumps(payload).encode()
    request = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=body,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request) as response:
        return json.load(response)


def multipart_audio(wav: bytes) -> tuple[bytes, str]:
    boundary = "disha-smoke-test"
    body = (
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="audio"; filename="smoke.wav"\r\n'
        "Content-Type: audio/wav\r\n\r\n"
    ).encode() + wav + f"\r\n--{boundary}--\r\n".encode()
    return body, boundary


def main() -> int:
    tts_request = urllib.request.Request(
        f"{BASE_URL}/tts",
        data=json.dumps({"text": SENTENCE, "lang": "en-IN"}).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(tts_request) as response:
        audio = response.read()
        if response.headers.get_content_type() != "audio/wav":
            raise RuntimeError("TTS did not return audio/wav")
    with wave.open(io.BytesIO(audio), "rb") as wav:
        if (wav.getnchannels(), wav.getsampwidth(), wav.getframerate()) != (1, 2, 22050):
            raise RuntimeError("TTS WAV format is not mono 16-bit 22050 Hz")
    body, boundary = multipart_audio(audio)
    stt_request = urllib.request.Request(
        f"{BASE_URL}/stt",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with urllib.request.urlopen(stt_request) as response:
        result = json.load(response)
    transcript = result.get("transcript", "").strip()
    if not transcript:
        raise RuntimeError("STT returned no transcript")
    print(f"PASS transcript: {transcript}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"FAIL: {error}", file=sys.stderr)
        raise
