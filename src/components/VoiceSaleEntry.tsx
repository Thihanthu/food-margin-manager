import { useEffect, useRef, useState } from "react";
import { Mic, Square, Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Row } from "@/lib/store";
import { parseVoiceSale } from "@/lib/voice-sale";

const companionUrl = "http://127.0.0.1:8765";

function encodeWav(buffer: AudioBuffer): Blob {
  const channels = Math.min(1, buffer.numberOfChannels);
  const source = buffer.getChannelData(0);
  const targetRate = 16000;
  const outputLength = Math.max(1, Math.round((source.length * targetRate) / buffer.sampleRate));
  const output = new ArrayBuffer(44 + outputLength * 2);
  const view = new DataView(output);

  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index++)
      view.setUint8(offset + index, value.charCodeAt(index));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + outputLength * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, outputLength * 2, true);

  for (let index = 0; index < outputLength; index++) {
    const sourceIndex = Math.min(
      source.length - 1,
      Math.round((index * buffer.sampleRate) / targetRate),
    );
    const sample = Math.max(-1, Math.min(1, source[sourceIndex]));
    view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return new Blob([output], { type: "audio/wav" });
}

export function VoiceSaleEntry({
  products,
  onApply,
}: {
  products: Row[];
  onApply: (value: { productId: string; qty: number; customer: string }) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [message, setMessage] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  async function startRecording() {
    setMessage("");
    setTranscript("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () =>
        void transcribe(new Blob(chunksRef.current, { type: recorder.mimeType }));
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "မိုက်ကရိုဖုန်း အသုံးပြုခွင့် မရပါ။");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setRecording(false);
  }

  async function transcribe(audio: Blob) {
    setBusy(true);
    try {
      const audioContext = new AudioContext();
      const wav = encodeWav(await audioContext.decodeAudioData(await audio.arrayBuffer()));
      await audioContext.close();
      const bytes = new Uint8Array(await wav.arrayBuffer());
      let binary = "";
      bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });
      const response = await fetch(`${companionUrl}/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: btoa(binary) }),
      });
      if (!response.ok) throw new Error(await response.text());
      const result = (await response.json()) as { text?: string };
      const text = String(result.text ?? "").trim();
      setTranscript(text);
      if (!text) setMessage("အသံစာသား မထွက်လာပါ။ အနားရပ်ပြီး နားထောင်လွယ်အောင် ပြန်ပြောပါ။");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Nara companion မချိတ်ဆက်နိုင်ပါ။ ${error.message}`
          : "Nara companion မချိတ်ဆက်နိုင်ပါ။",
      );
    } finally {
      setBusy(false);
    }
  }

  function applyTranscript() {
    const parsed = parseVoiceSale(transcript, products);
    if (!parsed) {
      setMessage("ပစ္စည်းအမည်နှင့် အရေအတွက်ကို transcript မှ ရှာမတွေ့ပါ။");
      return;
    }
    onApply(parsed);
    setMessage("အသံစာသားကို စာရင်းဖောင်သို့ ထည့်ပြီးပါပြီ။");
  }

  return (
    <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">မြန်မာအသံဖြင့် အရောင်းဖြည့်ရန်</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Powered by Nara SAR · Audio stays on this device
          </p>
        </div>
        {recording ? (
          <Button type="button" variant="destructive" onClick={stopRecording}>
            <Square className="size-4" /> ရပ်ရန်
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => void startRecording()}
            disabled={busy}
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Mic className="size-4" />}
            {busy ? "စာသားပြောင်းနေသည်" : "အသံပြောရန်"}
          </Button>
        )}
      </div>
      {transcript && (
        <div className="mt-4 rounded-xl border bg-background p-3">
          <p className="text-xs text-muted-foreground">အသံမှ စာသား</p>
          <p className="mt-1 break-words">{transcript}</p>
          <Button type="button" size="sm" className="mt-3" onClick={applyTranscript}>
            <Check className="size-4" /> Form ထဲသို့ ထည့်ရန်
          </Button>
        </div>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  );
}
