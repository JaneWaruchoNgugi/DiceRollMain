import {FC} from "react";
import {useGame} from "../Game/DiceGameContext.tsx";
import {useCountUp} from "../Hooks/useCountUp.ts";

export const GameHeader: FC = () => {
    const {balance, muted, toggleMute} = useGame();
    const shown = useCountUp(balance);

    return (
        <header className="id-header">
            <div className="id-logo">
                <span className="id-logo-mark">◈</span>
                <span className="id-logo-text">INFINITY<strong>DICE</strong></span>
                <span className="id-logo-tag">LIVE</span>
            </div>
            <div className="id-header-right">
                <div className="id-balance">
                    <span className="id-balance-label">Balance</span>
                    <span className="id-balance-value">
                        KES {shown.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </span>
                </div>
                <button
                    type="button"
                    className={`id-sound-btn ${muted ? "is-muted" : ""}`}
                    onClick={toggleMute}
                    aria-pressed={!muted}
                    aria-label={muted ? "Unmute sound" : "Mute sound"}
                    title={muted ? "Unmute" : "Mute"}
                >
                    {muted ? "🔇" : "🔊"}
                </button>
                <div className="id-avatar" aria-hidden>JN</div>
            </div>
        </header>
    );
};
