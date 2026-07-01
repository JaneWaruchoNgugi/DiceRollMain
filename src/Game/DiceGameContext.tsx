import {createContext, FC, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {rollDice} from "../Utils/diceLogic.ts";
import {useDiceAudioControl} from "../Hooks/useDiceSound.ts";
import {usePersistentState} from "../Hooks/usePersistentState.ts";
import {
    DICE_PAYOUT,
    GameStats,
    MIN_BET,
    OVER_MIN,
    Range,
    ROLL_DURATION_MS,
    RoundPhase,
    RoundResult,
    ROUND_SECONDS,
    STARTING_BALANCE,
    Tab,
    UNDER_MAX,
    WIN_CHANCE,
} from "./gameTypes.ts";

const ROLL_MS = ROLL_DURATION_MS;  // dice roll duration (shared with the canvas animation)
const RESULT_MS = 2500;            // result reveal before next round

interface PendingBet {
    range: Range;
    stake: number;
}

interface DiceGameValue {
    balance: number;
    betAmount: number;
    range: Range;
    mult: number;                // fixed payout multiplier
    winChance: number;           // 0..1
    underThreshold: number;      // UNDER wins if total ≤ this
    overThreshold: number;       // OVER wins if total ≥ this
    phase: RoundPhase;
    countdown: number;
    diceFaces: number[];
    revealedTotal: number;       // shown in the chamber on result, else 0
    pendingBet: PendingBet | null;
    currentResult: RoundResult | null;
    recentResults: RoundResult[];
    stats: GameStats;
    activeTab: Tab;
    potentialWin: number;
    canBet: boolean;
    muted: boolean;
    toggleMute: () => void;
    setBetAmount: (n: number) => void;
    setRange: (r: Range) => void;
    placeBet: () => void;
    setActiveTab: (t: Tab) => void;
}

const DiceGameContext = createContext<DiceGameValue | null>(null);

export const useGame = (): DiceGameValue => {
    const ctx = useContext(DiceGameContext);
    if (!ctx) throw new Error("useGame must be used within DiceGameProvider");
    return ctx;
};

const EMPTY_STATS: GameStats = {totalBets: 0, totalWins: 0, biggestWin: 0};

export const DiceGameProvider: FC<{ children: ReactNode }> = ({children}) => {
    const {muted, toggleMute, playDiceSound, startRoll, stopRoll, playBetPlaced, playTick, playChip} = useDiceAudioControl();

    const [balance, setBalance] = usePersistentState<number>("dice.balance.cash", STARTING_BALANCE);
    const [stats, setStats] = usePersistentState<GameStats>("dice.stats", EMPTY_STATS);
    const [recentResults, setRecentResults] = usePersistentState<RoundResult[]>("dice.results", []);

    const [betAmount, setBetAmountState] = useState<number>(MIN_BET);
    const [range, setRange] = useState<Range>("under");
    const [phase, setPhase] = useState<RoundPhase>("betting");
    const [countdown, setCountdown] = useState<number>(ROUND_SECONDS);
    const [pendingBet, setPendingBet] = useState<PendingBet | null>(null);
    const [diceFaces, setDiceFaces] = useState<number[]>([1, 2, 4]);
    const [revealedTotal, setRevealedTotal] = useState<number>(0);
    const [currentResult, setCurrentResult] = useState<RoundResult | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>("game");

    // Refs mirror state the phase-effect needs without re-subscribing each render.
    const pendingBetRef = useRef<PendingBet | null>(null);
    pendingBetRef.current = pendingBet;
    const roundRef = useRef<RoundResult | null>(null);
    const appliedRoundRef = useRef<number>(-1);
    // Seed past any results already persisted in localStorage to avoid key collisions.
    const idRef = useRef<number>(recentResults.reduce((m, r) => Math.max(m, r.id), 0) + 1);

    const setBetAmount = useCallback((n: number) => {
        playChip();
        setBetAmountState(Math.max(MIN_BET, Math.floor(n) || MIN_BET));
    }, [playChip]);

    const chooseRange = useCallback((r: Range) => { playChip(); setRange(r); }, [playChip]);

    const placeBet = useCallback(() => {
        if (phase !== "betting" || pendingBet) return;
        const stake = Math.max(MIN_BET, betAmount);
        if (stake > balance) return;
        setBalance(b => b - stake);
        setPendingBet({range, stake});
        playBetPlaced();
    }, [phase, pendingBet, betAmount, balance, range, setBalance, playBetPlaced]);

    // Round lifecycle state machine, driven purely by `phase`.
    useEffect(() => {
        if (phase === "betting") {
            // Drive the countdown from a plain counter so side effects (ticks,
            // phase change) run in the interval callback — never inside a state
            // updater, which React may call multiple times and at odd moments.
            let remaining = ROUND_SECONDS;
            setCountdown(remaining);
            const interval = setInterval(() => {
                remaining -= 1;
                if (remaining <= 0) {
                    clearInterval(interval);
                    setPhase("rolling");
                    return;
                }
                setCountdown(remaining);
                if (remaining <= 3) playTick();  // tension ticks: 3, 2, 1
            }, 1000);
            return () => clearInterval(interval);
        }

        if (phase === "rolling") {
            const roll = rollDice();
            const bet = pendingBetRef.current;
            const betRange: Range | null = bet ? bet.range : null;
            const outcome: Range = roll.total <= UNDER_MAX ? "under" : "over";
            const won = bet ? betRange === outcome : false;
            const stake = bet ? bet.stake : 0;
            const winnings = won ? Math.round(stake * DICE_PAYOUT * 100) / 100 : 0;

            roundRef.current = {
                id: idRef.current++,
                dices: roll.dices,
                total: roll.total,
                outcome,
                betRange,
                stake,
                won,
                winnings,
            };
            setDiceFaces(roll.dices);
            setRevealedTotal(0);
            startRoll();

            const t = setTimeout(() => setPhase("result"), ROLL_MS);
            // Stop the roll audio the instant we leave the rolling phase so it
            // stays locked to the actual dice rotation.
            return () => { clearTimeout(t); stopRoll(); };
        }

        // phase === "result"
        const round = roundRef.current;
        if (round && appliedRoundRef.current !== round.id) {
            appliedRoundRef.current = round.id;
            setRevealedTotal(round.total);
            setCurrentResult(round);
            setRecentResults(prev => [round, ...prev].slice(0, 10));

            if (round.betRange) {
                setStats(s => ({
                    totalBets: s.totalBets + 1,
                    totalWins: s.totalWins + (round.won ? 1 : 0),
                    biggestWin: Math.max(s.biggestWin, round.winnings),
                }));
                if (round.won) {
                    setBalance(b => b + round.winnings);
                    playDiceSound("WinSnd");
                } else {
                    playDiceSound("LoseSnd");
                }
            }
        }

        const t = setTimeout(() => {
            setPendingBet(null);
            setRevealedTotal(0);
            setPhase("betting");
        }, RESULT_MS);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    const potentialWin = Math.round(Math.max(MIN_BET, betAmount) * DICE_PAYOUT * 100) / 100;
    const canBet = phase === "betting" && !pendingBet && betAmount <= balance;

    const value = useMemo<DiceGameValue>(() => ({
        balance,
        betAmount,
        range,
        mult: DICE_PAYOUT,
        winChance: WIN_CHANCE,
        underThreshold: UNDER_MAX,
        overThreshold: OVER_MIN,
        phase,
        countdown,
        diceFaces,
        revealedTotal,
        pendingBet,
        currentResult,
        recentResults,
        stats,
        activeTab,
        potentialWin,
        canBet,
        muted,
        toggleMute,
        setBetAmount,
        setRange: chooseRange,
        placeBet,
        setActiveTab,
    }), [
        balance, betAmount, range, phase, countdown, diceFaces, revealedTotal, pendingBet,
        currentResult, recentResults, stats, activeTab, potentialWin, canBet, muted,
        toggleMute, setBetAmount, chooseRange, placeBet,
    ]);

    return <DiceGameContext.Provider value={value}>{children}</DiceGameContext.Provider>;
};
