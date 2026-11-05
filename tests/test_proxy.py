import io
import wave

from fastapi.testclient import TestClient

from server.nim_proxy import MAX_AUDIO_BYTES, MAX_TTS_CHARACTERS, app


client = TestClient(app)


def test_health_reports_configuration():
    response = client.get("/health")
    assert response.status_code == 200
    assert set(response.json()) == {"ok", "key_configured"}
    assert "X-Request-ID" in response.headers


def test_tts_validates_text_and_language():
    assert client.post("/tts", json={"text": "", "lang": "en-IN"}).status_code == 400
    assert client.post("/tts", json={"text": "hello", "lang": "fr-FR"}).status_code == 400
    long_text = "x" * (MAX_TTS_CHARACTERS + 1)
    assert client.post("/tts", json={"text": long_text, "lang": "en-IN"}).status_code == 413


def test_stt_rejects_empty_audio():
    response = client.post("/stt", files={"audio": ("empty.webm", io.BytesIO(), "audio/webm")})
    assert response.status_code == 400


def test_wav_bytes_are_playable_mono_pcm():
    from server.nim_proxy import _wav_bytes

    audio = _wav_bytes(b"\0\0" * 100, 22050)
    with wave.open(io.BytesIO(audio)) as wav:
        assert wav.getnchannels() == 1
        assert wav.getsampwidth() == 2
        assert wav.getframerate() == 22050


def test_stt_body_limit():
    response = client.post(
        "/stt",
        content=b"x" * (MAX_AUDIO_BYTES + 1),
        headers={"content-type": "audio/webm"},
    )
    assert response.status_code == 413
