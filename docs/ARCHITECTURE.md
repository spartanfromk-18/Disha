# Disha architecture

## 6. Voice input and transcription providers

All voice input is routed through `js/transcription.js`. The default
`WebSpeechProvider` wraps the browser's existing `SpeechRecognition` API, so
the keyless path retains the original behavior and language selection.

When `settings.transcriptionProvider` is `wispr`, `WisprProvider` records from
the microphone with `MediaRecorder`, stops after silence or eight seconds,
renders the recording as mono 16 kHz PCM WAV with `OfflineAudioContext`, and
sends base64 audio to:

```text
POST https://api.wisprflow.ai/api/v1/transcribe
Authorization: Bearer WISPR_API_KEY
```

`WISPR_MOCK=true` bypasses microphone and network access and returns
`take me home`. A missing key or any Wispr capture, encoding, network, or
response error is surfaced to `transcribeOnce()`, which speaks a short notice
and retries with `WebSpeechProvider`. Therefore selecting Pro mode never
leaves the user without the default input path.

The commands **"use wispr mode"** and **"use browser mode"** persist the
provider in local settings. The header pill reflects the active provider.
Speech output remains in `js/speech.js`; command handling remains in
`js/commands.js`.
