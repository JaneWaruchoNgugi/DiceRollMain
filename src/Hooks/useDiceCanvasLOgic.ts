
export const finalRotationMapping: { [face: number]: { rx: number, ry: number } } = {
    // outcome 1: top face (DiceFace1)
    1: { rx: -Math.PI / 2, ry: 0 },
    // outcome 2: right face (DiceFace2)
    2: { rx: 0, ry: -Math.PI / 2 },
    // outcome 3: front face (DiceFace3)
    3: { rx: 0, ry: 0 },
    // outcome 4: back face (DiceFace4)
    4: { rx: 0, ry: Math.PI },
    // outcome 5: left face (DiceFace5)
    5: { rx: 0, ry: Math.PI / 2 },
    // outcome 6: bottom face (DiceFace6)
    6: { rx: Math.PI / 2, ry: 0 },
};


const rotatePoint3D=(x: number, y: number, z: number, rx: number, ry: number)=> {
    // Rotate around X
    const cosX = Math.cos(rx), sinX = Math.sin(rx);
    const y1 = y * cosX - z * sinX;
    const z1 = y * sinX + z * cosX;
    // Rotate around Y
    const cosY = Math.cos(ry), sinY = Math.sin(ry);
    const x1 = x * cosY + z1 * sinY;
    const z2 = -x * sinY + z1 * cosY;
    return { x: x1, y: y1, z: z2 };
}

const project3D=(x: number, y: number, z: number, f: number)=> {
    const factor = f / (f + z);
    return { x: x * factor, y: y * factor };
}

const lerp=(a: number, b: number, t: number)=> {
    return a + (b - a) * t;
}

export const projectImage=(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    pts: { x: number; y: number }[]
)=> {
    const numSegments = 1;
    const iw = image.width;
    const ih = image.height;
    const segW = iw / numSegments ;
    const segH = ih / numSegments;

    for (let i = 0; i < numSegments; i++) {
        for (let j = 0; j < numSegments; j++) {
            const sx = i * segW;
            const sy = j * segH;
            const u = i / numSegments;
            const v = j / numSegments;
            const uNext = (i + 1) / numSegments;
            const vNext = (j + 1) / numSegments;

            const x0 = lerp(lerp(pts[0].x, pts[1].x, u), lerp(pts[3].x, pts[2].x, u), v);
            const y0 = lerp(lerp(pts[0].y, pts[1].y, u), lerp(pts[3].y, pts[2].y, u), v);
            const x1 = lerp(lerp(pts[0].x, pts[1].x, uNext), lerp(pts[3].x, pts[2].x, uNext), v);
            const y1 = lerp(lerp(pts[0].y, pts[1].y, uNext), lerp(pts[3].y, pts[2].y, uNext), v);
            const x2 = lerp(lerp(pts[0].x, pts[1].x, uNext), lerp(pts[3].x, pts[2].x, uNext), vNext);
            const y2 = lerp(lerp(pts[0].y, pts[1].y, uNext), lerp(pts[3].y, pts[2].y, uNext), vNext);
            const x3 = lerp(lerp(pts[0].x, pts[1].x, u), lerp(pts[3].x, pts[2].x, u), vNext);
            const y3 = lerp(lerp(pts[0].y, pts[1].y, u), lerp(pts[3].y, pts[2].y, u), vNext);

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.closePath();
            ctx.clip();

            const minX = Math.min(x0, x1, x2, x3);
            const minY = Math.min(y0, y1, y2, y3);
            const maxX = Math.max(x0, x1, x2, x3);
            const maxY = Math.max(y0, y1, y2, y3);

            ctx.drawImage(image, sx, sy, segW, segH, minX, minY, maxX - minX, maxY - minY);
            ctx.restore();
        }
    }
}

// export const projectImage = (
//     ctx: CanvasRenderingContext2D,
//     image: HTMLImageElement,
//     pts: { x: number; y: number }[]
// ) => {
//     ctx.save();
//     ctx.beginPath();
//     ctx.moveTo(pts[0].x, pts[0].y);
//     ctx.lineTo(pts[1].x, pts[1].y);
//     ctx.lineTo(pts[2].x, pts[2].y);
//     ctx.lineTo(pts[3].x, pts[3].y);
//     ctx.closePath();
//     ctx.clip();
//
//     const minX = Math.min(pts[0].x, pts[1].x, pts[2].x, pts[3].x);
//     const minY = Math.min(pts[0].y, pts[1].y, pts[2].y, pts[3].y);
//     const maxX = Math.max(pts[0].x, pts[1].x, pts[2].x, pts[3].x);
//     const maxY = Math.max(pts[0].y, pts[1].y, pts[2].y, pts[3].y);
//
//     ctx.drawImage(image, 0, 0, image.width, image.height, minX, minY, maxX - minX, maxY - minY);
//     ctx.restore();
// };
//

