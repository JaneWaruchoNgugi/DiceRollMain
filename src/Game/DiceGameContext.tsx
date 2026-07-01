import {createContext, FC, ReactNode, useContext, useEffect, useRef, useState} from "react";
import {rollDice} from "../Utils/diceLogic.ts";
import {useDiceAudioControl} from "../Hooks/useDiceSound.ts";
import {usePersistentState} from "../Hooks/usePersistentState.ts";
import {
    BET_LEVELS,
    BONUS_STARTING_BALANCE,
    DEFAULT_LEVEL,
    GameStats,
    MIN_BET,
    Range,
    ROLL_DURATION_MS,
    RoundPhase,
    RoundResult,
    ROUND_SECONDS,
    STARTING_BALANCE,
    Tab,
    Wallet,
} from "./gameTypes.ts";

const ROLL_MS = ROLL_DURATION_MS;  // dice roll duration (shared with the canvas animation)
const RESULT_MS = 2500;            // result reveal before next round

interface PendingBet {
    range: Range;
    stake: number;
    levelIndex: number;
    wallet: Wallet;
}

interface DiceGameValue {
    balance: number;             // active wallet balance
    cashBalance: number;
    bonusBalance: number;
    wallet: Wallet;
    betAmount: number;
    range: Range;
    levelIndex: number;
    mult: number;                // payout multiplier at the current level
    winChance: number;           // 0..1 for the current level
    underThreshold: number;      // UNDER wins if total ≤ this
    overThreshold: number;       // OVER wins if total ≥ this
    auto: boolean;
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
    setWallet: (w: Wallet) => void;
    incLevel: () => void;
    decLevel: () => void;
    toggleAuto: () => void;
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

    const [cashBalance, setCashBalance] = usePersistentState<number>("dice.balance.cash", STARTING_BALANCE);
    const [bonusBalance, setBonusBalance] = usePersistentState<number>("dice.balance.bonus", BONUS_STARTING_BALANCE);
    const [wallet, setWalletState] = usePersistentState<Wallet>("dice.wallet", "cash");
    const [stats, setStats] = usePersistentState<GameStats>("dice.stats", EMPTY_STATS);
    const [recentResults, setRecentResults] = usePersistentState<RoundResult[]>("dice.results", []);

    const [betAmount, setBetAmountState] = useState<number>(MIN_BET);
    const [range, setRange] = useState<Range>("under");
    const [levelIndex, setLevelIndex] = useState<number>(DEFAULT_LEVEL);
    const [auto, setAuto] = useState<boolean>(false);
    const [phase, setPhase] = useState<RoundPhase>("betting");
    const [countdown, setCountdown] = useState<number>(ROUND_SECONDS);
    const [pendingBet, setPendingBet] = useState<PendingBet | null>(null);
    const [diceFaces, setDiceFaces] = useState<number[]>([1, 2, 4]);
    const [revealedTotal, setRevealedTotal] = useState<number>(0);
    const [currentResult, setCurrentResult] = useState<RoundResult | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>("game");

    const balance = wallet === "cash" ? cashBalance : bonusBalance;
    const level = BET_LEVELS[levelIndex];

    // Refs mirror state the phase-effect needs without re-subscribing each render.
    const pendingBetRef = useRef<PendingBet | null>(null);
    pendingBetRef.current = pendingBet;
    const autoRef = useRef(auto);
    autoRef.current = auto;
    const roundRef = useRef<RoundResult | null>(null);
    const appliedRoundRef = useRef<number>(-1);
    // Seed past any results already persisted in localStorage to avoid key collisions.
    const idRef = useRef<number>(recentResults.reduce((m, r) => Math.max(m, r.id), 0) + 1);

    const setBetAmount = (n: number) => {
        playChip();
        setBetAmountState(Math.max(MIN_BET, Math.floor(n) || MIN_BET));
    };
    const chooseRange = (r: Range) => { playChip(); setRange(r); };
    const setWallet = (w: Wallet) => { playChip(); setWalletState(w); };
    const incLevel = () => { playChip(); setLevelIndex(i => Math.min(BET_LEVELS.length - 1, i + 1)); };
    const decLevel = () => { playChip(); setLevelIndex(i => Math.max(0, i - 1)); };
    const toggleAuto = () => { playChip(); setAuto(a => !a); };

    const placeBet = () => {
        if (phase !== "betting" || pendingBet) return;
        const stake = Math.max(MIN_BET, betAmount);
        if (stake > balance) return;
        if (wallet === "cash") setCashBalance(b => b - stake);
        else setBonusBalance(b => b - stake);
        setPendingBet({range, stake, levelIndex, wallet});
        playBetPlaced();
    };
    // Ref so the phase effect can auto-place without re-subscribing.
    const placeBetRef = useRef(placeBet);
    placeBetRef.current = placeBet;

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
            // Auto-rebet: drop the same bet automatically once betting opens.
            const autoT = autoRef.current ? window.setTimeout(() => placeBetRef.current(), 500) : undefined;
            return () => { clearInterval(interval); if (autoT) window.clearTimeout(autoT); };
        }

        if (phase === "rolling") {
            const roll = rollDice();
            const bet = pendingBetRef.current;
            const betRange: Range | null = bet ? bet.range : null;
            const outcome: Range = roll.total <= 10 ? "under" : "over";  // raw split, for trend
            const lvl = bet ? BET_LEVELS[bet.levelIndex] : BET_LEVELS[DEFAULT_LEVEL];
            const won = bet
                ? (bet.range === "under" ? roll.total <= lvl.under : roll.total >= lvl.over)
                : false;
            const stake = bet ? bet.stake : 0;
            const winnings = won ? Math.round(stake * lvl.mult * 100) / 100 : 0;

            roundRef.current = {
                id: idRef.current++,
                dices: roll.dices,
                total: roll.total,
                outcome,
                betRange,
                stake,
                won,
                winnings,
                mult: lvl.mult,
                wallet: bet ? bet.wallet : "cash",
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
                    if (round.wallet === "cash") setCashBalance(b => b + round.winnings);
                    else setBonusBalance(b => b + round.winnings);
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

    const potentialWin = Math.round(Math.max(MIN_BET, betAmount) * level.mult * 100) / 100;
    const canBet = phase === "betting" && !pendingBet && betAmount <= balance;

    const value: DiceGameValue = {
        balance,
        cashBalance,
        bonusBalance,
        wallet,
        betAmount,
        range,
        levelIndex,
        mult: level.mult,
        winChance: level.chance,
        underThreshold: level.under,
        overThreshold: level.over,
        auto,
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
        setWallet,
        incLevel,
        decLevel,
        toggleAuto,
        placeBet,
        setActiveTab,
    };

    return <DiceGameContext.Provider value={value}>{children}</DiceGameContext.Provider>;
};
