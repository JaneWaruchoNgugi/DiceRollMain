import {FC} from "react";
import {Minus, Plus} from "lucide-react";
import {useGame} from "../Game/DiceGameContext.tsx";
import {BET_CHIPS, MIN_BET} from "../Game/gameTypes.ts";
import {ProgressBar} from "./ProgressBar.tsx";

export const BetPanel: FC = () => {
    const {
        betAmount, setBetAmount, range, setRange,
        mult, winChance, underThreshold, overThreshold,
        potentialWin, canBet, placeBet, pendingBet, balance, phase,
    } = useGame();

    const placed = !!pendingBet;
    const closed = phase !== "betting";
    const insufficient = betAmount > balance;

    const betLabel = placed
        ? "BET PLACED"
        : closed
            ? "BETTING CLOSED"
            : insufficient
                ? "LOW BALANCE"
                : "BET";

    return (
        <section className="id-betpanel">
            {/* Direction — kept from the dice game */}
            <div className="id-block-title">Select Range</div>
            <div className="id-range">
                <button
                    className={`id-range-btn id-under ${range === "under" ? "id-range-active" : ""}`}
                    onClick={() => setRange("under")}
                    disabled={placed}
                >
                    <span>Under</span><small>Total ≤ {underThreshold}</small>
                </button>
                <button
                    className={`id-range-btn id-over ${range === "over" ? "id-range-active" : ""}`}
                    onClick={() => setRange("over")}
                    disabled={placed}
                >
                    <span>Over</span><small>Total ≥ {overThreshold}</small>
                </button>
            </div>

            {/* Stake stepper + BET */}
            <div className="id-bet-mainrow">
                <div className="id-amt">
                    <button className="id-amt-step" onClick={() => setBetAmount(betAmount - 10)} disabled={placed} aria-label="Decrease">
                        <Minus size={16}/>
                    </button>
                    <input
                        className="id-amt-input"
                        type="number"
                        min={MIN_BET}
                        value={betAmount}
                        onChange={e => setBetAmount(parseInt(e.target.value, 10) || MIN_BET)}
                        disabled={placed}
                    />
                    <button className="id-amt-step" onClick={() => setBetAmount(betAmount + 10)} disabled={placed} aria-label="Increase">
                        <Plus size={16}/>
                    </button>
                </div>

                <button className="id-bet-btn" onClick={placeBet} disabled={!canBet}>
                    <strong>{betLabel}</strong>
                    <small>KSh {betAmount}</small>
                </button>
            </div>

            {/* Quick amounts */}
            <div className="id-quickchips">
                {BET_CHIPS.map(v => (
                    <button
                        key={v}
                        className={`id-quickchip ${betAmount === v ? "is-active" : ""}`}
                        onClick={() => setBetAmount(v)}
                        disabled={placed}
                    >{v}</button>
                ))}
            </div>

            <div className="id-target">
                Target: <strong>{range === "under" ? `Under ${underThreshold + 0.5}` : `Over ${overThreshold - 0.5}`}</strong>
            </div>

            <div className="id-meta">
                <div><span>Win Chance</span><strong>{(winChance * 100).toFixed(2)}%</strong></div>
                <div><span>Payout</span><strong>x{mult.toFixed(2)}</strong></div>
                <div><span>Potential Win</span><strong>KES {potentialWin}</strong></div>
            </div>

            <div className="id-progress">
                <ProgressBar progressOverUnder={range}/>
            </div>
        </section>
    );
};
