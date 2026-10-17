"use client";

import React, { useEffect } from 'react';

// Small centered confirmation for destructive actions
export default function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel }: {
    open: boolean;
    title: string;
    message?: string;
    confirmLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open, onCancel]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-6" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
            <div onClick={onCancel} className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
            <div className="relative w-full max-w-xs rounded-2xl bg-[#1c1c2c] border border-slate-700/60 p-5 shadow-[0_20px_40px_rgba(0,0,0,0.5)] animate-fade-in">
                <h2 id="confirm-title" className="text-lg font-bold text-white">{title}</h2>
                {message && <p className="mt-1.5 text-sm text-slate-300">{message}</p>}
                <div className="grid grid-cols-2 gap-2 mt-5">
                    <button onClick={onCancel} autoFocus className="h-11 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 font-semibold active:bg-slate-700">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} className="h-11 rounded-xl bg-rose-600 text-white font-semibold active:bg-rose-700">
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
