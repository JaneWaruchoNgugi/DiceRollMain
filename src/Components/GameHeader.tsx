import {FC} from "react";
import {Dices, Volume2, VolumeX} from "lucide-react";
import {useGame} from "../Game/DiceGameContext.tsx";
import {useCountUp} from "../Hooks/useCountUp.ts";
import {HowToPlay} from "./HowToPlay.tsx";

export const GameHeader: FC = () => {
    const {balance, muted, toggleMute} = useGame();
    const shown = useCountUp(balance);

    return (
        <header className="id-header">
            <div className="id-logo">
                <Dices className="id-logo-mark" size={24} strokeWidth={2.2} aria-hidden/>
                <span className="id-logo-text">DICE<strong>ROLL</strong></span>
                <span className="id-logo-tag">LIVE</span>
            </div>
            <div className="id-header-right">
                <div className="id-balance">
                    <span className="id-balance-label">Balance</span>
                    <span className="id-balance-value">
                        KES {shown.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </span>
                </div>
                <HowToPlay/>
                <button
                    type="button"
                    className={`id-sound-btn ${muted ? "is-muted" : ""}`}
                    onClick={toggleMute}
                    aria-pressed={!muted}
                    aria-label={muted ? "Unmute sound" : "Mute sound"}
                    title={muted ? "Unmute" : "Mute"}
                >
                    {muted ? <VolumeX size={18} aria-hidden/> : <Volume2 size={18} aria-hidden/>}
                </button>
            </div>
        </header>
    );
};
