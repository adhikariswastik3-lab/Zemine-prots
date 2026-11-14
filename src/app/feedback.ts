import { getPrefs } from "@/app/prefs";

export type Cue = "tap" | "success" | "error";

const vibration: Record<Cue, number[]> = { tap: [12], success: [40, 60, 100], error: [120, 60, 120] };
const tones: Record<Cue, [number, number][]> = {
  tap: [[660, 0.04]],
  success: [
    [523.25, 0.08], // C5
    [659.25, 0.08], // E5
    [783.99, 0.08], // G5
    [1046.5, 0.22], // C6 (crisp high payout chime)
  ],
  error: [[220, 0.18], [165, 0.22]],
};

let ctx: AudioContext | null = null;

/** Plays the optional haptic and sound cue for an interaction, honouring user preferences. */
export function cue(kind: Cue) {
  const { haptics, sound } = getPrefs();
  if (haptics && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(vibration[kind]);
  if (!sound || typeof window === "undefined") return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    let t = ctx.currentTime;
    for (const [freq, dur] of tones[kind]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
      t += dur;
    }
  } catch {
    /* audio unavailable */
  }
}
