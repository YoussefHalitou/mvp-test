'use client';

import React, { forwardRef, useEffect, useState } from 'react';

type NumberInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
    value: number | null | undefined;
    onValueChange: (value: number | null, rawValue: string) => void;
    emptyWhenZero?: boolean;
};

const formatValue = (value: number | null | undefined, emptyWhenZero: boolean) => {
    if (value === null || value === undefined) return '';
    if (!Number.isFinite(value)) return '';
    if (emptyWhenZero && value === 0) return '';
    return String(value);
};

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
    { value, onValueChange, emptyWhenZero = false, onBlur, onFocus, inputMode = 'decimal', ...props },
    ref
) {
    const [focused, setFocused] = useState(false);
    const [draftValue, setDraftValue] = useState(() => formatValue(value, emptyWhenZero));

    useEffect(() => {
        if (!focused) setDraftValue(formatValue(value, emptyWhenZero));
    }, [emptyWhenZero, focused, value]);

    return (
        <input
            {...props}
            ref={ref}
            type="number"
            inputMode={inputMode}
            value={draftValue}
            onChange={event => {
                const rawValue = event.target.value;
                const normalizedValue = rawValue.replace(',', '.');
                setDraftValue(rawValue);

                if (rawValue.trim() === '') {
                    onValueChange(null, rawValue);
                    return;
                }

                const numericValue = Number(normalizedValue);
                if (Number.isFinite(numericValue)) {
                    onValueChange(numericValue, rawValue);
                }
            }}
            onFocus={event => {
                setFocused(true);
                onFocus?.(event);
            }}
            onBlur={event => {
                setFocused(false);
                setDraftValue(formatValue(value, emptyWhenZero));
                onBlur?.(event);
            }}
        />
    );
});
