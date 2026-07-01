import {FC} from "react";
import {useGame} from "../Game/DiceGameContext.tsx";

export const StatsPanel: FC = () => {
    const {stats} = useGame();
    const winRate = stats.totalBets > 0
        ? Math.round((stats.totalWins / stats.totalBets) * 100)
        : 0;

    return (
        <section className="id-stats">
            <div className="id-block-title">Statistics</div>
            <div className="id-stats-grid">
                <div className="id-stat"><span>Total Bets</span><strong>{stats.totalBets}</strong></div>
                <div className="id-stat"><span>Total Wins</span><strong>{stats.totalWins}</strong></div>
                <div className="id-stat"><span>Win Rate</span><strong>{winRate}%</strong></div>
                <div className="id-stat"><span>Biggest Win</span><strong>KES {stats.biggestWin}</strong></div>
            </div>
        </section>
    );
};
