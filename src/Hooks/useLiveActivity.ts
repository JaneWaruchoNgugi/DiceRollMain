import {useEffect, useRef, useState} from "react";
import {Range, RoundPhase} from "../Game/gameTypes.ts";

// Locally-simulated "other players" so the single-player round feels like a
// live, populated table. Bets stream in during the betting window, then resolve
// against the round's real outcome.

const NAMES = [
    "Kevin", "Aisha", "Brian", "Zawadi", "Otieno", "Mwangi", "Wanjiru", "Juma",
    "Neema", "Baraka", "Halima", "Dexter", "Salma", "Onyango", "Chebet", "Kamau",
    "Imani", "Tariq", "Lulu", "Femi", "Nadia", "Kipchoge", "Asha", "Mutua",
];
const AMOUNTS = [10, 20, 20, 50, 50, 50, 100, 100, 200, 500];

export interface FeedEntry {
    id: number;
    name: string;
    side: Range;
    amount: number;
    status: "bet" | "won" | "lost";
    payout?: number;
}

const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T, >(a: T[]) => a[rand(a.length)];
const makeName = () => `${pick(NAMES)}_${100 + rand(899)}`;

// Module-scoped so ids stay globally unique across StrictMode remounts.
let SEQ = 0;
const nextId = () => ++SEQ;

export const useLiveActivity = (phase: RoundPhase, outcome: Range | null) => {
    const [feed, setFeed] = useState<FeedEntry[]>([]);
    const [online, setOnline] = useState<number>(1180 + rand(640));
    const roundBets = useRef<FeedEntry[]>([]);
    const resolvedRef = useRef(false);

    // Players-online gently drifts.
    useEffect(() => {
        const t = setInterval(() => setOnline(o => Math.max(820, o + (rand(31) - 15))), 2400);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if (phase === "betting") {
            roundBets.current = [];
            resolvedRef.current = false;
            const t = setInterval(() => {
                const e: FeedEntry = {
                    id: nextId(),
                    name: makeName(),
                    side: Math.random() < 0.5 ? "under" : "over",
                    amount: pick(AMOUNTS),
                    status: "bet",
                };
                roundBets.current = [e, ...roundBets.current].slice(0, 16);
                setFeed(prev => [e, ...prev].slice(0, 16));
            }, 850);
            return () => clearInterval(t);
        }

        if (phase === "result" && outcome && !resolvedRef.current) {
            resolvedRef.current = true;
            const resolved = roundBets.current.slice(0, 5).map(b => {
                const won = b.side === outcome;
                return {
                    ...b,
                    id: nextId(),
                    status: (won ? "won" : "lost") as FeedEntry["status"],
                    payout: won ? Math.round(b.amount * 1.9 * 100) / 100 : undefined,
                };
            });
            if (resolved.length) setFeed(prev => [...resolved, ...prev].slice(0, 16));
        }
    }, [phase, outcome]);

    return {feed, online};
};
