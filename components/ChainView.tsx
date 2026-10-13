'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cancelSignupAction, releaseSignupAction, signUpAction, type ActionResult } from '@/app/actions';
import { fmtDate, fmtMin, isPast, listDates, listMinutes, nowInTz, type Now, type SlotShape } from '@/lib/slots';

export type Signup = { id: number; d: string; m: number; name: string; email?: string };

type Props = {
  slug: string;
  shape: SlotShape;
  maxPerSlot: number;
  timezone: string;
  signups: Signup[];
  isOwner: boolean;
  initialNow: Now;
};

const STORAGE_KEY = 'cadena-rosario:persona';

export default function ChainView({ slug, shape, maxPerSlot, timezone, signups, isOwner, initialNow }: Props) {
  const router = useRouter();
  const [now, setNow] = useState(initialNow);
  const dates = useMemo(() => listDates(shape.start_date, shape.end_date), [shape.start_date, shape.end_date]);
  const minutes = useMemo(() => listMinutes(shape), [shape]);
  const [day, setDay] = useState(() => (dates.includes(initialNow.date) ? initialNow.date : dates[0]));
  const [open, setOpen] = useState<{ d: string; m: number } | null>(null);
  const [thanks, setThanks] = useState<string>();

  // La grilla se actualiza sola para ver los turnos que van tomando los demás.
  useEffect(() => {
    const id = setInterval(() => {
      setNow(nowInTz(timezone));
      if (document.visibilityState === 'visible') router.refresh();
    }, 20000);
    return () => clearInterval(id);
  }, [router, timezone]);

  const bySlot = useMemo(() => {
    const map = new Map<string, Signup[]>();
    for (const s of signups) {
      const key = `${s.d}|${s.m}`;
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return map;
  }, [signups]);

  const coveredByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const key of bySlot.keys()) {
      const d = key.split('|')[0];
      map.set(d, (map.get(d) ?? 0) + 1);
    }
    return map;
  }, [bySlot]);

  const total = dates.length * minutes.length;
  const covered = bySlot.size;
  const pct = total ? Math.round((covered / total) * 100) : 0;
  const end = (m: number) => fmtMin((m + shape.interval_min) % 1440);

  return (
    <>
      <div className="progress">
        <div className="progress-label">
          <strong>{covered === total ? '¡Cadena completa!' : `${covered} de ${total} turnos cubiertos`}</strong>
          <span className="muted">{pct}%</span>
        </div>
        <div className="progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: `${pct}%` }} />
        </div>
      </div>

      <h2 className="section-title">Elegí tu turno</h2>
      {thanks && <p className="notice" role="status" style={{ marginBottom: 12 }}>{thanks}</p>}

      {dates.length > 1 && (
        <div className="days">
          {dates.map((d) => {
            const count = coveredByDay.get(d) ?? 0;
            const cls = ['day', count === minutes.length ? 'full' : '', d < now.date ? 'past' : ''].join(' ');
            return (
              <button key={d} type="button" className={cls} aria-pressed={d === day} onClick={() => setDay(d)}>
                <span className="d">{fmtDate(d, 'short')}</span>
                <span className="c">{count}/{minutes.length}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="legend">
        <span><i className="free" />Libre</span>
        <span><i className="taken" />Ocupado</span>
        <span>Horario de {timezone.replace(/_/g, ' ')}</span>
      </div>

      <div className="slots">
        {minutes.map((m) => {
          const people = bySlot.get(`${day}|${m}`) ?? [];
          const past = isPast(now, day, m, shape.interval_min);
          const full = people.length >= maxPerSlot;
          const cls = ['slot', people.length ? 'taken' : 'free', past ? 'past' : ''].join(' ');
          return (
            <button
              key={m}
              type="button"
              className={cls}
              disabled={past && people.length === 0}
              onClick={() => setOpen({ d: day, m })}
            >
              <span className="t">{fmtMin(m)}</span>
              <span className="who">
                {people.length === 0
                  ? past ? 'Sin cubrir' : 'Libre · anotarme'
                  : people.map((p) => p.name).join(', ') + (!full && !past ? ' · hay lugar' : '')}
              </span>
            </button>
          );
        })}
      </div>

      {open && (
        <SlotDialog
          title={`${fmtDate(open.d)} · ${fmtMin(open.m)} a ${end(open.m)}`}
          slug={slug}
          date={open.d}
          min={open.m}
          people={bySlot.get(`${open.d}|${open.m}`) ?? []}
          canJoin={
            (bySlot.get(`${open.d}|${open.m}`)?.length ?? 0) < maxPerSlot &&
            !isPast(now, open.d, open.m, shape.interval_min)
          }
          isOwner={isOwner}
          onClose={() => setOpen(null)}
          onDone={(message) => {
            setOpen(null);
            setThanks(message);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function SlotDialog(props: {
  title: string;
  slug: string;
  date: string;
  min: number;
  people: Signup[];
  canJoin: boolean;
  isOwner: boolean;
  onClose: () => void;
  onDone: (message?: string) => void;
}) {
  const { title, slug, date, min, people, canJoin, isOwner, onClose, onDone } = props;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cancelEmail, setCancelEmail] = useState('');
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
      setName(saved.name ?? '');
      setEmail(saved.email ?? '');
      setCancelEmail(saved.email ?? '');
    } catch {}
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function run(action: () => Promise<ActionResult>, message?: string) {
    setError(undefined);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onDone(message);
      else setError(result.error);
    });
  }

  function join(e: React.FormEvent) {
    e.preventDefault();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, email }));
    } catch {}
    run(
      () => signUpAction(slug, date, min, name, email),
      `¡Gracias, ${name.trim()}! Quedaste anotado: ${title}. Podés anotarte en más turnos si querés.`,
    );
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog stack" role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>

        {people.length > 0 && (
          <ul className="occupants">
            {people.map((p) => (
              <li key={p.id}>
                <span>
                  <strong>{p.name}</strong>
                  {p.email && <span className="muted small"> · {p.email}</span>}
                </span>
                {isOwner && (
                  <button
                    type="button"
                    className="btn danger small"
                    disabled={pending}
                    onClick={() => run(() => releaseSignupAction(p.id), 'El turno quedó liberado.')}
                  >
                    Liberar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {error && <p className="error" role="alert">{error}</p>}

        {canJoin && (
          <form onSubmit={join} className="stack">
            <label className="field">
              Tu nombre
              <input type="text" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </label>
            <label className="field">
              Tu email <span className="hint">No se muestra públicamente. Sirve para liberar el turno si no podés.</span>
              <input type="email" required maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </label>
            <button className="btn" disabled={pending}>{pending ? 'Anotando…' : 'Anotarme en este turno'}</button>
          </form>
        )}

        {people.length > 0 && !isOwner && (
          <>
            {canJoin && <hr className="divider" />}
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => cancelSignupAction(slug, date, min, cancelEmail), 'Tu turno quedó liberado para que otra persona pueda tomarlo.');
              }}
            >
              <label className="field">
                ¿Te anotaste y no vas a poder?
                <span className="hint">Ingresá el email con el que te anotaste para liberar el turno.</span>
                <input type="email" required maxLength={120} value={cancelEmail} onChange={(e) => setCancelEmail(e.target.value)} />
              </label>
              <button className="btn secondary" disabled={pending}>Liberar mi turno</button>
            </form>
          </>
        )}

        <button type="button" className="link-btn muted" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
