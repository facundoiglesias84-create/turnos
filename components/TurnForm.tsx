"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getAll } from '@/lib/data';
import DateTimePicker, { isCompleteDateTime } from './DateTimePicker';
import SelectMenu from './SelectMenu';

// ISO timestamp -> local "YYYY-MM-DDTHH:mm"
const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface TurnData {
    clientName: string;
    dateTime: string;
    task: string;
    estimatedPrice: number;
}

interface TurnFormProps {
    onAddTurn: (turn: TurnData) => void;
    onUpdateTurn?: (turn: TurnData) => void;
    initialData?: TurnData | null;
    isEditing?: boolean;
    onCancel?: () => void;
    embedded?: boolean; // rendered inside a sheet: no card chrome or title
}

interface ServiceItem {
    name: string;
    price: number;
}

export default function TurnForm({ onAddTurn, onUpdateTurn, initialData, isEditing, onCancel, embedded }: TurnFormProps) {
    const [clientName, setClientName] = useState('');
    const [dateTime, setDateTime] = useState('');
    const [dateTimeError, setDateTimeError] = useState('');
    const [busyTimes, setBusyTimes] = useState<string[]>([]);

    // Multi-task state
    const [selectedTasks, setSelectedTasks] = useState<ServiceItem[]>([]);
    const [customTaskName, setCustomTaskName] = useState('');
    const [isAddingCustom, setIsAddingCustom] = useState(false);

    const [estimatedPrice, setEstimatedPrice] = useState<string>('');
    const [services, setServices] = useState<{ service_name: string; price: number }[]>([]);
    // When loading a turn for editing, keep its saved price instead of recomputing it from the tasks
    const keepPriceRef = useRef(false);

    useEffect(() => {
        getAll('turns').then(rows => setBusyTimes(
            rows
                .filter(t => !t.paid && t.date_time !== initialData?.dateTime)
                .map(t => toLocalInput(t.date_time))
        ));
    }, [initialData]);

    useEffect(() => {
        getAll('prices').then(rows => setServices(
            rows.map(p => ({ service_name: p.service_name, price: p.price }))
        ));
    }, []);

    // Update total price when tasks change
    useEffect(() => {
        if (keepPriceRef.current) {
            keepPriceRef.current = false;
            return;
        }
        const total = selectedTasks.reduce((sum, item) => sum + item.price, 0);
        if (total > 0) {
            setEstimatedPrice(total.toString());
        } else if (selectedTasks.length === 0) {
            setEstimatedPrice('');
        }
    }, [selectedTasks]);

    // Populate form if editing
    useEffect(() => {
        if (isEditing && initialData) {
            setClientName(initialData.clientName);
            setDateTime(toLocalInput(initialData.dateTime));
            setEstimatedPrice(initialData.estimatedPrice ? initialData.estimatedPrice.toString() : '');
            keepPriceRef.current = true;
            setSelectedTasks(
                (initialData.task || '').split('+').map(t => t.trim()).filter(Boolean).map(name => ({
                    name,
                    price: services.find(s => s.service_name === name)?.price ?? 0,
                }))
            );
            setCustomTaskName('');
            setIsAddingCustom(false);
        }
    }, [isEditing, initialData, services]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isCompleteDateTime(dateTime)) {
            setDateTimeError(dateTime.split('T')[0] ? 'Elegí la hora del turno.' : 'Elegí la fecha y la hora del turno.');
            return;
        }
        if (!clientName || !estimatedPrice) return;

        // Create a Date object from the local input string
        const localDate = new Date(dateTime);

        // Combine task names
        const combinedTask = selectedTasks.length > 0
            ? selectedTasks.map(t => t.name).join(' + ')
            : customTaskName; // Fallback if they only typed in custom input without adding

        const turnData = {
            clientName,
            dateTime: localDate.toISOString(),
            task: combinedTask,
            estimatedPrice: parseFloat(estimatedPrice.replace(',', '.')) || 0
        };

        if (isEditing && onUpdateTurn) {
            onUpdateTurn(turnData);
        } else {
            onAddTurn(turnData);
        }

        // Reset form
        setClientName('');
        setDateTime('');
        setDateTimeError('');
        setSelectedTasks([]);
        setCustomTaskName('');
        setEstimatedPrice('');
        setIsAddingCustom(false);
    };

    const addTask = (task: ServiceItem) => {
        setSelectedTasks([...selectedTasks, task]);
    };

    const removeTask = (index: number) => {
        const newTasks = [...selectedTasks];
        newTasks.splice(index, 1);
        setSelectedTasks(newTasks);
    };

    const addCustomTask = () => {
        if (customTaskName.trim()) {
            addTask({ name: customTaskName.trim(), price: 0 }); // Price 0 for custom, user sets total manually
            setCustomTaskName('');
            setIsAddingCustom(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={embedded ? 'w-full' : 'glass-card p-6 mb-8 w-full max-w-md mx-auto'}>
            {!embedded && <h2 className="text-2xl font-bold mb-6 text-center text-white">{isEditing ? 'Editar Turno' : 'Nuevo Turno'}</h2>}

            <div className="mb-5">
                <label htmlFor="client" className="block text-base font-semibold text-slate-200 mb-2">Cliente *</label>
                <input
                    id="client"
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                    className="input-field text-lg font-medium"
                    placeholder="Nombre del cliente"
                />
            </div>

            <DateTimePicker
                value={dateTime}
                onChange={(v) => { setDateTime(v); setDateTimeError(''); }}
                busyTimes={busyTimes}
                error={dateTimeError}
            />

            <div className="mb-5">
                <label className="block text-base font-semibold text-slate-200 mb-2">Tareas</label>

                {/* Selected Tasks List */}
                <div className="flex flex-wrap gap-2 mb-3">
                    {selectedTasks.map((task, index) => (
                        <div key={index} className="bg-purple-900/50 border border-purple-500/50 text-purple-100 px-3 py-1 rounded-full flex items-center gap-2">
                            <span className="font-medium">{task.name}</span>
                            <button
                                type="button"
                                onClick={() => removeTask(index)}
                                className="text-purple-300 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>

                {/* Task Selector */}
                {!isAddingCustom ? (
                    <SelectMenu
                        label="Agregar servicio"
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-6 h-6 text-purple-400" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                        items={[
                            ...services.map(service => ({
                                key: service.service_name,
                                label: service.service_name,
                                detail: `$${service.price.toLocaleString('es-AR')}`,
                                onSelect: () => addTask({ name: service.service_name, price: service.price }),
                            })),
                            { key: 'custom', label: '+ Otra tarea...', accent: true, onSelect: () => setIsAddingCustom(true) },
                        ]}
                    />
                ) : (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={customTaskName}
                            onChange={(e) => setCustomTaskName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addCustomTask();
                                }
                            }}
                            className="input-field !mb-0 flex-1 min-w-0 text-lg font-medium"
                            placeholder="Escribir tarea..."
                            aria-label="Nombre de la tarea"
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={addCustomTask}
                            disabled={!customTaskName.trim()}
                            aria-label="Agregar tarea"
                            className="btn-primary !p-0 w-12 shrink-0 flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsAddingCustom(false); setCustomTaskName(''); }}
                            aria-label="Cancelar"
                            className="w-12 shrink-0 flex items-center justify-center rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            <div className="mb-8">
                <label htmlFor="price" className="block text-base font-semibold text-slate-200 mb-2">Precio Total Estimado *</label>
                <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400" aria-hidden="true">$</span>
                    <input
                        id="price"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={estimatedPrice}
                        onChange={(e) => setEstimatedPrice(e.target.value.replace(/[^\d.,]/g, ''))}
                        required
                        className="input-field !mb-0 !pl-9 text-xl font-bold text-green-400 tabular-nums"
                        placeholder="0"
                    />
                </div>
            </div>

            <div className="flex gap-2">
                {isEditing && onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 h-12 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 font-semibold active:bg-slate-700 transition-colors"
                    >
                        Cancelar
                    </button>
                )}
                <button type="submit" className={isEditing
                    ? 'flex-1 h-12 rounded-xl bg-purple-600 text-white font-semibold active:bg-purple-700 transition-colors'
                    : 'flex-1 h-12 btn-primary flex justify-center items-center gap-2 text-lg font-bold'}>
                    {isEditing ? 'Guardar' : (
                        <>
                            Agendar Turno
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
