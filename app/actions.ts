'use server';

import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { query, type Chain } from '@/lib/db';
import { startSession, endSession, getUser } from '@/lib/auth';
import { savePhoto, deletePhoto, isAllowedPhoto } from '@/lib/storage';
import {
  INTERVALS,
  MAX_DAYS,
  daysBetween,
  isPast,
  isValidDate,
  isValidSlot,
  isValidTimezone,
  nowInTz,
} from '@/lib/slots';

export type FormState = { error?: string } | undefined;
export type ActionResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(fd: FormData, key: string, max: number): string {
  const value = fd.get(key);
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanEmail(value: string): string {
  return value.trim().toLowerCase().slice(0, 120);
}

// ---------- Cuenta del creador ----------

export async function registerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = text(fd, 'name', 60);
  const email = cleanEmail(text(fd, 'email', 120));
  const password = String(fd.get('password') ?? '');

  if (!name) return { error: 'Ingresá tu nombre.' };
  if (!EMAIL_RE.test(email)) return { error: 'Ingresá un email válido.' };
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.' };
  if (password.length > 72) return { error: 'La contraseña es demasiado larga.' };

  const hash = await bcrypt.hash(password, 10);
  const rows = await query<{ id: number }>(
    `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING RETURNING id`,
    [email, name, hash],
  );
  if (!rows[0]) return { error: 'Ya existe una cuenta con ese email. Probá ingresar.' };

  await startSession(rows[0].id);
  redirect('/panel');
}

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = cleanEmail(text(fd, 'email', 120));
  const password = String(fd.get('password') ?? '');

  const rows = await query<{ id: number; password_hash: string }>(
    'SELECT id, password_hash FROM users WHERE email = $1',
    [email],
  );
  const ok = rows[0] ? await bcrypt.compare(password, rows[0].password_hash) : false;
  if (!ok) return { error: 'Email o contraseña incorrectos.' };

  await startSession(rows[0].id);
  redirect('/panel');
}

export async function logoutAction() {
  await endSession();
  redirect('/');
}

// ---------- Cadenas ----------

