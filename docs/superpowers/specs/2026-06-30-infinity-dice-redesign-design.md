# Infinity Dice Redesign — Design Spec

Date: 2026-06-30
Status: Approved (pending spec review)

## Goal

Rebuild the DiceRollMain frontend to match the "Infinity Dice" neon mockups
(mobile portrait + desktop landscape) as a responsive, fully client-side
single-player game. No backend, no jackpot. Keep the existing local dice logic.

## Game rules (confirmed)

- 3 dice, sum range 3–18.
- 3d6 is symmetric around 10.5, so the split is an even 50/50:
  - UNDER = total ≤ 10
  - OVER = total ≥ 11
- Winning bets pay **1.9×** the stake (small house edge).
- Panel therefore displays: **Win Chance 50% · Payout x1.90 · Target 10.5**.
  (The mockup's 58.33% / 7.5 / x1.94 were 2-dice numbers and are intentionally
  not used.)

## Scope

In scope (all simulated client-side, persisted to `localStorage`):
- Wallet / balance (KES), deducted on bet, credited on win.
- Round countdown loop ("Place your bets / Rolls in Ns").
- Recent results row + statistics (total bets, total wins, biggest win).
- Bottom nav with Game / History / Statistics / Rewards / Fairness tabs.
- Neon responsive UI matching both mockups.

Explicitly out of scope:
- Mega Jackpot.
- Any backend, multiplayer, real money, or real provably-fair hashing.
- Rewards/daily-bonus economy (Rewards tab is a "coming soon" placeholder).

## Architecture

### State — single source of truth
`useDiceGame()` hook, exposed via `DiceGameProvider` React context.

State:
- `balance: number` (persisted, default 5000)
- `betAmount: number` (default 10, minimum 10)
- `range: "under" | "over"` (default "under")
- `phase: "betting" | "rolling" | "result"`
- `countdown: number` (seconds left in betting window)
- `currentRoll: DiceResultsData | null`
- `betPlaced: boolean` (is the player in the current round)
- `recentResults: RoundResult[]` (last 10, persisted)
- `stats: { totalBets, totalWins, biggestWin }` (persisted)

Actions:
- `setBetAmount(n)`, `setRange(r)`
- `placeBet()` — only valid during `betting` phase with sufficient balance;
  locks the bet, deducts the stake, sets `betPlaced = true`.

Round lifecycle (continuous loop):
1. `betting` — countdown from N seconds (default 10). Player may place one bet.
2. `rolling` — ~3.5s. `rollDiceGame()` is called to get the result; cubes animate.
3. `result` — if `betPlaced`, credit `winnings`, update stats, append to
   `recentResults`; brief display, then reset `betPlaced` and loop to `betting`.
   If no bet was placed, the round still resolves cosmetically.

### Persistence
`usePersistentState<T>(key, initial)` — small wrapper over `localStorage` +
`useState`. Used for balance, recentResults, stats. Wrapped in try/catch so a
broken/disabled storage falls back to in-memory defaults.

### Pure logic (unit-tested)
- `rollDiceGame(data)` — unchanged (`src/Utils/diceLogic.ts`).
- Reducers extracted as pure functions for testability:
  - `applyRoundResult(stats, result)` → new stats
  - `nextCountdown(state)` → phase/countdown transition

## Components

- `App` — wraps everything in `DiceGameProvider`, renders active tab + `BottomNav`.
- `GameHeader` — logo, balance pill, avatar.
- `DiceChamber` — neon glass cylinder. Betting: `NEXT ROLL ?` + countdown.
  Rolling: 3 spinning CSS 3D cubes (reusing `Dice1–6.png` faces). Result: final
  faces + total.
- `BetPanel` — amount chips (10/20/50/100) + custom input, Under/Over toggle,
  live Win Chance / Payout / Potential Win, `PLACE BET` (disabled when outside
  betting window or balance < stake).
- `RecentResults` — row of recent under/over chips.
- `StatsPanel` — total bets / total wins / biggest win.
- `BottomNav` — Game / History / Statistics / Rewards / Fairness.
- Tab screens: `GameScreen` (default), `HistoryScreen`, `StatisticsScreen`,
  `RewardsScreen` (placeholder), `FairnessScreen` (honest explanation of the
  local RNG — no fake hashing).

### Dice rendering
CSS 3D cubes (`transform-style: preserve-3d`), six faces mapped to the existing
PNGs. Roll = continuous tumble animation; settle = transition to the face
transform for each die's final value (mapping reused/adapted from the retired
`useDiceCanvasLOgic.ts` face logic).

## Responsive layout (one DOM, CSS only)

`infinity-dice.css` with CSS custom properties for the neon palette
(cyan/magenta/violet gradients, glassmorphism, glow). CSS Grid + media queries:
- Mobile (≤ ~720px): single column — header, chamber, bet panel, recent
  results; fixed bottom nav.
- Desktop: 3-column — left bet panel, center chamber, right stats/results; nav
  as a top/side strip.

## Files

New:
- `src/Game/DiceGameProvider.tsx`, `src/Hooks/useDiceGame.ts`
- `src/Hooks/usePersistentState.ts`
- `src/Components/GameHeader.tsx`, `DiceChamber.tsx`, `BetPanel.tsx`,
  `RecentResults.tsx`, `StatsPanel.tsx`, `BottomNav.tsx`
- `src/Screens/GameScreen.tsx`, `HistoryScreen.tsx`, `StatisticsScreen.tsx`,
  `RewardsScreen.tsx`, `FairnessScreen.tsx`
- `src/assets/infinity-dice.css`
- Tests: `src/Utils/diceLogic.test.ts`, reducer tests.

Kept:
- `src/Utils/diceLogic.ts`, `src/Utils/types.ts`, `src/Hooks/useDiceSound.ts`,
  dice face PNGs, audio.

Retired (deleted):
- `src/Components/MainDice.tsx`, `DiceCanvas.tsx`, `ProgressBar.tsx`,
  `DicePopUp.tsx`, `DiceBetControls.tsx`, `DiceBetHistory.tsx`
- `src/Hooks/useDiceCanvasLOgic.ts`, `useCanvasImages.ts`
  (their needed logic is absorbed into the new components/hook).

## Tooling

- Add **Vitest** + `@testing-library/react` as dev dependencies (project has no
  test runner today). `npm test` script added.

## Testing strategy

- Unit: `rollDiceGame` (dice in range, total correct, outcome threshold at
  10/11, payout math), stats reducer, countdown reducer.
- Component: `BetPanel` disables correctly; `placeBet` deducts balance and is
  blocked when insufficient.
- Manual: `npm run build` passes; mobile + desktop layouts verified against
  mockups.

## Open risks

- Continuous round loop with timers must clean up on unmount to avoid leaks.
- localStorage schema changes later would need versioning (out of scope now;
  noted for future).
