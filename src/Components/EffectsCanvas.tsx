import {FC, useEffect, useRef} from "react";
import {RoundPhase} from "../Game/gameTypes.ts";

interface EffectsCanvasProps {
    phase: RoundPhase;
    total: number;         // revealed dice total (0 until result)
    won: boolean | null;   // whether the player's bet won this round
}

/** Logical drawing space; matches the chamber canvas so overlays line up. */
const SIZE = 650;

const COLORS = {
    blue: [58, 160, 255] as const,
    cyan: [46, 230, 214] as const,
    purple: [160, 101, 255] as const,
    gold: [246, 196, 83] as const,
    rose: [255, 92, 138] as const,
};

const rgba = (c: readonly [number, number, number], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

interface Particle {
    x: number; y: number; vx: number; vy: number;
    life: number; max: number; size: number; color: readonly [number, number, number];
}
interface Shockwave { x: number; y: number; r: number; max: number; color: readonly [number, number, number]; life: number; }
interface FloatNum { x: number; y: number; vy: number; life: number; max: number; text: string; color: readonly [number, number, number]; }

// Deterministic pseudo-random so we never touch Math.random in render hot paths
// in a way that hurts; a tiny LCG keeps arcs lively without GC pressure.
let seed = 1337;
const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
};

/**
 * High-energy casino effects overlay for the dice chamber.
 *
 * A single requestAnimationFrame loop paints, in additive ("lighter") blend:
 *   • energy portals top & bottom (rotating, pulsing rings)
 *   • volumetric light beams sweeping the shaft
 *   • an ambient particle field of blue/purple embers
 *   • expanding shockwaves fired on roll-start and reveal
 *   • jagged electric arcs between the dice while rolling
 *   • neon speed trails during the spin
 *   • holographic floating numbers on the result
 *
 * Particle counts and DPR are dialled down on small/low-power screens, and the
 * whole thing collapses to a calm static frame under prefers-reduced-motion.
 */
