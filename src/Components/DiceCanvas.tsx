import diceBg from '../assets/img/dice-bg.png';
import diceMachineOff from '../assets/img/dice-machine-off.png';
import diceMachineOn from '../assets/img/dice-machine-on.png';
import diceUpLight from '../assets/img/dice-up-light.png';
import diceDownLight from '../assets/img/dice-down-light.png';
import diceCenter from '../assets/img/dicecenter.png';
import diceCenter2 from '../assets/img/dice-center.png';
import {FC, useEffect, useRef} from "react";
import usePreloadImages from "../Hooks/useCanvasImages.ts";

interface DiceCanvasProps {
    diceGameActive: boolean;
    DiceOutcomeSum: number;
    bettingSeconds?: number | null;
    bettingTotal?: number;
}

// Renders the neon chamber: background, machine, lights, and (during betting) the
// countdown inside the hexagon. The dice themselves are drawn in WebGL (Dice3DScene).
export const DiceCanvas: FC<DiceCanvasProps> = ({
    diceGameActive, DiceOutcomeSum, bettingSeconds = null, bettingTotal = 10,
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const {images, loaded} = usePreloadImages({
        bg: diceBg, machine: diceMachineOff, machine2: diceMachineOn,
        light1: diceUpLight, light2: diceDownLight, centerL: diceCenter, center2: diceCenter2,
    });

    useEffect(() => {
        if (!loaded) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Logical drawing space stays 650×650; the backing store is scaled to the
        // device pixel ratio so the chamber stays crisp on high-DPI phones.
        const SIZE = 650;
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        if (canvas.width !== SIZE * dpr) {
            canvas.width = SIZE * dpr;
            canvas.height = SIZE * dpr;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, SIZE, SIZE);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(images.bg, 0, 0, SIZE, SIZE);

        const padding = 20;
        const machineHeight = SIZE - 2 * padding;
        const aspectRatio = images.machine.width / images.machine.height;
        const machineWidth = machineHeight * aspectRatio;
        // Centre the machine art in the canvas (the disk sits ~16px right of the
        // frame centre at the old +20 offset, so pull it back to +4).
        const x = (SIZE - machineWidth) / 2 + 4;
        const rectWidth = 316;
        const rectHeight = 500;
        const rectX = (SIZE - rectWidth) / 2;
        const rectY = (SIZE - rectHeight) / 2;

        const centerImageWidth = 430;
        const centerImageHeight = 350;
        const centerImageX = (SIZE - centerImageWidth) / 2;
        const centerImageY = (SIZE - centerImageHeight) / 2 - 10;
        const lightHeight = 50;
        const lightWidth = 640;

        ctx.globalAlpha = 0.5;
        ctx.save();
        ctx.translate(x + lightWidth / 2 - 60, lightHeight / 2 + 5);
        ctx.drawImage(images.light1, -lightWidth / 2, -lightHeight / 2, lightWidth, lightHeight);
        ctx.restore();
        ctx.globalAlpha = 1.0;

        ctx.globalAlpha = 0.5;
        ctx.save();
        ctx.translate(x + lightWidth / 2 - 60, machineHeight + 5);
        ctx.drawImage(images.light2, -lightWidth / 2, -lightHeight / 2, lightWidth, lightHeight);
        ctx.restore();
        ctx.globalAlpha = 1.0;

        const cx = rectX + rectWidth / 2;   // = SIZE/2, centred
        const cy = rectY + rectHeight / 2;

        const drawCountdown = () => {
            const grad = ctx.createLinearGradient(cx, cy - 50, cx, cy + 50);
            grad.addColorStop(0, "#00ff8e");
            grad.addColorStop(0.5, "#69f1fa");
            grad.addColorStop(1, "#00c9ff");
            ctx.fillStyle = grad;
            ctx.font = "bold 96px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = "rgba(105,241,250,0.55)";
            ctx.shadowBlur = 22;
            ctx.fillText(String(bettingSeconds ?? 0), cx, cy - 4);
            ctx.shadowBlur = 0;

            ctx.fillStyle = "rgba(220,245,255,0.6)";
            ctx.font = "600 16px Arial";
            ctx.fillText("SEC", cx, cy + 50);
        };

        const drawCenterElements = () => {
            const gradient2 = ctx.createLinearGradient(rectX, rectY, rectX, rectY + rectHeight);
            gradient2.addColorStop(0.1, "rgba(0,158,255,0.57)");
            gradient2.addColorStop(0.5, "transparent");
            gradient2.addColorStop(1, "rgb(0,160,255,0.57)");
            ctx.fillStyle = gradient2;
            // Centre the shaft glow on cx (it used to start at rectX and run off
            // to the right, pulling the whole chamber visually off-centre).
            const shaftWidth = rectWidth / 2 + 200;
            ctx.fillRect(cx - shaftWidth / 2, rectY, shaftWidth, rectHeight);

            ctx.drawImage(images.center2, centerImageX, centerImageY, centerImageWidth, centerImageHeight);
            ctx.drawImage(images.centerL, centerImageX, centerImageY, centerImageWidth, centerImageHeight);

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            if (bettingSeconds != null) {
                drawCountdown();
                ctx.fillStyle = "#eaf7ff";
                ctx.font = "700 27px Arial";
                ctx.shadowColor = "rgba(105,241,250,0.45)";
                ctx.shadowBlur = 12;
                ctx.fillText("PLACE  YOUR  BETS", cx, cy + 170);
                ctx.shadowBlur = 0;
            } else if (DiceOutcomeSum > 0) {
                const grad = ctx.createLinearGradient(rectX, rectY, rectX, rectY + rectHeight);
                grad.addColorStop(0, "#00ff8e");
                grad.addColorStop(0.48, "#69f1fa");
                grad.addColorStop(1, "#00c9ff");
                ctx.fillStyle = grad;
                ctx.font = "bold 98px Arial";
                ctx.fillText(DiceOutcomeSum.toString(), cx, cy+20);
            }

            ctx.drawImage(images.machine, x, padding, machineWidth, machineHeight);
        };

        if (diceGameActive) {
            // chamber lit; dice rendered by the WebGL overlay
            ctx.drawImage(images.machine, x, padding, machineWidth, machineHeight);
            ctx.drawImage(images.machine2, x, padding, machineWidth, machineHeight);
            // After the roll, the total glows in the shaft ABOVE the dice so it
            // stays behind the dice plane yet fully visible (not occluded by them).
            if (DiceOutcomeSum > 0) {
                const totalY = cy - 90;
                const grad = ctx.createLinearGradient(cx, totalY - 80, cx, totalY + 80);
                grad.addColorStop(0, "#7dfbe8");
                grad.addColorStop(0.55, "#2ee6d6");
                grad.addColorStop(1, "#12c2e6");
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.font = "800 150px 'Chakra Petch', Arial, sans-serif";
                ctx.shadowColor = "rgba(46,230,214,0.75)";
                ctx.shadowBlur = 40;
                ctx.fillStyle = grad;
                ctx.fillText(String(DiceOutcomeSum), cx, totalY);
                ctx.shadowBlur = 0;
            }
        } else {
            drawCenterElements();
            ctx.drawImage(images.machine, x, padding, machineWidth, machineHeight);
        }
    }, [loaded, images, diceGameActive, DiceOutcomeSum, bettingSeconds, bettingTotal]);

    return <canvas id="diceCanvas" ref={canvasRef} width="650" height="650"></canvas>;
};
