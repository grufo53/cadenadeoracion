// Acceso a Postgres. En Vercel usa Neon (DATABASE_URL); en desarrollo local,
// si no hay DATABASE_URL, usa PGlite (Postgres embebido) guardado en .data/.

type Row = Record<string, unknown>;
type Runner = (text: string, params?: unknown[]) => Promise<Row[]>;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  // Fechas y horas se guardan como "hora de pared" de la zona de la cadena:
  // fecha 'YYYY-MM-DD' + minutos desde la medianoche.
  `CREATE TABLE IF NOT EXISTS chains (
    id SERIAL PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    intention TEXT NOT NULL DEFAULT '',
    photo_url TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    day_start_min INTEGER NOT NULL DEFAULT 0,
    day_end_min INTEGER NOT NULL DEFAULT 1440,
    interval_min INTEGER NOT NULL,
    max_per_slot INTEGER NOT NULL DEFAULT 1,
    timezone TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  // Las dos restricciones UNIQUE son las que evitan que dos personas tomen
  // el mismo lugar a la vez, o que alguien se anote dos veces al mismo turno.
  `CREATE TABLE IF NOT EXISTS signups (
    id SERIAL PRIMARY KEY,
    chain_id INTEGER NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
    slot_date TEXT NOT NULL,
    slot_min INTEGER NOT NULL,
    seat INTEGER NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (chain_id, slot_date, slot_min, seat),
    UNIQUE (chain_id, slot_date, slot_min, email)
  )`,
];

const g = globalThis as unknown as { __dbRunner?: Promise<Runner> };

async function createRunner(): Promise<Runner> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  let run: Runner;
  if (url) {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(url);
    run = async (text, params = []) => (await sql.query(text, params)) as Row[];
  } else {
    if (process.env.VERCEL) {
      throw new Error('Falta DATABASE_URL: conectá una base de datos Neon desde el panel de Vercel (Storage).');
    }
    const { PGlite } = await import('@electric-sql/pglite');
    const { mkdir } = await import('node:fs/promises');
    await mkdir('./.data', { recursive: true });
    const db = new PGlite('./.data/pg');
    run = async (text, params = []) => (await db.query(text, params)).rows as Row[];
  }
  for (const stmt of SCHEMA) await run(stmt);
  return run;
}

export async function query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  if (!g.__dbRunner) {
    g.__dbRunner = createRunner().catch((err) => {
      g.__dbRunner = undefined;
      throw err;
    });
  }
  const run = await g.__dbRunner;
  return (await run(text, params)) as T[];
}

export type User = { id: number; email: string; name: string };

export type Chain = {
  id: number;
  slug: string;
  owner_id: number;
  title: string;
  intention: string;
  photo_url: string | null;
  start_date: string;
  end_date: string;
  day_start_min: number;
  day_end_min: number;
  interval_min: number;
  max_per_slot: number;
  timezone: string;
};
