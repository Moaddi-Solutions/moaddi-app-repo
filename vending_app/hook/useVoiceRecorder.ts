import {
  AudioQuality,
  IOSOutputFormat,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { classifyPermission } from "~/lib/permissions";

/** Server rejects audio over 120 s worth of bytes; stop before we get there. */
export const MAX_VOICE_DURATION_MS = 120_000;

/**
 * Deliberately NOT `RecordingPresets.HIGH_QUALITY`.
 *
 * moaddi-server caps audio at 1 MiB (mediaSniff.ts) because bytes are the only
 * real bound it can place on duration. The default preset records AAC at
 * 128 kbps, which blows that cap after roughly 65 seconds — a voice note would
 * fail at upload with a 413 after the user had already recorded it.
 *
 * 32 kbps mono matches the bitrate the web recorder pins, putting a full
 * 120 s note at roughly 480 KB with comfortable headroom. Both platforms
 * produce an `ftyp` MPEG-4 container ("M4A " on iOS, "isom"/"mp42" on Android),
 * all of which the server's content sniffer accepts as audio/mp4.
 */
const VOICE_RECORDING_OPTIONS: RecordingOptions = {
  extension: ".m4a",
  sampleRate: 22050,
  numberOfChannels: 1,
  bitRate: 32000,
  isMeteringEnabled: true,
  android: {
    outputFormat: "mpeg4",
    audioEncoder: "aac",
  },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.LOW,
    bitDepthHint: 16,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 32000,
  },
};

export type VoiceRecording = {
  uri: string;
  name: string;
  mimeType: string;
  durationMs: number;
};

export type StartFailure =
  /** Mic refused, but the OS will ask again next time. */
  | "permission"
  /** Mic hard-refused: only the Settings app can grant it now. */
  | "blocked"
  /** The recorder itself failed to come up. */
  | "start";

/**
 * Returned rather than only stashed in state: the caller checks the outcome
 * immediately after awaiting `start()`, and a state value read at that point is
 * still the previous render's, so the very first refusal would go unreported.
 */
export type StartResult = { ok: true } | { ok: false; reason: StartFailure };

/**
 * Hold-to-record voice notes.
 *
 * `stop()` resolves with the finished file, or `null` when the take was too
 * short to be intentional (a tap rather than a hold).
 */
export function useVoiceRecorder() {
  const recorder = useAudioRecorder(VOICE_RECORDING_OPTIONS);
  const state = useAudioRecorderState(recorder, 100);
  const [error, setError] = useState<StartFailure | null>(null);
  const cancelledRef = useRef(false);
  const startedAtRef = useRef(0);

  const start = useCallback(async (): Promise<StartResult> => {
    setError(null);
    cancelledRef.current = false;
    const fail = (reason: StartFailure): StartResult => {
      setError(reason);
      return { ok: false, reason };
    };
    try {
      const outcome = classifyPermission(
        await requestRecordingPermissionsAsync(),
      );
      if (outcome !== "granted") {
        // "blocked" is passed through so the caller can offer the Settings
        // route — re-requesting would silently resolve denied forever.
        return fail(outcome === "blocked" ? "blocked" : "permission");
      }
      // iOS records silently unless the session is switched to a recording mode.
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedAtRef.current = Date.now();
      return { ok: true };
    } catch (cause: any) {
      console.warn("[chat] recording failed to start:", cause?.message);
      return fail("start");
    }
  }, [recorder]);

  const stop = useCallback(async (): Promise<VoiceRecording | null> => {
    if (!recorder.isRecording) return null;
    const elapsed = Date.now() - startedAtRef.current;
    try {
      await recorder.stop();
      // Release the recording session so playback returns to normal volume.
      await setAudioModeAsync({ allowsRecording: false });
    } catch (cause: any) {
      console.warn("[chat] recording failed to stop:", cause?.message);
      return null;
    }

    const uri = recorder.uri;
    // Under a second is a mis-tap, not a message.
    if (cancelledRef.current || !uri || elapsed < 1000) return null;

    return {
      uri,
      name: `voice-${Date.now()}.m4a`,
      mimeType: "audio/mp4",
      durationMs: Math.min(elapsed, MAX_VOICE_DURATION_MS),
    };
  }, [recorder]);

  /** Abandons the take: stops the hardware but resolves nothing to send. */
  const cancel = useCallback(async () => {
    cancelledRef.current = true;
    await stop();
  }, [stop]);

  // Hard stop at the cap so a forgotten finger cannot produce an unsendable file.
  const durationMs = state.durationMillis ?? 0;
  const atLimit = state.isRecording && durationMs >= MAX_VOICE_DURATION_MS;

  useEffect(() => {
    if (!state.isRecording) return;
    return () => {
      // Unmounting mid-take (navigating away) must not leave the mic hot.
      if (recorder.isRecording) {
        recorder.stop().catch(() => {});
        setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      }
    };
  }, [state.isRecording, recorder]);

  return {
    start,
    stop,
    cancel,
    isRecording: state.isRecording,
    durationMs,
    metering: state.metering,
    atLimit,
    error,
  };
}