export const EffectsCanvas: FC<EffectsCanvasProps> = ({phase, total, won}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const phaseRef = useRef<RoundPhase>(phase);
    const particles = useRef<Particle[]>([]);
    const shocks = useRef<Shockwave[]>([]);
    const floats = useRef<FloatNum[]>([]);

    // Fire transition-based bursts (shockwave / floating number) exactly once.
    const prevPhase = useRef<RoundPhase>(phase);

    useEffect(() => {
        phaseRef.current = phase;
        const cx = SIZE / 2;
        const cy = SIZE / 2;

        if (prevPhase.current !== phase) {
            if (phase === "rolling") {
                shocks.current.push({x: cx, y: cy, r: 20, max: 300, color: COLORS.blue, life: 1});
                spawnBurst(particles.current, cx, cy, 26, [COLORS.blue, COLORS.cyan, COLORS.purple], 4.5);
            }
            if (phase === "result") {
                const win = won === true;
                const col = win ? COLORS.gold : COLORS.cyan;
                shocks.current.push({x: cx, y: cy, r: 24, max: 340, color: col, life: 1});
                spawnBurst(particles.current, cx, cy, win ? 46 : 24, win ? [COLORS.gold, COLORS.cyan] : [COLORS.rose, COLORS.blue], win ? 6 : 4);
                // The result total is drawn behind the dice by DiceCanvas.
            }
            prevPhase.current = phase;
        }
    }, [phase, total, won]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d", {alpha: true});
        if (!ctx) return;

        const reduce = typeof window !== "undefined"
            && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        const mobile = typeof window !== "undefined" && window.innerWidth < 680;
        const AMBIENT = reduce ? 0 : mobile ? 20 : 46;
        const maxDpr = mobile ? 2 : 3;

        let scale = 1;
        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const css = rect.width || SIZE;
            const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
            canvas.width = Math.round(css * dpr);
            canvas.height = Math.round(css * dpr);
            scale = (css / SIZE) * dpr;
        };
        resize();
        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
        ro?.observe(canvas);

        // Seed the ambient field so the shaft is never empty.
        particles.current = [];
        for (let i = 0; i < AMBIENT; i++) {
            particles.current.push(makeAmbient());
        }

        let raf = 0;
        let t = 0;
        let last = 0;

        const frame = (now: number) => {
            raf = requestAnimationFrame(frame);
            // Frame-rate independent-ish stepping, clamped so tab-restore doesn't jump.
            const dt = last ? Math.min((now - last) / 16.667, 3) : 1;
            last = now;
            t += dt;

            ctx.setTransform(scale, 0, 0, scale, 0, 0);
            ctx.clearRect(0, 0, SIZE, SIZE);
            ctx.globalCompositeOperation = "lighter";

            const p = phaseRef.current;
            const rolling = p === "rolling";
            const intensity = rolling ? 1 : p === "result" ? 0.75 : 0.4;
            const cx = SIZE / 2;

            // Portal rings sit exactly on the white opening face of each machine
            // disk (centres measured from the art). They spin faster mid-roll.
            const DISK_X = 325, TOP_Y = 126, BOT_Y = 500, TOP_R = 180, BOT_R = 186;
            const spin = rolling ? 4 : 1;
            if (!reduce) {
                drawBeams(ctx, t, intensity);
                drawPortal(ctx, DISK_X, TOP_Y, t, intensity, TOP_R, spin);
                drawPortal(ctx, DISK_X, BOT_Y, -t, intensity, BOT_R, spin);
            } else {
                drawPortal(ctx, DISK_X, TOP_Y, 0, 0.4, TOP_R, 1);
                drawPortal(ctx, DISK_X, BOT_Y, 0, 0.4, BOT_R, 1);
            }

            // Ambient + burst particles.
            const list = particles.current;
            for (let i = list.length - 1; i >= 0; i--) {
                const pt = list[i];
                pt.x += pt.vx * dt;
                pt.y += pt.vy * dt;
                pt.vy += 0.01 * dt;
                pt.life -= (1 / pt.max) * dt;
                if (pt.life <= 0) {
                    // Recycle ambient embers; drop finished burst particles.
                    if (list.length <= AMBIENT) { list[i] = makeAmbient(); }
                    else { list.splice(i, 1); }
                    continue;
                }
                const a = Math.max(0, Math.min(1, pt.life)) * (rolling ? 0.9 : 0.6);
                const r = pt.size * (0.6 + pt.life * 0.6);
                const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r * 3);
                g.addColorStop(0, rgba(pt.color, a));
                g.addColorStop(1, rgba(pt.color, 0));
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, r * 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Keep the field topped up while rolling for a denser storm.
            if (rolling && !reduce && list.length < AMBIENT + (mobile ? 10 : 26) && (t | 0) % 2 === 0) {
                spawnBurst(list, cx, SIZE / 2, 2, [COLORS.blue, COLORS.cyan, COLORS.purple], 3.5);
            }

            // Rippling, rotating light beacons on the top & bottom disks — they
            // only power on while the dice spin, and are completely off otherwise.
            if (rolling && !reduce) {
                drawRipple(ctx, DISK_X, TOP_Y, t, TOP_R);
                drawRipple(ctx, DISK_X, BOT_Y, t, BOT_R);
                drawDiskLight(ctx, DISK_X, TOP_Y, t, TOP_R);
                drawDiskLight(ctx, DISK_X, BOT_Y, -t, BOT_R);
                drawArcs(ctx, t, cx);
                drawSpeedTrails(ctx, t, cx);
            }

            // Shockwaves.
            for (let i = shocks.current.length - 1; i >= 0; i--) {
                const s = shocks.current[i];
                s.r += (6 + s.max * 0.012) * dt;
                s.life = 1 - s.r / s.max;
                if (s.life <= 0) { shocks.current.splice(i, 1); continue; }
                ctx.strokeStyle = rgba(s.color, s.life * 0.55);
                ctx.lineWidth = 3 * s.life + 0.5;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.strokeStyle = rgba(s.color, s.life * 0.25);
                ctx.lineWidth = 8 * s.life;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r * 0.82, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Holographic floating numbers.
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            for (let i = floats.current.length - 1; i >= 0; i--) {
                const f = floats.current[i];
                f.y += f.vy * dt;
                f.life -= 0.012 * dt;
                if (f.life <= 0) { floats.current.splice(i, 1); continue; }
                const a = Math.max(0, f.life);
                const scaleN = 1 + (1 - f.life) * 0.5;
                ctx.save();
                ctx.translate(f.x, f.y);
                ctx.scale(scaleN, scaleN);
                ctx.font = "800 68px 'Chakra Petch', Arial, sans-serif";
                ctx.fillStyle = rgba(f.color, a * 0.25);
                ctx.fillText(f.text, 0, 6);
                ctx.fillStyle = rgba(f.color, a);
                ctx.fillText(f.text, 0, 0);
                // holographic ghost copies
                ctx.fillStyle = rgba(COLORS.rose, a * 0.18);
                ctx.fillText(f.text, -2, -1);
                ctx.fillStyle = rgba(COLORS.cyan, a * 0.18);
                ctx.fillText(f.text, 2, 1);
                ctx.restore();
            }

            ctx.globalCompositeOperation = "source-over";
        };
        raf = requestAnimationFrame(frame);

        // Pause the loop when the tab is hidden to save battery.
        const onVis = () => {
            if (document.hidden) { cancelAnimationFrame(raf); }
            else { last = 0; raf = requestAnimationFrame(frame); }
        };
        document.addEventListener("visibilitychange", onVis);

        return () => {
            cancelAnimationFrame(raf);
            ro?.disconnect();
            document.removeEventListener("visibilitychange", onVis);
        };
    }, []);

    return <canvas ref={canvasRef} className="id-fx" aria-hidden="true"/>;
};

