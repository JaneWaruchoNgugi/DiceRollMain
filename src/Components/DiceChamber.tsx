import {FC} from "react";
import {Dices, Trophy, X, TrendingUp, TrendingDown} from "lucide-react";
import {DiceCanvas} from "./DiceCanvas.tsx";
import {Dice3DScene} from "./Dice3DScene.tsx";
import {EffectsCanvas} from "./EffectsCanvas.tsx";
import {useGame} from "../Game/DiceGameContext.tsx";
import {ROUND_SECONDS} from "../Game/gameTypes.ts";

export const DiceChamber: FC = () => {
    const {phase, countdown, diceFaces, revealedTotal, currentResult, recentResults} = useGame();

    const diceGameActive = phase !== "betting";
    const diceIsSpinning = phase === "rolling";

    // Motion: the chamber itself stays put — the rings/hexagon inside the canvas
    // spin during the roll (see EffectsCanvas). A win still lands a sharp jolt.
    const shakeClass = phase === "result" && currentResult?.won ? "id-shake-hit" : "";

    return (
        <div className="id-chamber">
            <div className="id-chamber-topstatus">
                {phase === "betting" && (
                    <span className="id-statusbar is-open">
                        <span className="id-statusbar-dot"/>
                        Place Your Bets
                    </span>
                )}
                {phase === "rolling" && (
                    <span className="id-statusbar is-rolling">
                        <Dices size={15} className="id-statusbar-spin" aria-hidden/>
                        Rolling
                        <span className="id-statusbar-dots"><i/><i/><i/></span>
                    </span>
                )}
                {phase === "result" && currentResult && (
                    currentResult.betRange ? (
                        currentResult.won ? (
                            <span className="id-statusbar is-win">
                                <Trophy size={15} aria-hidden/> You Win <b>KSh {currentResult.winnings}</b>
                            </span>
                        ) : (
                            <span className="id-statusbar is-lose">
                                <X size={15} aria-hidden/> No Win
                            </span>
                        )
                    ) : (
                        <span className={`id-statusbar ${currentResult.outcome === "over" ? "is-over" : "is-under"}`}>
                            {currentResult.outcome === "over"
                                ? <TrendingUp size={15} aria-hidden/>
                                : <TrendingDown size={15} aria-hidden/>}
                            {currentResult.outcome.toUpperCase()}
                        </span>
                    )
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

                {recentResults.length > 0 && (
                    <div className="id-history" aria-label="Previous results">
                        <span className="id-history-label">Last</span>
                        {recentResults.slice(0, 7).map((r, i) => (
                            <div
                                key={r.id}
                                className={`id-history-pill id-hist-${r.outcome} ${i === 0 ? "is-latest" : ""}`}
                            >
                                {r.total}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
