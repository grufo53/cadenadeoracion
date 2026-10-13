'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { loginAction, registerAction } from '@/app/actions';

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const isRegister = mode === 'register';
  const [state, action, pending] = useActionState(isRegister ? registerAction : loginAction, undefined);

  return (
    <div className="card narrow">
      <form action={action} className="stack">
        <h2>{isRegister ? 'Crear cuenta' : 'Ingresar'}</h2>
        <p className="muted small">
          {isRegister
            ? 'La cuenta es solo para quien crea cadenas de oración. Para anotarse a rezar no hace falta.'
            : 'Ingresá para crear y administrar tus cadenas de oración.'}
        </p>
        {state?.error && <p className="error" role="alert">{state.error}</p>}
        {isRegister && (
          <label className="field">
            Nombre
            <input type="text" name="name" required maxLength={60} autoComplete="name" />
          </label>
        )}
        <label className="field">
          Email
          <input type="email" name="email" required maxLength={120} autoComplete="email" />
        </label>
        <label className="field">
          Contraseña
          <input
            type="password"
            name="password"
            required
            minLength={isRegister ? 8 : undefined}
            maxLength={72}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />
          {isRegister && <span className="hint">Al menos 8 caracteres.</span>}
        </label>
        <button className="btn" disabled={pending}>
          {pending ? 'Un momento…' : isRegister ? 'Crear cuenta' : 'Ingresar'}
        </button>
        <p className="small muted">
          {isRegister ? (
            <>¿Ya tenés cuenta? <Link href="/ingresar">Ingresá</Link></>
          ) : (
            <>¿Todavía no tenés cuenta? <Link href="/registrarse">Creala gratis</Link></>
          )}
        </p>
      </form>
    </div>
  );
}
