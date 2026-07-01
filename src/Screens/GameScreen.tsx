import {FC} from "react";
import {DiceChamber} from "../Components/DiceChamber.tsx";
import {BetPanel} from "../Components/BetPanel.tsx";
import {TrendStrip} from "../Components/TrendStrip.tsx";
import {StatsPanel} from "../Components/StatsPanel.tsx";
import {LiveFeed} from "../Components/LiveFeed.tsx";

export const GameScreen: FC = () => (
    <div className="id-game-grid">
        <div className="id-col id-col-left">
            <BetPanel/>
            <StatsPanel/>
        </div>
        <div className="id-col id-col-center">
            <DiceChamber/>
        </div>
        <div className="id-col id-col-right">
            <TrendStrip/>
            <LiveFeed/>
        </div>
    </div>
);
