import {DiceResultsData, DiceSendData} from "./types.ts";

// Local replacement for the dice game server (previously over wss://lottomotto.co.ke/ws13).
// Rolls 3 dice, decides OVER/UNDER from the total and pays out with a small house edge.

export const DICE_MULTIPLIER = 1.9;

const rollSingleDie = (): number => Math.floor(Math.random() * 6) + 1;

export interface DiceRoll {
    dices: number[];
    total: number;
    outcome: "OVER" | "UNDER";
}

// Rolls 3 dice and decides the OVER/UNDER outcome, independent of any bet.
export const rollDice = (): DiceRoll => {
    const dices = [rollSingleDie(), rollSingleDie(), rollSingleDie()];
    const total = dices.reduce((sum, die) => sum + die, 0);
    // 3d6 (range 3-18) is symmetric around 10.5, so this split is an even 50/50.
    const outcome: "OVER" | "UNDER" = total >= 11 ? "OVER" : "UNDER";
    return {dices, total, outcome};
};

export const rollDiceGame = (data: DiceSendData): DiceResultsData => {
    const {dices, total: diceTotal, outcome} = rollDice();
    const won = data.option === outcome;
    const winnings = won ? (data.amount * DICE_MULTIPLIER).toFixed(2) : "0";

    return {
        message: won ? "win" : "lose",
        msisdn: data.msisdn,
        option: data.option,
        outcome,
        dices,
        diceTotal,
        winnings,
        Multiplier: DICE_MULTIPLIER,
        Balance: "0",
    };
};