/* ----------------------------- helpers ----------------------------- */

function makeAmbient(): Particle {
    const color = rnd() > 0.5 ? COLORS.blue : COLORS.purple;
    return {
        x: SIZE / 2 + (rnd() - 0.5) * 200,
        y: SIZE / 2 + 120 + rnd() * 160,
        vx: (rnd() - 0.5) * 0.4,
        vy: -0.5 - rnd() * 0.9,
        life: rnd(),
        max: 90 + rnd() * 80,
        size: 1.4 + rnd() * 2.2,
        color,
    };
}

function spawnBurst(list: Particle[], x: number, y: number, n: number, palette: readonly (readonly [number, number, number])[], speed: number) {
    for (let i = 0; i < n; i++) {
        const ang = rnd() * Math.PI * 2;
        const sp = speed * (0.3 + rnd());
        list.push({
            x, y,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp - 1,
            life: 1,
            max: 26 + rnd() * 34,
            size: 1.6 + rnd() * 2.6,
            color: palette[(rnd() * palette.length) | 0],
        });
    }
}

function drawPortal(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, intensity: number, radius: number, spin: number) {
    const pulse = 0.85 + Math.sin(t * 0.06) * 0.15;
    const r = radius * pulse;

    // Glowing disc — very flat so it lies on the tilted white disk face.
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.1);
    glow.addColorStop(0, rgba(COLORS.blue, 0.32 * intensity));
    glow.addColorStop(0.5, rgba(COLORS.purple, 0.16 * intensity));
    glow.addColorStop(1, rgba(COLORS.purple, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.1, r * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rotating energy arcs hugging the rim (faster while the dice spin).
    const arcs = 5;
    for (let i = 0; i < arcs; i++) {
        const a0 = t * 0.05 * spin + (i / arcs) * Math.PI * 2;
        ctx.strokeStyle = rgba(i % 2 ? COLORS.cyan : COLORS.blue, 0.55 * intensity);
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * 0.16, 0, a0, a0 + 0.7);
        ctx.stroke();
    }
}

