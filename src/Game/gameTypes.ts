export type Range = "under" | "over";

export type RoundPhase = "betting" | "rolling" | "result";

export type Tab = "game" | "history" | "statistics" | "rewards" | "fairness";

export interface RoundResult {
    id: number;
    dices: number[];
    total: number;
    outcome: Range;          // which side won this round
    betRange: Range | null;  // the side the player backed (null = sat out)
    stake: number;
    won: boolean;
    winnings: number;
}

export interface GameStats {
    totalBets: number;
    totalWins: number;
    biggestWin: number;
}

export const ROUND_SECONDS = 10;
export const ROLL_DURATION_MS = 2500;   // dice spin time before the result is revealed
export const STARTING_BALANCE = 5000;
export const MIN_BET = 10;
export const DICE_PAYOUT = 1.9;
export const BET_CHIPS = [10, 20, 50, 100];
