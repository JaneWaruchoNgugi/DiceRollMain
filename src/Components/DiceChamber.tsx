import {FC} from "react";
import {DiceCanvas} from "./DiceCanvas.tsx";
import {Dice3DScene} from "./Dice3DScene.tsx";
import {EffectsCanvas} from "./EffectsCanvas.tsx";
import {useGame} from "../Game/DiceGameContext.tsx";
import {ROUND_SECONDS} from "../Game/gameTypes.ts";

export const DiceChamber: FC = () => {
    const {phase, countdown, diceFaces, revealedTotal, currentResult} = useGame();

    const diceGameActive = phase !== "betting";
    const diceIsSpinning = phase === "rolling";

    // Motion: the chamber itself stays put — the rings/hexagon inside the canvas
    // spin during the roll (see EffectsCanvas). A win still lands a sharp jolt.
    const shakeClass = phase === "result" && currentResult?.won ? "id-shake-hit" : "";

    return (
        <div className="id-chamber">
            <div className="id-chamber-topstatus">
                {phase === "rolling" && (
                    <span className="id-status-title id-pulse">ROLLING…</span>
                )}
                {phase === "result" && currentResult && (
                    <span className={`id-status-title ${currentResult.won ? "id-win" : currentResult.betRange ? "id-lose" : ""}`}>
                        {currentResult.betRange
                            ? (currentResult.won ? `YOU WIN +${currentResult.winnings}` : "NO WIN")
                            : `${currentResult.outcome.toUpperCase()} · ${currentResult.total}`}
                    </span>
                )}
            </div>

            <div className={`id-canvas-wrap ${shakeClass}`}>
                <DiceCanvas
                    diceGameActive={diceGameActive}
                    DiceOutcomeSum={revealedTotal}
                    bettingSeconds={phase === "betting" ? countdown : null}
                    bettingTotal={ROUND_SECONDS}
                />
                <div className="id-dice-3d">
                    <Dice3DScene faces={diceFaces} spinning={diceIsSpinning} active={diceGameActive}/>
                </div>
                <EffectsCanvas phase={phase} total={revealedTotal} won={currentResult?.won ?? null}/>
            </div>
        </div>
    );
};