// Concentric rings that expand outward from the disk and fade — a ripple that
// radiates across the disk face. Flattened on Y to match the tilted perspective.
function drawRipple(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, r: number) {
    const rings = 4;
    const grow = 130;              // how far each ring travels before dying
    for (let i = 0; i < rings; i++) {
        const phase = ((t * 0.014) + i / rings) % 1;   // 0 → 1 outward
        const rr = r * 0.7 + phase * grow;
        const alpha = (1 - phase) * 0.4;
        ctx.strokeStyle = rgba(COLORS.cyan, alpha);
        ctx.lineWidth = 2 * (1 - phase) + 0.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rr, rr * 0.16, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// A pair of bright beacons that orbit a disk's rim, plus a lit rim ring. Only
// drawn while the dice spin, so the disk "powers on" during the roll and is dark
// otherwise. Flattened on Y to sit in the tilted disk face.
function drawDiskLight(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, r: number) {
    const rx = r, ry = r * 0.16;
    const a = t * 0.09;

    // Lit rim ring.
    ctx.strokeStyle = rgba(COLORS.cyan, 0.45);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Two opposed beacons sweeping around the rim.
    for (const dir of [0, Math.PI]) {
        const x = cx + Math.cos(a + dir) * rx;
        const y = cy + Math.sin(a + dir) * ry;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 46);
        g.addColorStop(0, rgba([220, 255, 252], 0.95));
        g.addColorStop(0.35, rgba(COLORS.cyan, 0.55));
        g.addColorStop(1, rgba(COLORS.blue, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 46, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawBeams(ctx: CanvasRenderingContext2D, t: number, intensity: number) {
    const cx = SIZE / 2 + 12;
    const beams = 3;
    for (let i = 0; i < beams; i++) {
        const sway = Math.sin(t * 0.02 + i * 2) * 40;
        const x = cx + (i - 1) * 70 + sway;
        const top = 130, bottom = 530;
        const g = ctx.createLinearGradient(x, top, x, bottom);
        const c = i === 1 ? COLORS.cyan : COLORS.blue;
        g.addColorStop(0, rgba(c, 0.0));
        g.addColorStop(0.5, rgba(c, 0.06 * intensity));
        g.addColorStop(1, rgba(c, 0.0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - 26, top);
        ctx.lineTo(x + 26, top);
        ctx.lineTo(x + 54, bottom);
        ctx.lineTo(x - 54, bottom);
        ctx.closePath();
        ctx.fill();
    }
}

function drawArcs(ctx: CanvasRenderingContext2D, t: number, cx: number) {
    // Three lightning bolts flickering across the dice band.
    const cy = SIZE / 2;
    const bolts = 3;
    for (let b = 0; b < bolts; b++) {
        if (rnd() > 0.6) continue; // flicker
        const x0 = cx - 120 + b * 120;
        const y0 = cy - 20 + (rnd() - 0.5) * 60;
        const x1 = x0 + 100 + rnd() * 30;
        const y1 = y0 + (rnd() - 0.5) * 70;
        const segs = 6;
        ctx.strokeStyle = rgba(b % 2 ? COLORS.cyan : COLORS.blue, 0.7);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        for (let s = 1; s <= segs; s++) {
            const f = s / segs;
            const jitter = (rnd() - 0.5) * 26 * (1 - Math.abs(f - 0.5) * 2 + 0.3);
            ctx.lineTo(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f + jitter);
        }
        ctx.stroke();
    }
    void t;
}

function drawSpeedTrails(ctx: CanvasRenderingContext2D, t: number, cx: number) {
    const cy = SIZE / 2;
    const n = 7;
    for (let i = 0; i < n; i++) {
        const a = t * 0.12 + (i / n) * Math.PI * 2;
        const rx = 150, ry = 60;
        const x = cx + Math.cos(a) * rx;
        const y = cy + Math.sin(a) * ry;
        const tailA = a - 0.5;
        const tx = cx + Math.cos(tailA) * rx;
        const ty = cy + Math.sin(tailA) * ry;
        const g = ctx.createLinearGradient(tx, ty, x, y);
        g.addColorStop(0, rgba(COLORS.cyan, 0));
        g.addColorStop(1, rgba(COLORS.cyan, 0.4));
        ctx.strokeStyle = g;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();
    }
}
