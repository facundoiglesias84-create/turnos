"use client";

import React, { useEffect, useRef, useState } from 'react';

export interface SelectMenuItem {
    key: string;
    label: string;
    detail?: string;
    accent?: boolean;
    onSelect: () => void;
}

// Dropdown styled like the main view selector: dark button with icon, label and chevron
export default function SelectMenu({ label, icon, items, emptyText }: {
    label: string;
    icon: React.ReactNode;
    items: SelectMenuItem[];
    emptyText?: string;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: PointerEvent) => {
            if (!ref.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl bg-[#181828] border border-slate-700/50 text-white text-base font-semibold shadow-[0_10px_25px_rgba(0,0,0,0.35)] cursor-pointer transition-[transform,background-color] duration-200 hover:bg-[#1f1f33] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
                <span className="flex items-center gap-3">
                    {icon}
                    {label}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
            </button>

            <div
                role="menu"
                className={`absolute top-full left-0 right-0 mt-2 p-1.5 z-40 max-h-72 overflow-y-auto rounded-xl bg-[#181828] border border-slate-700/50 shadow-[0_10px_25px_rgba(0,0,0,0.45)] origin-top transition-[opacity,transform] duration-200 ease-out ${open ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-95 pointer-events-none'}`}
            >
                {items.length === 0 && emptyText && (
                    <p className="px-4 py-3 text-sm text-slate-400">{emptyText}</p>
                )}
                {items.map(item => (
                    <button
                        key={item.key}
                        type="button"
                        role="menuitem"
                        tabIndex={open ? 0 : -1}
                        onClick={() => { item.onSelect(); setOpen(false); }}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-left text-base transition-colors hover:bg-slate-800 ${item.accent ? 'text-purple-300 font-semibold' : 'text-slate-200 hover:text-white'}`}
                    >
                        <span className="truncate">{item.label}</span>
                        {item.detail && <span className="shrink-0 text-sm text-emerald-400 font-semibold">{item.detail}</span>}
                    </button>
                ))}
            </div>
        </div>
    );
}
