"use client";

import React, { useRef } from 'react';

// Value format: local "YYYY-MM-DDTHH:mm". Either part may be empty while the user is choosing.
interface DateTimePickerProps {
    value: string;
    onChange: (value: string) => void;
    busyTimes?: string[]; // local "YYYY-MM-DDTHH:mm" of other turns
    error?: string;
}

export const isCompleteDateTime = (value: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);

// Opens the native picker when tapping anywhere on the field, not only on the small icon
const openPicker = (input: HTMLInputElement | null) => {
    try {
        input?.showPicker();
    } catch {
        input?.focus();
    }
};

export default function DateTimePicker({ value, onChange, busyTimes = [], error }: DateTimePickerProps) {
    const [date = '', time = ''] = value.split('T');
    const dateRef = useRef<HTMLInputElement>(null);
    const timeRef = useRef<HTMLInputElement>(null);

    const clash = isCompleteDateTime(value) && busyTimes.includes(value);

    return (
        <div className="mb-5">
            <div className="grid grid-cols-[1.4fr_1fr] gap-3">
                <div>
                    <label htmlFor="turn-date" className="block text-base font-semibold text-slate-200 mb-2">Fecha *</label>
                    <input
                        ref={dateRef}
                        id="turn-date"
                        type="date"
                        value={date}
                        onChange={(e) => onChange(`${e.target.value}T${time}`)}
                        onClick={() => openPicker(dateRef.current)}
                        aria-invalid={!!error && !date}
                        aria-describedby={error ? 'turn-datetime-error' : undefined}
                        className="input-field text-lg font-medium cursor-pointer"
                    />
                </div>
                <div>
                    <label htmlFor="turn-time" className="block text-base font-semibold text-slate-200 mb-2">Hora *</label>
                    <input
                        ref={timeRef}
                        id="turn-time"
                        type="time"
                        step={300}
                        value={time}
                        onChange={(e) => onChange(`${date}T${e.target.value}`)}
                        onClick={() => openPicker(timeRef.current)}
                        aria-invalid={!!error && !time}
                        aria-describedby={error ? 'turn-datetime-error' : undefined}
                        className="input-field text-lg font-medium cursor-pointer"
                    />
                </div>
            </div>

            {error && <p id="turn-datetime-error" role="alert" className="mt-2 text-sm font-medium text-rose-400">{error}</p>}
            {!error && clash && (
                <p className="mt-2 text-sm text-amber-400">Ya tenés otro turno ese día a esa hora.</p>
            )}
        </div>
    );
}
