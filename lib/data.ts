"use server";

// Acceso a datos (Neon Postgres) vía Server Actions. La conexión vive solo en el servidor.
// Las filas mantienen los nombres de columna (snake_case) de las tablas.

import { pool } from './db';

export type Table = 'turns' | 'prices' | 'expenses';

type Row = { id: string; created_at: string; [key: string]: any };

// Columns each table accepts on insert/update; anything else is ignored
const COLUMNS: Record<Table, string[]> = {
    turns: ['client_name', 'date_time', 'task', 'estimated_price', 'deposit', 'completed', 'paid', 'reminder_time', 'reminder_sent'],
    prices: ['service_name', 'price'],
    expenses: ['description', 'amount'],
};

const ORDER: Record<Table, string> = {
    turns: 'date_time ASC',
    prices: 'service_name ASC',
    expenses: 'created_at DESC',
};

const assertTable = (table: string): Table => {
    if (!(table in COLUMNS)) throw new Error(`Tabla inválida: ${table}`);
    return table as Table;
};

const pick = (table: Table, data: Record<string, any>) =>
    Object.entries(data).filter(([key]) => COLUMNS[table].includes(key));

// Dates come back as Date objects; the UI works with ISO strings
const serialize = (row: Record<string, any>): Row =>
    Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v])) as Row;

export async function getAll<T = Row>(table: Table): Promise<T[]> {
    const t = assertTable(table);
    const { rows } = await pool.query(`SELECT * FROM ${t} ORDER BY ${ORDER[t]}`);
    return rows.map(serialize) as T[];
}

export async function insert(table: Table, data: Record<string, any>): Promise<Row> {
    const t = assertTable(table);
    const entries = pick(t, data);
    const columns = entries.map(([k]) => k).join(', ');
    const placeholders = entries.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await pool.query(
        `INSERT INTO ${t} (${columns}) VALUES (${placeholders}) RETURNING *`,
        entries.map(([, v]) => v)
    );
    return serialize(rows[0]);
}

export async function update(table: Table, id: string, changes: Record<string, any>): Promise<void> {
    const t = assertTable(table);
    const entries = pick(t, changes);
    if (entries.length === 0) return;
    const sets = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
    await pool.query(`UPDATE ${t} SET ${sets} WHERE id = $1`, [id, ...entries.map(([, v]) => v)]);
}

export async function remove(table: Table, id: string): Promise<void> {
    const t = assertTable(table);
    await pool.query(`DELETE FROM ${t} WHERE id = $1`, [id]);
}

export async function getBusinessName(): Promise<string> {
    const { rows } = await pool.query(`SELECT value FROM settings WHERE key = 'business_name'`);
    return rows[0]?.value ?? '';
}

export async function setBusinessName(name: string): Promise<void> {
    await pool.query(
        `INSERT INTO settings (key, value) VALUES ('business_name', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [name]
    );
}
