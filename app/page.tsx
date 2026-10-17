"use client";

import React, { useState, useEffect, useRef } from 'react';
import * as store from '@/lib/data';
import TurnList, { Turn } from '@/components/TurnList';
import TurnForm from '@/components/TurnForm';
import Sheet from '@/components/Sheet';
import ConfirmDialog from '@/components/ConfirmDialog';

// Interfaces
interface Price {
    id: string;
    service_name: string;
    price: number;
}

interface Expense {
    id: string;
    description: string;
    amount: number;
    created_at?: string;
}

type ViewState = 'next_turns' | 'new_turn' | 'prices' | 'stats';

export default function MainPage() {
    // Global State
    const [currentView, setCurrentView] = useState<ViewState>('next_turns');
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [businessName, setBusinessName] = useState('');

    // Data State
    const [turns, setTurns] = useState<Turn[]>([]);
    const [prices, setPrices] = useState<Price[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);

    // Edit State
    const [isEditingTurn, setIsEditingTurn] = useState(false);
    const [editingTurnData, setEditingTurnData] = useState<any>(null);
    const [editingTurnId, setEditingTurnId] = useState<string | null>(null);

    // Business Name Edit State
    const [businessNameModalOpen, setBusinessNameModalOpen] = useState(false);
    const [tempBusinessName, setTempBusinessName] = useState('');

    // Initial Load
    useEffect(() => {
        store.getBusinessName().then(setBusinessName);
        loadTurns();
        loadPrices();
        loadExpenses();
    }, []);

    // History: each view change is a history entry so the browser back button works
    useEffect(() => {
        window.history.replaceState({ view: 'next_turns' }, '');

        const onPopState = (e: PopStateEvent) => {
            setCurrentView(e.state?.view ?? 'next_turns');
            setIsEditingTurn(false);
            setEditingTurnData(null);
            setEditingTurnId(null);
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    // Close the view menu on outside click / Escape
    useEffect(() => {
        if (!menuOpen) return;
        const onPointerDown = (e: PointerEvent) => {
            if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMenuOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [menuOpen]);

    const navigate = (view: ViewState, { replace = false } = {}) => {
        if (view === currentView && !replace) return;
        if (replace) window.history.replaceState({ view }, '');
        else window.history.pushState({ view }, '');
        setCurrentView(view);
        window.scrollTo({ top: 0 });
    };

    // Data Fetching
    const loadTurns = async () => {
        const rows = await store.getAll('turns');
        setTurns(rows.map((t: any) => ({
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
        })));
    };

    const loadPrices = async () => setPrices(await store.getAll<Price>('prices'));
    const loadExpenses = async () => setExpenses(await store.getAll<Expense>('expenses'));

    // Runs a write against the DB; on failure tells the user instead of failing silently
    const save = async (action: () => Promise<unknown>) => {
        try {
            await action();
            return true;
        } catch (error) {
            console.error(error);
            alert('No se pudo guardar. Revisá la conexión e intentá de nuevo.');
            return false;
        }
    };

    // --- Handlers ---

    // Business Name Handler
    const handleUpdateBusinessName = async () => {
        const name = tempBusinessName.trim();
        if (!name) return;
        if (!await save(() => store.setBusinessName(name))) return;
        setBusinessName(name);
        setBusinessNameModalOpen(false);
    };

    const openBusinessNameModal = () => {
        setTempBusinessName(businessName);
        setBusinessNameModalOpen(true);
    };

    const handleNavigation = (view: ViewState) => {
        navigate(view);
        setMenuOpen(false);
        if (view !== 'new_turn') {
            setIsEditingTurn(false);
            setEditingTurnData(null);
            setEditingTurnId(null);
        }
    };

    const handleAddTurn = async (turnData: any) => {
        const ok = await save(() => store.insert('turns', {
            client_name: turnData.clientName,
            date_time: turnData.dateTime,
            task: turnData.task,
            estimated_price: turnData.estimatedPrice,
            completed: null,
            paid: false
        }));
        if (!ok) return;
        await loadTurns();
        navigate('next_turns', { replace: true });
    };

    const handleUpdateTurn = async (turnData: any) => {
        if (!editingTurnId) return;

        const ok = await save(() => store.update('turns', editingTurnId, {
            client_name: turnData.clientName,
            date_time: turnData.dateTime,
            task: turnData.task,
            estimated_price: turnData.estimatedPrice
        }));
        if (!ok) return;
        await loadTurns();
        setIsEditingTurn(false);
        setEditingTurnId(null);
        setEditingTurnData(null);
        navigate('next_turns', { replace: true });
    };

    const updateTurn = async (id: string, changes: Record<string, any>) => {
        await save(() => store.update('turns', id, changes));
        await loadTurns();
    };

    const deleteTurn = async (id: string) => {
        await save(() => store.remove('turns', id));
        await loadTurns();
    };

    const handleStatusChange = (id: string, status: boolean) => updateTurn(id, { completed: status });
    const handlePaidChange = (id: string, paid: boolean) => updateTurn(id, { paid });
    const handleUpdatePrice = (id: string, price: number) => updateTurn(id, { estimated_price: price });
    const handleUpdateDeposit = (id: string, deposit: number) => updateTurn(id, { deposit });
    const handleSetReminder = (id: string, date: string | null) => updateTurn(id, { reminder_time: date });
    const handleReschedule = (id: string, date: string) => updateTurn(id, { date_time: date });
    const handleUpdateTurnData = (id: string, updates: { task: string, price: number }) =>
        updateTurn(id, { task: updates.task, estimated_price: updates.price });

    // Edit sheet (opened from a turn card)
    const [sheetTurn, setSheetTurn] = useState<Turn | null>(null);
    const [sheetData, setSheetData] = useState<any>(null);

    const handleEditTurnClick = (turn: Turn) => {
        setSheetTurn(turn);
        setSheetData({
            clientName: turn.clientName,
            dateTime: turn.dateTime,
            task: turn.task || '',
            estimatedPrice: turn.estimatedPrice || 0
        });
    };

    const closeSheet = () => setSheetTurn(null);

    const handleSheetSave = async (turnData: any) => {
        if (!sheetTurn) return;
        const ok = await save(() => store.update('turns', sheetTurn.id, {
            client_name: turnData.clientName,
            date_time: turnData.dateTime,
            task: turnData.task,
            estimated_price: turnData.estimatedPrice
        }));
        if (!ok) return;
        await loadTurns();
        closeSheet();
    };

    const handleAddExpense = async (description: string, amount: number) => {
        await save(() => store.insert('expenses', { description, amount }));
        await loadExpenses();
    };

    const handleDeleteExpense = async (id: string) => {
        await save(() => store.remove('expenses', id));
        await loadExpenses();
    };

    const handleUpdateExpense = async (id: string, description: string, amount: number) => {
        await save(() => store.update('expenses', id, { description, amount }));
        await loadExpenses();
    };

    // --- Render ---

    return (
        <div className="min-h-screen bg-[#0f1020] px-4 pt-4 pb-12 text-white font-sans max-w-md mx-auto relative selection:bg-purple-500/30">
            {/* Header */}
            <header className="flex flex-col items-center justify-center pt-4 pb-6">
                <h1>
                    <button
                        onClick={openBusinessNameModal}
                        aria-label="Editar nombre del negocio"
                        className="text-3xl font-extrabold tracking-tight mb-1 cursor-pointer active:scale-95 transition-transform flex items-center justify-center gap-2 group"
                    >
                        <span className="bg-gradient-to-r from-white via-purple-100 to-purple-200 text-transparent bg-clip-text drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                            {businessName || 'Mi Negocio'}
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-purple-400/60 group-hover:text-purple-400 transition-colors" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                        </svg>
                    </button>
                </h1>
                <div className="h-1 w-24 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent mx-auto rounded-full"></div>
            </header>

            {/* View Dropdown */}
            <div ref={menuRef} className="relative w-full mb-8 z-50">
                <button
                    onClick={() => setMenuOpen(o => !o)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-xl bg-[#181828] border border-slate-700/50 text-white text-base font-semibold shadow-[0_10px_25px_rgba(0,0,0,0.35)] cursor-pointer transition-[transform,background-color] duration-200 hover:bg-[#1f1f33] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                >
                    <span className="flex items-center gap-3">
                        <NavIcon d={VIEWS[currentView].icon} className="w-6 h-6 text-purple-400" />
                        {currentView === 'new_turn' && isEditingTurn ? 'Editar Turno' : VIEWS[currentView].label}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                </button>

                <div
                    role="menu"
                    className={`absolute top-full left-0 right-0 mt-2 p-1.5 rounded-xl bg-[#181828] border border-slate-700/50 shadow-[0_10px_25px_rgba(0,0,0,0.45)] origin-top transition-[opacity,transform] duration-200 ease-out ${menuOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-95 pointer-events-none'}`}
                >
                    {(Object.keys(VIEWS) as ViewState[]).map(view => (
                        <button
                            key={view}
                            role="menuitem"
                            tabIndex={menuOpen ? 0 : -1}
                            onClick={() => handleNavigation(view)}
                            aria-current={currentView === view ? 'page' : undefined}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-base transition-colors ${currentView === view ? 'bg-purple-900/30 text-purple-300 font-semibold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                        >
                            <NavIcon d={VIEWS[view].icon} className="w-5 h-5" />
                            {VIEWS[view].label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="animate-fade-in">




                {currentView === 'next_turns' && (
                    <TurnList
                        turns={turns.filter(t => !t.paid)}
                        prices={prices} // Pass prices list
                        onDelete={deleteTurn}
                        onStatusChange={handleStatusChange}
                        onEditTurn={handleEditTurnClick}
                        onReschedule={handleReschedule}
                        onPaidChange={handlePaidChange}
                        onUpdatePrice={handleUpdatePrice}
                        onUpdateDeposit={handleUpdateDeposit}
                        onSetReminder={handleSetReminder}
                        onUpdateTurnData={handleUpdateTurnData}
                    />
                )}

                {currentView === 'new_turn' && (
                    <div className="space-y-4">
                        <TurnForm
                            onAddTurn={handleAddTurn}
                            onUpdateTurn={handleUpdateTurn}
                            initialData={editingTurnData}
                            isEditing={isEditingTurn}
                            onCancel={() => handleNavigation('next_turns')}
                        />
                    </div>
                )}

                {currentView === 'prices' && (
                    <PricesView prices={prices} onReload={loadPrices} />
                )}

                {currentView === 'stats' && (
                    <StatsView
                        turns={turns}
                        expenses={expenses}
                        onAddExpense={handleAddExpense}
                        onDeleteExpense={handleDeleteExpense}
                        onUpdateExpense={handleUpdateExpense}
                        onPaidChange={handlePaidChange}
                        onDeleteTurn={deleteTurn}
                    />
                )}
            </div>

            {/* Edit Turn Sheet */}
            <Sheet open={!!sheetTurn} title="Editar turno" onClose={closeSheet}>
                {sheetTurn && (
                    <>
                        <TurnForm
                            key={sheetTurn.id}
                            embedded
                            isEditing
                            initialData={sheetData}
                            onAddTurn={() => {}}
                            onUpdateTurn={handleSheetSave}
                            onCancel={closeSheet}
                        />
                    </>
                )}
            </Sheet>

            {/* Business Name Edit Modal */}
            {businessNameModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-sm border border-slate-700 shadow-2xl">
                        <h3 className="text-xl font-bold mb-4 text-white">Nombre del Negocio</h3>
                        <p className="text-slate-400 mb-4 text-sm">Edita el nombre que se muestra en tu perfil.</p>
                        <input
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none mb-6"
                            placeholder="Nombre del emprendimiento"
                            value={tempBusinessName}
                            onChange={e => setTempBusinessName(e.target.value)}
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button onClick={() => setBusinessNameModalOpen(false)} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white transition-colors">Cancelar</button>
                            <button onClick={handleUpdateBusinessName} className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-white transition-colors">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper Components

const VIEWS: Record<ViewState, { label: string, icon: string }> = {
    next_turns: { label: 'Próximos Turnos', icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5' },
    new_turn: { label: 'Agendar Turno', icon: 'M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z' },
    prices: { label: 'Lista de Precios', icon: 'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z M6 6h.008v.008H6V6z' },
    stats: { label: 'Ganancias y Gastos', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' },
};

const NavIcon = ({ d, className }: { d: string, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className={className} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
);

const PricesView = ({ prices, onReload }: { prices: Price[], onReload: () => void }) => {
    // Add / edit sheet: editing === null → closed, 'new' → adding, Price → editing that service
    const [editing, setEditing] = useState<Price | 'new' | null>(null);
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [saving, setSaving] = useState(false);
    const [priceToDelete, setPriceToDelete] = useState<Price | null>(null);

    const openNew = () => {
        setName('');
        setAmount('');
        setEditing('new');
    };

    const openEdit = (price: Price) => {
        setName(price.service_name);
        setAmount(price.price.toString());
        setEditing(price);
    };

    const closeSheet = () => setEditing(null);

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    const canSave = name.trim() !== '' && !isNaN(parsedAmount);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSave || !editing) return;
        setSaving(true);
        try {
            const data = { service_name: name.trim(), price: parsedAmount };
            if (editing === 'new') await store.insert('prices', data);
            else await store.update('prices', editing.id, data);
            onReload();
            closeSheet();
        } catch (error) {
            console.error(error);
            alert('No se pudo guardar el servicio.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        await store.remove('prices', id);
        onReload();
    };

    return (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Lista de Precios</h2>
                <button
                    onClick={openNew}
                    className="flex items-center gap-1.5 h-11 px-4 rounded-xl bg-purple-500/20 backdrop-blur-md border border-purple-300/30 text-purple-50 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_20px_rgba(88,28,135,0.35)] active:scale-[0.97] active:bg-purple-500/30 transition"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Agregar
                </button>
            </div>

            <div className="space-y-2">
                {prices.map(p => (
                    <div key={p.id} className="rounded-xl bg-[#1e1e32] border border-slate-600/40 shadow-[0_8px_20px_rgba(0,0,0,0.3)] pl-4 pr-2 py-2.5 flex justify-between items-center gap-3">
                        <span className="font-medium text-lg text-slate-100 truncate">{p.service_name}</span>
                        <div className="flex items-center gap-3 shrink-0">
                            <span className="text-emerald-400 font-bold text-lg tabular-nums">${p.price.toLocaleString('es-AR')}</span>
                            <div className="flex items-center rounded-xl bg-white/[0.06] backdrop-blur-md border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_12px_rgba(0,0,0,0.25)] divide-x divide-white/10 overflow-hidden">
                                <button onClick={() => openEdit(p)} aria-label={`Editar ${p.service_name}`} className="w-12 h-12 flex items-center justify-center text-slate-200 active:bg-white/10 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="w-6 h-6" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                    </svg>
                                </button>
                                <button onClick={() => setPriceToDelete(p)} aria-label={`Eliminar ${p.service_name}`} className="w-12 h-12 flex items-center justify-center text-rose-400 active:bg-rose-500/15 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="w-6 h-6" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {prices.length === 0 && <div className="p-8 text-center text-slate-400 rounded-xl border border-dashed border-slate-700">No hay servicios guardados.</div>}
            </div>

            {/* Add / edit sheet */}
            <Sheet open={editing !== null} title={editing === 'new' ? 'Nuevo servicio' : 'Editar servicio'} onClose={closeSheet}>
                <form onSubmit={handleSave}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="service-name" className="block text-base font-semibold text-slate-200 mb-2">Nombre</label>
                            <input
                                id="service-name"
                                className="input-field !mb-0 text-lg"
                                placeholder="Ej. Semipermanente"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label htmlFor="service-price" className="block text-base font-semibold text-slate-200 mb-2">Precio</label>
                            <div className="relative">
                                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400" aria-hidden="true">$</span>
                                <input
                                    id="service-price"
                                    type="text"
                                    inputMode="decimal"
                                    autoComplete="off"
                                    className="input-field !mb-0 !pl-9 text-lg font-bold text-emerald-400 tabular-nums"
                                    placeholder="0"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-6">
                        <button type="button" onClick={closeSheet} className="h-12 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 font-semibold active:bg-slate-700 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={!canSave || saving} className="h-12 rounded-xl bg-purple-600 text-white font-semibold active:bg-purple-700 disabled:opacity-40 transition-colors">
                            {saving ? 'Guardando…' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </Sheet>

            <ConfirmDialog
                open={!!priceToDelete}
                title="¿Eliminar servicio?"
                message={priceToDelete ? `Se borrará "${priceToDelete.service_name}" de la lista de precios.` : undefined}
                confirmLabel="Eliminar"
                onCancel={() => setPriceToDelete(null)}
                onConfirm={() => {
                    if (priceToDelete) handleDelete(priceToDelete.id);
                    setPriceToDelete(null);
                }}
            />
        </div>
    );
};

const formatMoney = (n: number) => `$${n.toLocaleString('es-AR')}`;

const DOTS_ICON = 'M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z';

const currentMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1);

const StatsView = ({
    turns,
    expenses,
    onAddExpense,
    onDeleteExpense,
    onUpdateExpense,
    onPaidChange,
    onDeleteTurn
}: {
    turns: Turn[],
    expenses: Expense[],
    onAddExpense: (desc: string, amount: number) => void,
    onDeleteExpense: (id: string) => void,
    onUpdateExpense: (id: string, desc: string, amount: number) => void,
    onPaidChange: (id: string, paid: boolean) => void,
    onDeleteTurn: (id: string) => void
}) => {
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<{ kind: 'expense' | 'turn', id: string, label: string } | null>(null);

    // Period filter: a given month, or null for all time
    const [month, setMonth] = useState<Date | null>(currentMonth);

    const inPeriod = (dateStr?: string) => {
        if (!month) return true;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
    };

    const shiftMonth = (delta: number) => {
        const base = month ?? currentMonth();
        setMonth(new Date(base.getFullYear(), base.getMonth() + delta, 1));
    };

    const periodLabel = month
        ? `${month.toLocaleDateString('es-AR', { month: 'long' }).replace(/^./, c => c.toUpperCase())} ${month.getFullYear()}`
        : 'Todo el historial';

    const paidTurns = turns
        .filter(t => t.paid && inPeriod(t.dateTime))
        .sort((a, b) => b.dateTime.localeCompare(a.dateTime));
    const periodExpenses = expenses.filter(e => inPeriod(e.created_at));

    const totalEarnings = paidTurns.reduce((sum, t) => sum + (t.estimatedPrice || 0), 0);
    const totalExpenses = periodExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const balance = totalEarnings - totalExpenses;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (desc && amount) {
            if (editingExpenseId) {
                onUpdateExpense(editingExpenseId, desc, parseFloat(amount));
            } else {
                onAddExpense(desc, parseFloat(amount));
            }
            closeModal();
        }
    };

    const closeModal = () => {
        setDesc('');
        setAmount('');
        setEditingExpenseId(null);
        setShowExpenseModal(false);
    };

    const handleEditClick = (expense: Expense) => {
        setDesc(expense.description);
        setAmount(expense.amount.toString());
        setEditingExpenseId(expense.id);
        setOpenMenuId(null);
        setShowExpenseModal(true);
    };

    const toggleMenu = (id: string) => setOpenMenuId(openMenuId === id ? null : id);

    return (
        <div className="space-y-8 animate-fade-in" onClick={() => setOpenMenuId(null)}>
            {/* Period selector */}
            <div className="flex items-center justify-between gap-2 bg-[#181828] border border-slate-700/50 rounded-xl p-1.5">
                <button onClick={() => shiftMonth(-1)} aria-label="Mes anterior" className="p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                    <NavIcon d="M15.75 19.5L8.25 12l7.5-7.5" className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-base font-semibold text-white">{periodLabel}</span>
                    <button
                        onClick={() => setMonth(month ? null : currentMonth())}
                        className="text-xs text-purple-400 hover:text-purple-300 font-medium py-0.5"
                    >
                        {month ? 'Ver todo' : 'Ver mes actual'}
                    </button>
                </div>
                <button onClick={() => shiftMonth(1)} aria-label="Mes siguiente" className="p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                    <NavIcon d="M8.25 4.5l7.5 7.5-7.5 7.5" className="w-5 h-5" />
                </button>
            </div>

            {/* Summary */}
            <section aria-label="Resumen" className="rounded-2xl bg-gradient-to-br from-[#241a3d] to-[#181828] border border-purple-500/20 p-5 shadow-[0_10px_25px_rgba(0,0,0,0.35)]">
                <p className="text-sm font-medium text-slate-400">Caja</p>
                <p className={`text-4xl font-extrabold tracking-tight mt-1 ${balance >= 0 ? 'text-white' : 'text-orange-400'}`}>
                    {balance < 0 && '-'}{formatMoney(Math.abs(balance))}
                </p>
                <div className="grid grid-cols-2 gap-3 mt-5">
                    <div className="rounded-xl bg-black/20 p-3">
                        <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true"></span>Ingresos
                        </p>
                        <p className="text-lg font-bold text-emerald-400 mt-0.5">{formatMoney(totalEarnings)}</p>
                    </div>
                    <div className="rounded-xl bg-black/20 p-3">
                        <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-rose-400" aria-hidden="true"></span>Gastos
                        </p>
                        <p className="text-lg font-bold text-rose-400 mt-0.5">{formatMoney(totalExpenses)}</p>
                    </div>
                </div>
            </section>

            {/* Expenses */}
            <section>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold text-white">Gastos</h3>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowExpenseModal(true); }}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 text-sm font-semibold transition-colors active:scale-95"
                    >
                        <NavIcon d="M12 4.5v15m7.5-7.5h-15" className="w-4 h-4" />
                        Agregar
                    </button>
                </div>
                {periodExpenses.length > 0 ? (
                    <ul className="rounded-xl bg-[#181828] border border-slate-700/50 divide-y divide-slate-700/50">
                        {periodExpenses.map(e => (
                            <li key={e.id} className="relative flex justify-between items-center gap-3 pl-4 pr-2 py-3">
                                <div className="min-w-0">
                                    <p className="font-semibold text-white truncate">{e.description}</p>
                                    <p className="text-xs text-slate-400">{new Date(e.created_at || Date.now()).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-rose-400 font-bold">-{formatMoney(Number(e.amount))}</span>
                                    <button
                                        onClick={(event) => { event.stopPropagation(); toggleMenu(e.id); }}
                                        aria-label={`Opciones de ${e.description}`}
                                        aria-expanded={openMenuId === e.id}
                                        className="p-2.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-700 transition-colors"
                                    >
                                        <NavIcon d={DOTS_ICON} className="w-5 h-5" />
                                    </button>
                                </div>
                                {openMenuId === e.id && (
                                    <div className="absolute right-2 top-12 bg-slate-800 border border-slate-700 shadow-xl rounded-xl overflow-hidden z-10 w-36 animate-fade-in-down">
                                        <button onClick={(event) => { event.stopPropagation(); handleEditClick(e); }} className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-slate-700">Editar</button>
                                        <button onClick={(event) => { event.stopPropagation(); setPendingDelete({ kind: 'expense', id: e.id, label: e.description }); setOpenMenuId(null); }} className="w-full text-left px-4 py-3 text-sm text-rose-400 hover:bg-slate-700 border-t border-slate-700/50">Eliminar</button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <EmptyState text={month ? 'No hay gastos este mes.' : 'No hay gastos registrados.'} />
                )}
            </section>

            {/* Income: paid turns */}
            <section>
                <h3 className="text-lg font-bold text-white mb-3">Ingresos</h3>
                {paidTurns.length > 0 ? (
                    <ul className="rounded-xl bg-[#181828] border border-slate-700/50 divide-y divide-slate-700/50">
                        {paidTurns.map(t => (
                            <li key={t.id} className="relative flex justify-between items-center gap-3 pl-4 pr-2 py-3">
                                <div className="min-w-0">
                                    <p className="font-semibold text-white truncate">{t.clientName}</p>
                                    <p className="text-xs text-slate-400 truncate">
                                        {new Date(t.dateTime).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                        {t.task ? ` · ${t.task}` : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-emerald-400 font-bold">+{formatMoney(t.estimatedPrice || 0)}</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleMenu(t.id); }}
                                        aria-label={`Opciones del cobro de ${t.clientName}`}
                                        aria-expanded={openMenuId === t.id}
                                        className="p-2.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-700 transition-colors"
                                    >
                                        <NavIcon d={DOTS_ICON} className="w-5 h-5" />
                                    </button>
                                </div>
                                {openMenuId === t.id && (
                                    <div className="absolute right-2 top-12 bg-slate-800 border border-slate-700 shadow-xl rounded-xl overflow-hidden z-10 w-44 animate-fade-in-down">
                                        <button onClick={(e) => { e.stopPropagation(); onPaidChange(t.id, false); setOpenMenuId(null); }} className="w-full text-left px-4 py-3 text-sm text-amber-400 hover:bg-slate-700">Anular cobro</button>
                                        <button onClick={(e) => { e.stopPropagation(); setPendingDelete({ kind: 'turn', id: t.id, label: t.clientName }); setOpenMenuId(null); }} className="w-full text-left px-4 py-3 text-sm text-rose-400 hover:bg-slate-700 border-t border-slate-700/50">Eliminar turno</button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <EmptyState text={month ? 'No hay turnos cobrados este mes.' : 'No hay ingresos registrados aún.'} />
                )}
            </section>

            <ConfirmDialog
                open={!!pendingDelete}
                title={pendingDelete?.kind === 'turn' ? '¿Eliminar turno?' : '¿Eliminar gasto?'}
                message={pendingDelete
                    ? pendingDelete.kind === 'turn'
                        ? `Se borrará el turno cobrado de ${pendingDelete.label}. No se puede deshacer.`
                        : `Se borrará el gasto "${pendingDelete.label}". No se puede deshacer.`
                    : undefined}
                confirmLabel="Eliminar"
                onCancel={() => setPendingDelete(null)}
                onConfirm={() => {
                    if (pendingDelete?.kind === 'turn') onDeleteTurn(pendingDelete.id);
                    else if (pendingDelete) onDeleteExpense(pendingDelete.id);
                    setPendingDelete(null);
                }}
            />

            {/* Expense Modal (Create/Edit) */}
            {showExpenseModal && (
                <div onClick={(e) => e.stopPropagation()} className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                    <form onSubmit={handleSubmit} className="bg-slate-900 p-6 rounded-2xl w-full max-w-sm border border-slate-700 shadow-2xl">
                        <h3 className="text-xl font-bold mb-4 text-white">{editingExpenseId ? 'Editar Gasto' : 'Nuevo Gasto'}</h3>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label htmlFor="expense-desc" className="block text-sm font-bold text-slate-400 mb-1">Descripción</label>
                                <input id="expense-desc" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Ej. Esmaltes" value={desc} onChange={e => setDesc(e.target.value)} required autoFocus />
                            </div>
                            <div>
                                <label htmlFor="expense-amount" className="block text-sm font-bold text-slate-400 mb-1">Monto</label>
                                <input id="expense-amount" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none" type="number" inputMode="decimal" placeholder="$0" value={amount} onChange={e => setAmount(e.target.value)} required />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={closeModal} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white transition-colors">Cancelar</button>
                            <button type="submit" className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-white transition-colors">Guardar</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

const EmptyState = ({ text }: { text: string }) => (
    <div className="rounded-xl border border-dashed border-slate-700 py-8 text-center text-sm text-slate-400">
        {text}
    </div>
);
