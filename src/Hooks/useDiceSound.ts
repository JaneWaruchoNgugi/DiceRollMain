import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import RollSndSrc from "../DiceAudio/rolling.mp3";
import WheelSndSrc from "../DiceAudio/wheelspining.mp3";
import WinSndSrc from "../DiceAudio/win.mp3";
import LoseSndSrc from "../DiceAudio/lose.mp3";
// Background loop: "Neon Laser Horizon" by Kevin MacLeod (incompetech.com),
// licensed under Creative Commons: By Attribution 4.0 — https://creativecommons.org/licenses/by/4.0/
import BgSndSrc from "../DiceAudio/casino-bg.mp3";

type Sfx = "WinSnd" | "LoseSnd";

/**
 * Central audio controller for the dice game.
 *
 * - Sample playback (mp3) for the heavier cues: rolling loop, win, lose, and a
 *   low background casino ambience.
 * - Synthesised WebAudio blips for the snappy UI cues (bet placed, chip select,
 *   countdown tick) so we get crisp, latency-free feedback without new assets.
 * - A single persisted mute flag gates everything.
 */
export const useDiceAudioControl = () => {
    const [muted, setMuted] = useState<boolean>(() => {
        try { return localStorage.getItem("dice.muted") === "1"; } catch { return false; }
    });
    const mutedRef = useRef(muted);
    mutedRef.current = muted;

    const samples = useMemo(() => {
        const roll = new Audio(RollSndSrc);
        const win = new Audio(WinSndSrc);
        const lose = new Audio(LoseSndSrc);
        roll.volume = 0.5;
        win.volume = 0.7;
        lose.volume = 0.6;
        return {RollSnd: roll, WinSnd: win, LoseSnd: lose};
    }, []);

    const bg = useMemo(() => {
        const a = new Audio(BgSndSrc);
        a.loop = true;
        a.volume = 0.14;
        return a;
    }, []);

    // Continuous whirring loop while the dice spin.
    const wheel = useMemo(() => {
        const a = new Audio(WheelSndSrc);
        a.loop = true;
        a.volume = 0.55;
        return a;
    }, []);

    // Lazily-created WebAudio context for synth blips (also unlocks on gesture).
    const acRef = useRef<AudioContext | null>(null);
    const getAC = useCallback((): AudioContext | null => {
        if (typeof window === "undefined") return null;
        if (!acRef.current) {
            const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (!Ctx) return null;
            acRef.current = new Ctx();
        }
        return acRef.current;
    }, []);

    // Keep ambience + persisted flag in sync with mute state.
    useEffect(() => {
        try { localStorage.setItem("dice.muted", muted ? "1" : "0"); } catch { /* ignore */ }
        if (muted) {
            bg.pause();
            wheel.pause();
        } else {
            void getAC()?.resume?.();
            bg.play().catch(() => { /* awaits user gesture */ });
        }
    }, [muted, bg, wheel, getAC]);

    // Browsers block audio until the first interaction — unlock on the first tap.
    useEffect(() => {
        const kick = () => {
            if (mutedRef.current) return;
            void getAC()?.resume?.();
            bg.play().catch(() => { /* ignore */ });
        };
        window.addEventListener("pointerdown", kick, {once: true});
        return () => window.removeEventListener("pointerdown", kick);
    }, [bg, getAC]);

    const blip = useCallback((freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number) => {
        if (mutedRef.current) return;
        const ac = getAC();
        if (!ac) return;
        const t = ac.currentTime;
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g).connect(ac.destination);
        osc.start(t);
        osc.stop(t + dur + 0.02);
    }, [getAC]);

    // Rising two-tone confirmation when a stake is locked in.
    const playBetPlaced = useCallback(() => {
        blip(440, 0.12, "triangle", 0.09, 880);
        window.setTimeout(() => blip(880, 0.10, "triangle", 0.06), 70);
    }, [blip]);

    // Soft tick for the final betting seconds and tactile UI clicks.
    const playTick = useCallback(() => blip(1180, 0.05, "square", 0.035), [blip]);
    const playChip = useCallback(() => blip(620, 0.045, "square", 0.03), [blip]);

    // Roll cues are bound to the rolling phase by the caller — startRoll() on
    // entering the phase, stopRoll() on leaving it — so the whir/clatter never
    // plays a moment before or after the dice actually rotate.
    const rollInterval = useRef<number | null>(null);

    const stopRoll = useCallback(() => {
        if (rollInterval.current !== null) {
            window.clearInterval(rollInterval.current);
            rollInterval.current = null;
        }
        wheel.pause();
        wheel.currentTime = 0;
        const s = samples.RollSnd;
        s.pause();
        s.currentTime = 0;
    }, [samples, wheel]);

    const startRoll = useCallback(() => {
        stopRoll();                       // idempotent — never stack loops
        if (mutedRef.current) return;
        // The spinning-wheel whir underlays the whole roll.
        wheel.currentTime = 0;
        wheel.play().catch(() => { /* ignore */ });
        // Rolling.mp3 re-triggers on top for the dice-clatter texture.
        const s = samples.RollSnd;
        s.currentTime = 0;
        s.play().catch(() => { /* ignore */ });
        const period = Math.max(300, (s.duration || 1) * 1000);
        rollInterval.current = window.setInterval(() => {
            if (mutedRef.current) return;
            s.currentTime = 0;
            s.play().catch(() => { /* ignore */ });
        }, period);
    }, [samples, wheel, stopRoll]);

    const playDiceSound = useCallback((key: Sfx) => {
        if (mutedRef.current) return;
        const s = samples[key];
        if (!s.paused) { s.pause(); s.currentTime = 0; }
        s.play().catch(() => { /* ignore */ });
    }, [samples]);

    const toggleMute = useCallback(() => setMuted(m => !m), []);

    return {muted, setMuted, toggleMute, playDiceSound, startRoll, stopRoll, playBetPlaced, playTick, playChip};
};
