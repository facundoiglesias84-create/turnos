"use client";

import React, { useState, useEffect } from 'react';
import * as store from '@/lib/data';
import TurnList, { Turn } from '@/components/TurnList';
import TurnForm from '@/components/TurnForm';
import Link from 'next/link';

export default function TurnosPage() {
    const [turns, setTurns] = useState<Turn[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editingTurn, setEditingTurn] = useState<any>(null); // TurnData shape
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        loadTurns();
    }, []);

    const loadTurns = async () => {
        const mappedTurns: Turn[] = (await store.getAll('turns'))
            .map((t: any) => ({
                id: t.id,
                clientName: t.client_name,
                dateTime: t.date_time,
                task: t.task,
                completed: t.completed,
                estimatedPrice: t.estimated_price,
                deposit: t.deposit,
                paid: t.paid,
                reminderTime: t.reminder_time,
                reminderSent: t.reminder_sent
            }));
        setTurns(mappedTurns);
        setLoading(false);
    };

    const updateTurn = async (id: string, changes: Record<string, any>) => {
        await store.update('turns', id, changes);
        loadTurns();
    };

    const handleAddTurn = async (turnData: any) => {
        await store.insert('turns', {
            client_name: turnData.clientName,
            date_time: turnData.dateTime,
            task: turnData.task,
            estimated_price: turnData.estimatedPrice,
            completed: null,
            paid: false
        });
        loadTurns();
    };

    const handleDeleteTurn = async (id: string) => {
        await store.remove('turns', id);
        loadTurns();
    };

    const handleStatusChange = (id: string, status: boolean) => updateTurn(id, { completed: status });

    // New Edit Logic
    const handleEditTurn = (turn: Turn) => {
        setIsEditing(true);
        setEditingId(turn.id);
        setEditingTurn({
            clientName: turn.clientName,
            dateTime: turn.dateTime,
            task: turn.task || '',
            estimatedPrice: turn.estimatedPrice || 0
        });
        // Scroll to top or form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleUpdateTurn = (turnData: any) => {
        if (!editingId) return;

        updateTurn(editingId, {
            client_name: turnData.clientName,
            date_time: turnData.dateTime,
            task: turnData.task,
            estimated_price: turnData.estimatedPrice
        });
        setIsEditing(false);
        setEditingId(null);
        setEditingTurn(null);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditingId(null);
        setEditingTurn(null);
    };

    return (
        <div className="p-4 container mx-auto max-w-7xl space-y-6 pb-24">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-white">Gestión de Turnos</h1>
                <Link href="/" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-purple-400 font-bold rounded-lg transition-colors border border-purple-500/30">
                    ← Volver a Precios
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-4 lg:sticky lg:top-4">
                    <div className="glass-card p-1">
                        <TurnForm
                            onAddTurn={handleAddTurn}
                            onUpdateTurn={handleUpdateTurn}
                            initialData={editingTurn}
                            isEditing={isEditing}
                            onCancel={handleCancelEdit}
                        />
                    </div>
                </div>

                <div className="lg:col-span-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 glass-card">
                            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-400 text-lg">Cargando turnos...</p>
                        </div>
                    ) : (
                        <TurnList
                            turns={turns}
                            onDelete={handleDeleteTurn}
                            onStatusChange={handleStatusChange}
                            onEditTurn={handleEditTurn}
                            onPaidChange={(id, paid) => updateTurn(id, { paid })}
                            onUpdatePrice={(id, price) => updateTurn(id, { estimated_price: price })}
                            onUpdateDeposit={(id, deposit) => updateTurn(id, { deposit })}
                            onSetReminder={(id, date) => updateTurn(id, { reminder_time: date })}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
