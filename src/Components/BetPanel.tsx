import {FC} from "react";
import {useGame} from "../Game/DiceGameContext.tsx";
import {BET_CHIPS, MIN_BET} from "../Game/gameTypes.ts";
import {ProgressBar} from "./ProgressBar.tsx";

export const BetPanel: FC = () => {
    const {
        betAmount, setBetAmount, range, setRange,
        potentialWin, canBet, placeBet, pendingBet, balance, phase,
    } = useGame();

    const placed = !!pendingBet;
    const buttonLabel = placed
        ? `BET PLACED · ${pendingBet!.range.toUpperCase()}`
        : phase !== "betting"
            ? "BETTING CLOSED"
            : betAmount > balance
                ? "INSUFFICIENT BALANCE"
                : `PLACE BET · ${betAmount} KES`;

    return (
        <section className="id-betpanel">
            <div className="id-block-title">Bet Amount</div>
            <div className="id-chips">
                {BET_CHIPS.map(v => (
                    <button
                        key={v}
                        className={`id-chip ${betAmount === v ? "id-chip-active" : ""}`}
                        onClick={() => setBetAmount(v)}
                        disabled={placed}
                    >{v}</button>
                ))}
            </div>

            <div className="id-stepper">
                <button className="id-step" onClick={() => setBetAmount(betAmount - 10)} disabled={placed}>−</button>
                <input
                    className="id-step-input"
                    type="number"
                    min={MIN_BET}
                    value={betAmount}
                    onChange={e => setBetAmount(parseInt(e.target.value, 10) || MIN_BET)}
                    disabled={placed}
                />
                <button className="id-step" onClick={() => setBetAmount(betAmount + 10)} disabled={placed}>+</button>
            </div>

            <div className="id-block-title">Select Range</div>
            <div className="id-range">
                <button
                    className={`id-range-btn id-under ${range === "under" ? "id-range-active" : ""}`}
                    onClick={() => setRange("under")}
                    disabled={placed}
                >
                    <span>Under</span><small>Total ≤ 10</small>
                </button>
                <button
                    className={`id-range-btn id-over ${range === "over" ? "id-range-active" : ""}`}
                    onClick={() => setRange("over")}
                    disabled={placed}
                >
                    <span>Over</span><small>Total ≥ 11</small>
                </button>
            </div>


            <button className="id-place-bet" onClick={placeBet} disabled={!canBet}>
                {buttonLabel}
            </button>
            <div className="id-target">Target Number: <strong>{range === "under" ? "Under 10.5" : "Over 10.5"}</strong></div>

            <div className="id-meta">
                <div><span>Win Chance</span><strong>50.00%</strong></div>
                <div><span>Payout</span><strong>x1.90</strong></div>
                <div><span>Potential Win</span><strong>KES {potentialWin}</strong></div>
            </div>

            <div className="id-progress">
                <ProgressBar progressOverUnder={range}/>
            </div>
        </section>
    );
};
