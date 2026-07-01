import {FC} from "react";
import {useGame} from "../Game/DiceGameContext.tsx";

export const TrendStrip: FC = () => {
    const {recentResults} = useGame();
    const bars = recentResults.slice(0, 9).reverse(); // oldest → newest, left → right

    const top = recentResults[0]?.outcome;
    let streak = 0;
    for (const r of recentResults) {
        if (r.outcome === top) streak++;
        else break;
    }

    return (
        <section className="id-trend">
            <div className="id-trend-head">
                <span className="id-block-title id-trend-title">Trend</span>
                {streak > 0 && top && (
                    <span className={`id-streak id-side-${top}`}>{streak} {top.toUpperCase()} streak</span>
                )}
            </div>
            <div className="id-trend-bars">
                {bars.length === 0 && <span className="id-recent-empty">Awaiting first roll…</span>}
                {bars.map(r => {
                    const h = 14 + ((r.total - 3) / 15) * 44; // 14–58px for totals 3–18
                    return (
                        <div key={r.id} className="id-bar-col" title={`Total ${r.total} · ${r.outcome}`}>
                            <span className="id-bar-val">{r.total}</span>
                            <div className={`id-bar id-side-bg-${r.outcome}`} style={{height: `${h}px`}}/>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};
