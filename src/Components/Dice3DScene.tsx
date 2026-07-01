import {FC, useMemo, useRef} from "react";
import {Canvas, useFrame} from "@react-three/fiber";
import * as THREE from "three";

const PIPS: Record<number, [number, number][]> = {
    1: [[0.5, 0.5]],
    2: [[0.3, 0.3], [0.7, 0.7]],
    3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
    4: [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]],
    5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
    6: [[0.3, 0.24], [0.3, 0.5], [0.3, 0.76], [0.7, 0.24], [0.7, 0.5], [0.7, 0.76]],
};

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
};

const makeFaceTexture = (value: number): THREE.CanvasTexture => {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;

    // full-bleed purple border so cube edges stay purple (no dark corners)
    const border = ctx.createLinearGradient(0, 0, size, size);
    border.addColorStop(0, "#8a37d6");
    border.addColorStop(1, "#4a128a");
    ctx.fillStyle = border;
    ctx.fillRect(0, 0, size, size);

    // brighter inset face tile
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, "#d29bff");
    g.addColorStop(0.55, "#8a3ad6");
    g.addColorStop(1, "#5a1a9e");
    roundRect(ctx, 18, 18, size - 36, size - 36, 40);
    ctx.fillStyle = g;
    ctx.fill();

    // glossy top sheen
    const sheen = ctx.createLinearGradient(0, 0, 0, size);
    sheen.addColorStop(0, "rgba(255,255,255,0.22)");
    sheen.addColorStop(0.4, "rgba(255,255,255,0)");
    roundRect(ctx, 18, 18, size - 36, size - 36, 40);
    ctx.fillStyle = sheen;
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 6;
    (PIPS[value] || []).forEach(([u, v]) => {
        ctx.beginPath();
        ctx.arc(u * size, v * size, size * 0.082, 0, Math.PI * 2);
        ctx.fill();
    });

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
};

const Die: FC<{ value: number; index: number; spinning: boolean; position: [number, number, number] }> = ({value, index, spinning, position}) => {
    const ref = useRef<THREE.Mesh>(null);
    const textures = useMemo(() => [1, 2, 3, 4, 5, 6].map(makeFaceTexture), []);

    const materials = useMemo(() => {
        // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z. Front (+Z) shows the value.
        const faceVals = [2, 5, 3, 4, value, 7 - value];
        return faceVals.map(v => new THREE.MeshStandardMaterial({
            map: textures[v - 1], metalness: 0.4, roughness: 0.28,
        }));
    }, [value, textures]);

    const vel = useRef({x: 0.17 + index * 0.02, y: 0.23 + index * 0.018});

    useFrame((_, dt) => {
        const m = ref.current;
        if (!m) return;
        const clamped = Math.min(dt, 0.05);
        if (spinning) {
            m.rotation.x += vel.current.x;
            m.rotation.y += vel.current.y;
        } else {
            const TAU = Math.PI * 2;
            // settle flat so the +Z (value) face meets the camera
            m.rotation.x = THREE.MathUtils.damp(m.rotation.x, Math.round(m.rotation.x / TAU) * TAU, 7, clamped);
            m.rotation.y = THREE.MathUtils.damp(m.rotation.y, Math.round(m.rotation.y / TAU) * TAU, 7, clamped);
            m.rotation.z = THREE.MathUtils.damp(m.rotation.z, 0, 7, clamped);
        }
    });

    return (
        <mesh ref={ref} position={position} material={materials}>
            <boxGeometry args={[0.8, 0.8, 0.8]}/>
        </mesh>
    );
};

export const Dice3DScene: FC<{ faces: number[]; spinning: boolean; active: boolean }> = ({faces, spinning, active}) => (
    <Canvas
        dpr={[1, 2]}
        camera={{position: [0, 0.2, 9.5], fov: 30}}
        gl={{alpha: true, antialias: true}}
        style={{position: "absolute", inset: 0, pointerEvents: "none"}}
    >
        <ambientLight intensity={0.75}/>
        <directionalLight position={[4, 6, 6]} intensity={1.6}/>
        <directionalLight position={[-6, -2, 3]} intensity={0.6} color="#79e6ff"/>
        <pointLight position={[0, 1, 6]} intensity={0.7} color="#ffd9f6"/>
        {active && faces.slice(0, 3).map((v, i) => (
            <Die key={i} value={v} index={i} spinning={spinning} position={[(i - 1) * 1.25, -0.1, 0]}/>
        ))}
    </Canvas>
);
