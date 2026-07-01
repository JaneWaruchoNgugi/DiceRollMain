export type Range = "under" | "over";

export type RoundPhase = "betting" | "rolling" | "result";

export type Tab = "game" | "history" | "statistics" | "rewards" | "fairness";

export interface RoundResult {
    id: number;
    dices: number[];
    total: number;
    outcome: Range;          // which side won this round (raw vs 10.5, for trend)
    betRange: Range | null;  // the side the player backed (null = sat out)
    stake: number;
    won: boolean;
    winnings: number;
    mult: number;            // payout multiplier the bet was placed at
    wallet: Wallet;          // wallet the stake/winnings belong to
}

export interface GameStats {
    totalBets: number;
    totalWins: number;
    biggestWin: number;
}

export const ROUND_SECONDS = 10;
export const ROLL_DURATION_MS = 2500;   // dice spin time before the result is revealed
export const STARTING_BALANCE = 5000;
export const BONUS_STARTING_BALANCE = 1000;
export const MIN_BET = 10;
export const DICE_PAYOUT = 1.9;
export const BET_CHIPS = [100, 500, 1000, 3000];

/** Two separate wallets the player can bet from. */
export type Wallet = "cash" | "bonus";

/**
 * Payout / risk levels selected by the multiplier stepper. For a chosen side:
 *   UNDER wins if the dice total ≤ `under`, OVER wins if the total ≥ `over`.
 * Both sides share the same multiplier at a level (symmetric around 10.5), and
 * every level keeps a ~5% edge (mult ≈ 0.95 / chance) using the real 3-dice
 * sum distribution.
 */
export interface BetLevel {
    mult: number;    // payout multiplier
    under: number;   // UNDER wins when total ≤ this
    over: number;    // OVER wins when total ≥ this
    chance: number;  // win probability for the chosen side
}

export const BET_LEVELS: BetLevel[] = [
    {mult: 1.28, under: 12, over: 9,  chance: 0.741},
    {mult: 1.52, under: 11, over: 10, chance: 0.625},
    {mult: 1.90, under: 10, over: 11, chance: 0.500},
    {mult: 2.53, under: 9,  over: 12, chance: 0.375},
    {mult: 3.66, under: 8,  over: 13, chance: 0.259},
];
export const DEFAULT_LEVEL = 2;   // the classic 1.90× / 50% bet