// Standard pip layouts in normalized face coordinates (u, v ∈ [0,1]).
const PIPS: { [v: number]: [number, number][] } = {
    1: [[0.5, 0.5]],
    2: [[0.28, 0.28], [0.72, 0.72]],
    3: [[0.26, 0.26], [0.5, 0.5], [0.74, 0.74]],
    4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
    5: [[0.26, 0.26], [0.74, 0.26], [0.5, 0.5], [0.26, 0.74], [0.74, 0.74]],
    6: [[0.28, 0.22], [0.28, 0.5], [0.28, 0.78], [0.72, 0.22], [0.72, 0.5], [0.72, 0.78]],
};

// Procedurally-drawn die: 3D purple-gradient cube with white pips (no texture image).
export const drawDiceCubeVector = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    rx: number,
    ry: number,
) => {
    const f = 700;
    const half = 40;
    const vertices = [
        {x: -half, y: -half, z: -half}, {x: half, y: -half, z: -half},
        {x: half, y: half, z: -half}, {x: -half, y: half, z: -half},
        {x: -half, y: -half, z: half}, {x: half, y: -half, z: half},
        {x: half, y: half, z: half}, {x: -half, y: half, z: half},
    ];
    const transformed = vertices.map(v => {
        const rot = rotatePoint3D(v.x, v.y, v.z, rx, ry);
        const proj = project3D(rot.x, rot.y, rot.z, f);
        return {x: proj.x + centerX, y: proj.y + centerY, z: rot.z};
    });

    const faces = [
        {indices: [4, 5, 6, 7], value: 3},
        {indices: [5, 1, 2, 6], value: 2},
        {indices: [0, 1, 5, 4], value: 1},
        {indices: [1, 0, 3, 2], value: 4},
        {indices: [0, 4, 7, 3], value: 5},
        {indices: [7, 6, 2, 3], value: 6},
    ].map(face => ({
        ...face,
        avgZ: face.indices.reduce((s, i) => s + transformed[i].z, 0) / 4,
    }));
    faces.sort((a, b) => a.avgZ - b.avgZ); // painter's algorithm: far → near

    faces.forEach(face => {
        const pts = face.indices.map(i => transformed[i]);
        const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
        const grad = ctx.createLinearGradient(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
        grad.addColorStop(0, "#c77dff");
        grad.addColorStop(0.55, "#7b2cbf");
        grad.addColorStop(1, "#3a0a63");

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.lineTo(pts[2].x, pts[2].y);
        ctx.lineTo(pts[3].x, pts[3].y);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.lineJoin = "round";
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(30,0,55,0.85)";
        ctx.stroke();

        const faceW = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const r = Math.max(2, faceW / 11);
        const bilinear = (u: number, v: number) => {
            const tx = pts[0].x + (pts[1].x - pts[0].x) * u, ty = pts[0].y + (pts[1].y - pts[0].y) * u;
            const bx = pts[3].x + (pts[2].x - pts[3].x) * u, by = pts[3].y + (pts[2].y - pts[3].y) * u;
            return {x: tx + (bx - tx) * v, y: ty + (by - ty) * v};
        };
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(0,0,0,0.4)";
        ctx.shadowBlur = 3;
        (PIPS[face.value] || []).forEach(([u, v]) => {
            const p = bilinear(u, v);
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    });
};

export const drawDiceCube3D =(
    ctx: CanvasRenderingContext2D,
    textures: { front: HTMLImageElement; right: HTMLImageElement; top: HTMLImageElement; back: HTMLImageElement; left: HTMLImageElement; bottom: HTMLImageElement },
    centerX: number,
    centerY: number,
    rx: number,
    ry: number
)=> {
    const f = 700;
    const half = 40;
    const vertices = [
        { x: -half, y: -half, z: -half }, // 0
        { x: half,  y: -half, z: -half }, // 1
        { x: half,  y: half,  z: -half }, // 2
        { x: -half, y: half,  z: -half }, // 3
        { x: -half, y: -half, z: half },  // 4
        { x: half,  y: -half, z: half },  // 5
        { x: half,  y: half,  z: half },  // 6
        { x: -half, y: half,  z: half }   // 7
    ];

    // Rotate and project vertices
    const transformed = vertices.map(v => {
        const rotated = rotatePoint3D(v.x, v.y, v.z, rx, ry);
        const proj = project3D(rotated.x, rotated.y, rotated.z, f);
        return { x: proj.x + centerX, y: proj.y + centerY, z: rotated.z };
    });

    interface Face {
        indices: number[];
        texture: HTMLImageElement;
        avgZ?: number;
    }

    const faces: Face[] = [
        { indices: [4, 5, 6, 7], texture: textures.front },
        { indices: [5, 1, 2, 6], texture: textures.right },
        { indices: [0, 1, 5, 4], texture: textures.top },
        { indices: [1, 0, 3, 2], texture: textures.back },
        { indices: [0, 4, 7, 3], texture: textures.left },
        { indices: [7, 6, 2, 3], texture: textures.bottom },
    ];

    faces.forEach(face => {
        face.avgZ = face.indices.reduce((sum, idx) => sum + transformed[idx].z, 0) / face.indices.length;
    });

    faces.sort((a, b) => (a.avgZ! - b.avgZ!));

    faces.forEach(face => {
        const pts = face.indices.map(idx => ({ x: transformed[idx].x, y: transformed[idx].y }));
        projectImage(ctx, face.texture, pts);
    });
}
