"use client";

import React, { useEffect, useState } from 'react';

// Bottom sheet for mobile editing: slides up, closes with the X, the backdrop or Escape
export default function Sheet({ open, title, onClose, children }: {
    open: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    // Keep mounted during the exit transition
    const [mounted, setMounted] = useState(open);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (open) {
            setMounted(true);
            const id = requestAnimationFrame(() => setVisible(true));
            return () => cancelAnimationFrame(id);
        }
        setVisible(false);
        const t = setTimeout(() => setMounted(false), 200);
        return () => clearTimeout(t);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, onClose]);

    if (!mounted) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
            <div
                onClick={onClose}
                className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
            />
            <div
                className={`relative w-full max-w-md max-h-[90vh] flex flex-col rounded-t-2xl bg-[#14141f] border border-slate-700/60 border-b-0 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] transition-transform duration-200 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}
            >
                <div className="flex justify-center pt-2.5" aria-hidden="true">
                    <span className="w-10 h-1 rounded-full bg-slate-600" />
                </div>
                <div className="flex items-center justify-between px-5 pt-2 pb-3">
                    <h2 className="text-lg font-bold text-white">{title}</h2>
                    <button onClick={onClose} aria-label="Cerrar" className="-mr-2 w-11 h-11 flex items-center justify-center rounded-full text-slate-400 active:bg-slate-800">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                    {children}
                </div>
            </div>
        </div>
    );
}