export async function createChainAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getUser();
  if (!user) redirect('/ingresar');

  const title = text(fd, 'title', 100);
  const intention = text(fd, 'intention', 600);
  const startDate = text(fd, 'start_date', 10);
  const endDate = text(fd, 'end_date', 10);
  const dayStart = Number(fd.get('day_start_min'));
  const dayEnd = Number(fd.get('day_end_min'));
  const interval = Number(fd.get('interval_min'));
  const maxPerSlot = Number(fd.get('max_per_slot'));
  const timezone = text(fd, 'timezone', 64);
  const photo = fd.get('photo');

  if (!title) return { error: 'Indicá por quién o por qué se reza.' };
  if (!isValidDate(startDate) || !isValidDate(endDate)) return { error: 'Completá las fechas de inicio y fin.' };
  if (endDate < startDate) return { error: 'La fecha de fin no puede ser anterior a la de inicio.' };
  if (daysBetween(startDate, endDate) > MAX_DAYS) return { error: `La cadena puede durar como máximo ${MAX_DAYS} días.` };
  if (!(INTERVALS as readonly number[]).includes(interval)) return { error: 'Elegí la duración de cada turno.' };
  if (
    !Number.isInteger(dayStart) || !Number.isInteger(dayEnd) ||
    dayStart < 0 || dayEnd > 1440 || dayStart % 60 !== 0 || dayEnd % 60 !== 0
  ) {
    return { error: 'La franja horaria no es válida.' };
  }
  if (dayEnd <= dayStart) return { error: 'La hora de fin de la franja debe ser posterior a la de inicio.' };
  if (!Number.isInteger(maxPerSlot) || maxPerSlot < 1 || maxPerSlot > 10) {
    return { error: 'La cantidad de personas por turno debe estar entre 1 y 10.' };
  }
  if (!isValidTimezone(timezone)) return { error: 'No se pudo detectar la zona horaria.' };

  let photoUrl: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    if (!isAllowedPhoto(photo)) return { error: 'La foto debe ser JPG, PNG o WebP y pesar menos de 3,5 MB.' };
    photoUrl = await savePhoto(photo);
  }

  const slug = randomBytes(6).toString('base64url').toLowerCase().replace(/[-_]/g, 'x');
  await query(
    `INSERT INTO chains (slug, owner_id, title, intention, photo_url, start_date, end_date,
                         day_start_min, day_end_min, interval_min, max_per_slot, timezone)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [slug, user.id, title, intention, photoUrl, startDate, endDate, dayStart, dayEnd, interval, maxPerSlot, timezone],
  );
  redirect(`/c/${slug}`);
}

export async function deleteChainAction(fd: FormData) {
  const user = await getUser();
  if (!user) redirect('/ingresar');
  const slug = text(fd, 'slug', 40);
  const rows = await query<{ photo_url: string | null }>(
    'DELETE FROM chains WHERE slug = $1 AND owner_id = $2 RETURNING photo_url',
    [slug, user.id],
  );
  if (rows[0]?.photo_url) await deletePhoto(rows[0].photo_url);
  revalidatePath('/panel');
  redirect('/panel');
}

// ---------- Turnos ----------

async function findChain(slug: string): Promise<Chain | null> {
  const rows = await query<Chain>('SELECT * FROM chains WHERE slug = $1', [slug]);
  return rows[0] ?? null;
}

export async function signUpAction(
  slug: string,
  date: string,
  min: number,
  rawName: string,
  rawEmail: string,
): Promise<ActionResult> {
  const name = String(rawName ?? '').trim().slice(0, 60);
  const email = cleanEmail(String(rawEmail ?? ''));
  if (!name) return { ok: false, error: 'Ingresá tu nombre.' };
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Ingresá un email válido.' };

  const chain = await findChain(String(slug));
  if (!chain) return { ok: false, error: 'No encontramos esta cadena de oración.' };
  if (!isValidSlot(chain, date, min)) return { ok: false, error: 'Ese turno no existe.' };
  if (isPast(nowInTz(chain.timezone), date, min, chain.interval_min)) {
    return { ok: false, error: 'Ese turno ya pasó.' };
  }

  const taken = await query<{ seat: number; email: string }>(
    'SELECT seat, email FROM signups WHERE chain_id = $1 AND slot_date = $2 AND slot_min = $3',
    [chain.id, date, min],
  );
  if (taken.some((t) => t.email === email)) return { ok: false, error: 'Ya estás anotado en este turno.' };

  const used = new Set(taken.map((t) => t.seat));
  for (let seat = 1; seat <= chain.max_per_slot; seat++) {
    if (used.has(seat)) continue;
    // Si otra persona ganó este lugar en el mismo instante, el UNIQUE descarta el insert y probamos el siguiente.
    const rows = await query(
      `INSERT INTO signups (chain_id, slot_date, slot_min, seat, name, email)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING RETURNING id`,
      [chain.id, date, min, seat, name, email],
    );
    if (rows.length) {
      revalidatePath(`/c/${chain.slug}`);
      return { ok: true };
    }
  }
  revalidatePath(`/c/${chain.slug}`);
  return { ok: false, error: 'Alguien acaba de tomar este turno. Elegí otro, por favor.' };
}

/** Baja hecha por la misma persona: libera el turno si el email coincide. */
export async function cancelSignupAction(
  slug: string,
  date: string,
  min: number,
  rawEmail: string,
): Promise<ActionResult> {
  const email = cleanEmail(String(rawEmail ?? ''));
  const chain = await findChain(String(slug));
  if (!chain) return { ok: false, error: 'No encontramos esta cadena de oración.' };

  const rows = await query(
    `DELETE FROM signups WHERE chain_id = $1 AND slot_date = $2 AND slot_min = $3 AND email = $4 RETURNING id`,
    [chain.id, String(date), Number(min), email],
  );
  if (!rows.length) return { ok: false, error: 'Ese email no coincide con el de la inscripción a este turno.' };
  revalidatePath(`/c/${chain.slug}`);
  return { ok: true };
}

/** Baja hecha por quien creó la cadena. */
export async function releaseSignupAction(signupId: number): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: 'Tu sesión venció. Volvé a ingresar.' };
  const rows = await query<{ slug: string }>(
    `DELETE FROM signups s USING chains c
     WHERE s.id = $1 AND c.id = s.chain_id AND c.owner_id = $2 RETURNING c.slug`,
    [Number(signupId), user.id],
  );
  if (!rows.length) return { ok: false, error: 'No se pudo liberar el turno.' };
  revalidatePath(`/c/${rows[0].slug}`);
  return { ok: true };
}
