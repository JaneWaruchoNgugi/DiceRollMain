import {FC} from "react";
import {useGame} from "../Game/DiceGameContext.tsx";
import {useLiveActivity} from "../Hooks/useLiveActivity.ts";

export const LiveFeed: FC = () => {
    const {phase, currentResult} = useGame();
    const outcome = phase === "result" && currentResult ? currentResult.outcome : null;
    const {feed, online} = useLiveActivity(phase, outcome);

    return (
        <section className="id-live">
            <div className="id-live-head">
                <span className="id-live-title"><span className="id-live-dot"/> LIVE TABLE</span>
                <span className="id-online">{online.toLocaleString()} online</span>
            </div>
            <ul className="id-feed">
                {feed.map(e => (
                    <li key={e.id} className={`id-feed-row id-feed-${e.status}`}>
                        <span className="id-feed-name">{e.name}</span>
                        {e.status === "bet" && (
                            <span className="id-feed-act">
                                <span className={`id-side id-side-${e.side}`}>{e.side}</span>
                                <span className="id-feed-amt">{e.amount}</span>
                            </span>
                        )}
                        {e.status === "won" && <span className="id-feed-win">+{e.payout}</span>}
                        {e.status === "lost" && <span className="id-feed-loss">−{e.amount}</span>}
                    </li>
                ))}
            </ul>
        </section>
    );
};
