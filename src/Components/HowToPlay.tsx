import {FC, useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {HelpCircle, X, Dices, TrendingDown, TrendingUp, Coins} from "lucide-react";

/** Header button + modal explaining the Under/Over dice rules. */
export const HowToPlay: FC = () => {
    const [open, setOpen] = useState(false);

    // Close on Escape and lock body scroll while the modal is open.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        window.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open]);

    return (
        <>
            <button
                type="button"
                className="id-help-btn"
                onClick={() => setOpen(true)}
                aria-haspopup="dialog"
                title="How to play"
            >
                <HelpCircle size={18} aria-hidden/>
                <span className="id-help-btn-label">How to Play</span>
            </button>

            {open && createPortal(
                <div
                    className="id-modal-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="howto-title"
                    onClick={() => setOpen(false)}
                >
                    <div className="id-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="id-modal-head">
                            <h2 id="howto-title" className="id-modal-title">
                                <Dices size={20} aria-hidden/> How to Play
                            </h2>
                            <button className="id-modal-close" onClick={() => setOpen(false)} aria-label="Close">
                                <X size={20} aria-hidden/>
                            </button>
                        </div>

                        <p className="id-modal-lead">
                            Predict whether the total of the three dice lands{" "}
                            <strong>UNDER</strong> or <strong>OVER</strong> the halfway line.
                        </p>

                        <ol className="id-howto-steps">
                            <li><span>1</span> Set your stake with the chips or the − / + stepper.</li>
                            <li><span>2</span> Pick a side — <em className="u">UNDER</em> (total ≤ 10) or <em className="o">OVER</em> (total ≥ 11).</li>
                            <li><span>3</span> Hit <strong>PLACE BET</strong> before the countdown reaches zero.</li>
                            <li><span>4</span> The three dice roll. If your side wins, you're paid <strong>×1.90</strong>.</li>
                        </ol>

                        <div className="id-howto-cards">
                            <div className="id-howto-card u">
                                <TrendingDown size={18} aria-hidden/>
                                <span>Under</span>
                                <strong>Total ≤ 10</strong>
                            </div>
                            <div className="id-howto-card o">
                                <TrendingUp size={18} aria-hidden/>
                                <span>Over</span>
                                <strong>Total ≥ 11</strong>
                            </div>
                            <div className="id-howto-card m">
                                <Coins size={18} aria-hidden/>
                                <span>Payout</span>
                                <strong>×1.90</strong>
                            </div>
                        </div>

                        <p className="id-modal-note">
                            Each side has a 50% chance (the split line is 10.5). You can sit a round
                            out anytime by not placing a bet.
                        </p>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
