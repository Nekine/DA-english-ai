// ElevenLabs Speech-to-Text Service
// https://api.elevenlabs.io/docs/api-reference/speech-to-text

const ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";

/**
 * Gửi audio (wav/mp3/m4a/webm) lên ElevenLabs để nhận diện giọng nói (speech-to-text)
 * @param audioBlob Blob audio (nên là wav, mp3, m4a, webm)
 * @returns Văn bản nhận diện được
 */
export async function speechToText(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.wav");

    const response = await fetch(ELEVENLABS_STT_URL, {
        method: "POST",
        headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: formData
    });
    if (!response.ok) throw new Error("Failed to transcribe audio with ElevenLabs");
    const data = await response.json();
    // ElevenLabs trả về { text: "..." }
    return data.text || "";
}
// ElevenLabs Text-to-Speech Service
// Cảnh báo: Không commit API key lên repo công khai!

const ELEVENLABS_API_KEY = "sk_cae8fff84a4218d54ee4ea9501401ccfaee177b588beee48";
const ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Standard English voice, có thể thay đổi
const ELEVENLABS_TTS_URL = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;

export async function textToSpeech(text: string): Promise<Blob> {
    const response = await fetch(ELEVENLABS_TTS_URL, {
        method: "POST",
        headers: {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
            text,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.5
            }
        })
    });
    if (!response.ok) throw new Error("Failed to fetch audio from ElevenLabs");
    return await response.blob();
}
