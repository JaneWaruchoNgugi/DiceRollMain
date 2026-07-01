import {useCallback, useState} from "react";

// useState backed by localStorage. Falls back to in-memory state if storage is
// unavailable (private mode, disabled, quota) so the game never crashes.
export const usePersistentState = <T,>(key: string, initial: T) => {
    const [value, setValue] = useState<T>(() => {
        try {
            const raw = localStorage.getItem(key);
            return raw !== null ? (JSON.parse(raw) as T) : initial;
        } catch {
            return initial;
        }
    });

    const set = useCallback((next: T | ((prev: T) => T)) => {
        setValue(prev => {
            const resolved = typeof next === "function"
                ? (next as (p: T) => T)(prev)
                : next;
            try {
                localStorage.setItem(key, JSON.stringify(resolved));
            } catch {
                // ignore write failures; keep in-memory value
            }
            return resolved;
        });
    }, [key]);

    return [value, set] as const;
};
