import {useEffect, useRef, useState} from "react";

// Smoothly animates a number toward `value` (used for the balance counter).
export const useCountUp = (value: number, ms = 700): number => {
    const [display, setDisplay] = useState(value);
    const fromRef = useRef(value);

    useEffect(() => {
        const from = fromRef.current;
        const to = value;
        if (from === to) return;
        let raf = 0;
        let start = 0;
        const step = (t: number) => {
            if (!start) start = t;
            const p = Math.min(1, (t - start) / ms);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(from + (to - from) * eased);
            if (p < 1) raf = requestAnimationFrame(step);
            else fromRef.current = to;
        };
        raf = requestAnimationFrame(step);
        return () => {
            cancelAnimationFrame(raf);
            fromRef.current = value;
        };
    }, [value, ms]);

    return display;
};
