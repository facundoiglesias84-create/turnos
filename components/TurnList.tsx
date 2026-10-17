"use client";

import React, { useState, useEffect } from 'react';
import Sheet from './Sheet';
import ConfirmDialog from './ConfirmDialog';

export interface Turn {
    id: string;
    clientName: string;
    dateTime: string;
    task?: string;
    completed?: boolean | null;
    estimatedPrice?: number;
    deposit?: number;
    paid?: boolean;
    reminderTime?: string | null;
    reminderSent?: boolean;
}

interface TurnListProps {
    turns: Turn[];
    onDelete: (id: string) => void;
    onStatusChange: (id: string, status: boolean) => void;
    onPaidChange?: (id: string, paid: boolean) => void;
    onUpdatePrice?: (id: string, newPrice: number) => void;
    onUpdateDeposit?: (id: string, newDeposit: number) => void;
    onSetReminder?: (id: string, date: string | null) => void;
    onReminderSent?: (id: string) => void;
    onEditTurn?: (turn: Turn) => void;
    onReschedule?: (id: string, newDate: string) => void;
    onUpdateTask?: (id: string, task: string) => void;
    // New Props for Price-Aware Editing
    prices?: { id: string, service_name: string, price: number }[];
    onUpdateTurnData?: (id: string, data: { task: string, price: number }) => void;
}

