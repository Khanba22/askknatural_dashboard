import { cookies } from 'next/headers';

const COOKIE_NAME = 'admin_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSessionToken(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('ADMIN_PASSWORD not set');
  return btoa(`asknatural:${password}:session`);
}

export function verifyPassword(input: string): boolean {
  return input === process.env.ADMIN_PASSWORD;
}

export async function setSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, getSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function isValidSession(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  try {
    return cookieValue === getSessionToken();
  } catch {
    return false;
  }
}
