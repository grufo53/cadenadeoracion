import { cache } from 'react';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { query, type User } from './db';

const COOKIE = 'sesion';
const MAX_AGE = 60 * 60 * 24 * 30;

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    if (process.env.VERCEL) throw new Error('Falta la variable de entorno AUTH_SECRET.');
    return new TextEncoder().encode('solo-para-desarrollo-local');
  }
  return new TextEncoder().encode(value);
}

export async function startSession(userId: number) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export const getUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  let userId: number;
  try {
    const { payload } = await jwtVerify(token, secret());
    userId = Number(payload.sub);
  } catch {
    return null;
  }
  if (!Number.isInteger(userId)) return null;
  const rows = await query<User>('SELECT id, email, name FROM users WHERE id = $1', [userId]);
  return rows[0] ?? null;
});
