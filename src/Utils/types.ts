export type DiceSendData = {
    msisdn: string;
    option: "OVER" | "UNDER";
    amount: number;
};

export type DiceResultsData={
    message: string;
    msisdn: string;
    option: "OVER" | "UNDER";
    outcome: "OVER" | "UNDER";
    dices: number[];
    diceTotal: number;
    winnings: string;
    Multiplier: number;
    Balance: string;
}