export default function TurnList({
    turns,
    prices = [],
    onDelete,
    onStatusChange,
    onPaidChange,
    onUpdatePrice,
    onUpdateDeposit,
    onSetReminder,
    onReminderSent,
    onEditTurn,
    onReschedule,
    onUpdateTask,
    onUpdateTurnData
}: TurnListProps) {
    // Turn pending delete confirmation
    const [turnToDelete, setTurnToDelete] = useState<Turn | null>(null);

    // Reschedule Modal State
    const [rescheduleModalOpen, setRescheduleModalOpen] = useState<string | null>(null);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleTime, setRescheduleTime] = useState('');

    // In-App Notification State
    const [activeNotification, setActiveNotification] = useState<Turn | null>(null);
    const viewedNotifications = React.useRef(new Set<string>());

    // Check for reminders every 2 seconds
    useEffect(() => {
        const checkReminders = () => {
            const now = new Date();
            turns.forEach(turn => {
                // Check if notification was already viewed locally to prevent loop
                if (viewedNotifications.current.has(turn.id)) return;

                if (turn.reminderTime && !turn.reminderSent) {
                    const reminderTime = new Date(turn.reminderTime);
                    // Check if it's time (within the last 5 minutes to be safe)
                    if (now >= reminderTime && now.getTime() - reminderTime.getTime() < 60000 * 5) {
                        // Trigger notification
                        showNotification(turn);

                        // Mark as sent to prevent loop in DB
                        if (onReminderSent) onReminderSent(turn.id);
                    }
                }
            });
        };

        const interval = setInterval(checkReminders, 2000); // Check every 2s
        return () => clearInterval(interval);
    }, [turns, onReminderSent]);

    const showNotification = (turn: Turn) => {
        if (viewedNotifications.current.has(turn.id)) return;

        const turnDate = new Date(turn.dateTime);
        const dateStr = turnDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' });
        const timeStr = turnDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
        const bodyText = `El turno es el ${dateStr} a las ${timeStr} hs.`;

        // 1. Try Service Worker Notification (Best for Android)
        if ('serviceWorker' in navigator && 'Notification' in window) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(`Recordatorio: ${turn.clientName}`, {
                    body: bodyText,
                    icon: '/icon.png',
                    vibrate: [200, 100, 200],
                    tag: 'reminder-' + turn.id,
                    data: { url: `https://wa.me/?text=${encodeURIComponent(`Hola ${turn.clientName}, te recuerdo tu turno...`)}` }
                } as any);
            });
        }
        // 2. Fallback to standard Notification
        else if ('Notification' in window && Notification.permission === 'granted') {
            const notif = new Notification(`Recordatorio: ${turn.clientName}`, {
                body: bodyText,
                icon: '/icon.png'
            });
            notif.onclick = () => {
                window.focus();
                openWhatsApp(turn);
            };
        }

        // 3. Always show In-App Alert (Fail-safe)
        setActiveNotification(turn);
    };

    const handleDismissNotification = () => {
        if (activeNotification) {
            viewedNotifications.current.add(activeNotification.id);
            setActiveNotification(null);
        }
    };

    const openWhatsApp = (turn: Turn) => {
        const date = new Date(turn.dateTime).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
        const time = new Date(turn.dateTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
        const message = `Hola ${turn.clientName}! Te recuerdo que tienes un turno agendado para el ${date} a las ${time} hs. Por favor confirma asistencia. Gracias!`;
        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
        handleDismissNotification();
    };

    const formatPrice = (price: number) => {
        return `$${price.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const getRelativeDateLabel = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const turnDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        if (turnDay.getTime() === today.getTime()) return 'Hoy';
        if (turnDay.getTime() === tomorrow.getTime()) return 'Mañana';

        return date.toLocaleDateString('es-AR', { weekday: 'long' });
    };

    const openRescheduleModal = (turn: Turn) => {
        setRescheduleModalOpen(turn.id);
        const dateObj = new Date(turn.dateTime);
        const localIso = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString();
        setRescheduleDate(localIso.split('T')[0]);
        setRescheduleTime(dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }));
    };

    const saveReschedule = () => {
        if (rescheduleModalOpen && onReschedule) {
            const fullDate = new Date(`${rescheduleDate}T${rescheduleTime}`);
            onReschedule(rescheduleModalOpen, fullDate.toISOString());
            setRescheduleModalOpen(null);
        }
    };

    if (turns.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-700 py-10 text-center text-slate-400">
                No hay turnos agendados.
            </div>
        );
    }

    const sortedTurns = [...turns].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    return (
        <div className="w-full space-y-4">

            {/* In-App Notification Banner */}
            {activeNotification && (
                <div className="fixed top-4 left-4 right-4 z-[100] animate-bounce-in">
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-4 shadow-2xl border border-white/20 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">¡Recordatorio de Turno!</h3>
                                    <p className="text-white/90 text-sm">Es hora de avisarle a <span className="font-bold">{activeNotification.clientName}</span>.</p>
                                </div>
                            </div>
                            <button
                                onClick={handleDismissNotification}
                                aria-label="Cerrar recordatorio"
                                className="text-white/70 hover:text-white p-2 -m-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <button
                            onClick={() => openWhatsApp(activeNotification)}
                            className="w-full bg-white text-purple-600 font-bold py-3 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.77.46 3.43 1.256 4.89L2 22l5.256-1.256A9.956 9.956 0 0012.004 22c5.524 0 10.004-4.48 10.004-10.004C22.008 6.48 17.528 2 12.004 2zm5.352 14.288c-.22.616-1.268 1.132-1.74 1.16-.472.028-1.084.14-3.792-.932-3.32-1.312-5.46-4.72-5.624-4.94-.164-.22-1.344-1.788-1.344-3.412 0-1.624.848-2.42 1.152-2.752.304-.332.66-.416.88-.416.22 0 .44.004.632.008.2.004.472-.076.74.568.28.672.944 2.304 1.024 2.472.08.168.136.364.028.58-.108.216-.164.352-.324.536-.16.184-.336.412-.48.556-.16.16-.328.336-.14.656.188.32.836 1.364 1.792 2.216 1.224 1.092 2.256 1.436 2.576 1.572.32.136.508.112.7-.108.192-.22.824-.956 1.044-1.284.22-.328.44-.276.74-.164.3.112 1.904.896 2.232 1.06.328.164.548.244.628.38.08.136.08.792-.14 1.408z" />
                            </svg>
                            Abrir WhatsApp
                        </button>
                    </div>
                </div>
            )}

            {sortedTurns.map((turn) => {
                const date = new Date(turn.dateTime);
                const relative = getRelativeDateLabel(turn.dateTime);
                const isSoon = relative === 'Hoy' || relative === 'Mañana';

                return (
                    <article key={turn.id} className="rounded-2xl bg-[#1e1e32] border border-slate-600/40 ring-1 ring-white/[0.03] shadow-[0_12px_28px_rgba(0,0,0,0.45)]">
                        {/* Date strip */}
                        <div className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-t-2xl border-b border-purple-400/20 bg-gradient-to-r from-purple-700/50 via-purple-600/25 to-indigo-600/10 shadow-[inset_0_-1px_0_rgba(0,0,0,0.25)]">
                            <div className="flex items-center gap-2 min-w-0">
                                {isSoon && (
                                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-white/15 text-xs font-bold text-white">{relative}</span>
                                )}
                                <span className="text-[17px] font-bold text-white truncate [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
                                    {date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, c => c.toUpperCase())}
                                </span>
                            </div>
                            <span className="shrink-0 text-[28px] leading-none font-extrabold text-white tabular-nums [text-shadow:0_2px_6px_rgba(0,0,0,0.6)]">
                                {date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </span>
                        </div>

                        {/* Info */}
                        <div className="px-4 pt-3 pb-4">
                            <h3 className="text-lg font-bold text-white leading-snug break-words">{turn.clientName}</h3>
                            <div className="mt-1 flex items-end justify-between gap-3">
                                <p className="text-sm text-slate-300 break-words">
                                    {turn.task ? turn.task.split('+').map(t => t.trim()).join(' · ') : 'Sin detalle'}
                                </p>
                                <p className="shrink-0 text-lg font-bold text-white tabular-nums">
                                    {turn.estimatedPrice ? formatPrice(turn.estimatedPrice) : '—'}
                                </p>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="grid grid-cols-2 gap-2 px-4">
                            {turn.completed ? (
                                <>
                                    <button
                                        onClick={() => onStatusChange(turn.id, false)}
                                        className="h-11 rounded-xl border border-slate-700 text-sm font-semibold text-slate-200 active:scale-[0.97] active:bg-slate-800 transition"
                                    >
                                        Deshacer
                                    </button>
                                    <button
                                        onClick={() => onPaidChange && onPaidChange(turn.id, true)}
                                        className="h-11 rounded-xl bg-purple-600 text-sm font-semibold text-white active:scale-[0.97] active:bg-purple-700 transition"
                                    >
                                        Cobrar
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => onStatusChange(turn.id, false)}
                                        aria-pressed={turn.completed === false}
                                        className={`h-11 rounded-xl border text-sm font-semibold active:scale-[0.97] transition ${turn.completed === false ? 'bg-rose-500/10 border-rose-500/40 text-rose-300' : 'border-slate-700 text-slate-200 active:bg-slate-800'}`}
                                    >
                                        No vino
                                    </button>
                                    <button
                                        onClick={() => onStatusChange(turn.id, true)}
                                        className="h-11 rounded-xl bg-emerald-600/90 text-sm font-semibold text-white active:scale-[0.97] active:bg-emerald-700 transition"
                                    >
                                        Listo
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Secondary actions: small visuals, full-height (44px) hit areas */}
                        <div className="mt-3 grid grid-cols-[1fr_1fr_1fr_48px] border-t border-slate-700/60 divide-x divide-slate-700/60">
                            <CardAction label="WhatsApp" onClick={() => openWhatsApp(turn)} ariaLabel={`Enviar WhatsApp a ${turn.clientName}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]" aria-hidden="true"><path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.77.46 3.43 1.256 4.89L2 22l5.256-1.256A9.956 9.956 0 0012.004 22c5.524 0 10.004-4.48 10.004-10.004C22.008 6.48 17.528 2 12.004 2zm5.352 14.288c-.22.616-1.268 1.132-1.74 1.16-.472.028-1.084.14-3.792-.932-3.32-1.312-5.46-4.72-5.624-4.94-.164-.22-1.344-1.788-1.344-3.412 0-1.624.848-2.420 1.152-2.752.304-.332.66-.416.88-.416.22 0 .44.004.632.008.2.004.472-.076.74.568.28.672.944 2.304 1.024 2.472.08.168.136.364.028.58-.108.216-.164.352-.324.536-.16.184-.336.412-.48.556-.16.16-.328.336-.14.656.188.32.836 1.364 1.792 2.216 1.224 1.092 2.256 1.436 2.576 1.572.32.136.508.112.7-.108.192-.22.824-.956 1.044-1.284.22-.328.44-.276.74-.164.3.112 1.904.896 2.232 1.060.328.164.548.244.628.38.08.136.08.792-.14 1.408z" /></svg>
                            </CardAction>
                            {onReschedule && (
                                <CardAction label="Reagendar" onClick={() => openRescheduleModal(turn)} ariaLabel="Reagendar turno">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-[18px] h-[18px]" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                                </CardAction>
                            )}
                            {onEditTurn && (
                                <CardAction label="Editar" onClick={() => onEditTurn(turn)} ariaLabel={`Editar turno de ${turn.clientName}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-[18px] h-[18px]" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                                </CardAction>
                            )}
                            <button
                                onClick={() => setTurnToDelete(turn)}
                                aria-label={`Eliminar turno de ${turn.clientName}`}
                                className="h-11 flex items-center justify-center rounded-br-2xl text-rose-400 active:bg-rose-500/15 active:text-rose-300 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-[18px] h-[18px]" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                            </button>
                        </div>
                    </article>
                );
            })}

            <ConfirmDialog
                open={!!turnToDelete}
                title="¿Eliminar turno?"
                message={turnToDelete ? `Se borrará el turno de ${turnToDelete.clientName}. No se puede deshacer.` : undefined}
                confirmLabel="Eliminar"
                onCancel={() => setTurnToDelete(null)}
                onConfirm={() => {
                    if (turnToDelete) onDelete(turnToDelete.id);
                    setTurnToDelete(null);
                }}
            />

            {/* Reagendar */}
            <Sheet open={!!rescheduleModalOpen} title="Reagendar turno" onClose={() => setRescheduleModalOpen(null)}>
                <div className="grid grid-cols-[1.4fr_1fr] gap-3">
                    <div>
                        <label htmlFor="reschedule-date" className="block text-sm font-semibold text-slate-300 mb-1.5">Fecha</label>
                        <input id="reschedule-date" type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="input-field !mb-0" />
                    </div>
                    <div>
                        <label htmlFor="reschedule-time" className="block text-sm font-semibold text-slate-300 mb-1.5">Hora</label>
                        <input id="reschedule-time" type="time" step={300} value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} className="input-field !mb-0" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-6">
                    <button onClick={() => setRescheduleModalOpen(null)} className="h-12 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 font-semibold active:bg-slate-700">Cancelar</button>
                    <button onClick={saveReschedule} disabled={!rescheduleDate || !rescheduleTime} className="h-12 rounded-xl bg-purple-600 text-white font-semibold active:bg-purple-700 disabled:opacity-40">Guardar</button>
                </div>
            </Sheet>
        </div>
    );
}

const CardAction = ({ label, ariaLabel, onClick, children }: {
    label: string, ariaLabel: string, onClick: () => void, children: React.ReactNode
}) => (
    <button
        onClick={onClick}
        aria-label={ariaLabel}
        className="h-11 px-1 flex items-center justify-center gap-1.5 text-[13px] font-medium text-slate-200 whitespace-nowrap active:bg-slate-800/80 active:text-white transition-colors first:rounded-bl-2xl"
    >
        {children}
        {label}
    </button>
);
