'use client';

import { useEffect, useState, useTransition } from 'react';
import { createChainAction } from '@/app/actions';
import { INTERVALS, MAX_DAYS, daysBetween, fmtMin, isValidDate } from '@/lib/slots';

const HOURS = Array.from({ length: 25 }, (_, h) => h * 60);

/** Achica la foto en el navegador para que suba rápido aunque venga de la cámara del celular. */
async function shrinkPhoto(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return blob ? new File([blob], 'foto.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

export default function ChainForm() {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dayStart, setDayStart] = useState(0);
  const [dayEnd, setDayEnd] = useState(1440);
  const [interval, setIntervalMin] = useState<number>(30);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>();
  const [today, setToday] = useState('');
  const [timezone, setTimezone] = useState('');

  useEffect(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    setToday(local);
    setStartDate(local);
    setEndDate(local);
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  useEffect(() => {
    if (!photo) return setPreview(undefined);
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const datesOk = isValidDate(startDate) && isValidDate(endDate) && endDate >= startDate;
  const days = datesOk ? daysBetween(startDate, endDate) : 0;
  const perDay = dayEnd > dayStart ? Math.floor((dayEnd - dayStart) / interval) : 0;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(undefined);
    startTransition(async () => {
      fd.delete('photo');
      if (photo) fd.set('photo', await shrinkPhoto(photo));
      const result = await createChainAction(undefined, fd);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="card medium stack">
      <h2>Nueva cadena de oración</h2>

      <label className="field">
        ¿Por quién o por qué se reza?
        <input type="text" name="title" required maxLength={100} placeholder="Ej.: Por la salud de María" />
      </label>

      <label className="field">
        Intención o mensaje <span className="hint">Opcional. Se muestra a quienes entren a anotarse.</span>
        <textarea name="intention" maxLength={600} />
      </label>

      <div className="field">
        Foto <span className="hint">Opcional.</span>
        <div className="photo-input">
          {preview ? (
            <img className="photo-preview" src={preview} alt="Vista previa de la foto" />
          ) : (
            <div className="photo-preview" aria-hidden="true">✚</div>
          )}
          <label className="btn secondary small">
            {photo ? 'Cambiar foto' : 'Elegir foto'}
            <input
              className="visually-hidden"
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </label>
          {photo && (
            <button type="button" className="link-btn small muted" onClick={() => setPhoto(null)}>
              Quitar
            </button>
          )}
        </div>
      </div>

      <div className="grid-2">
        <label className="field">
          Desde
          <input
            type="date"
            name="start_date"
            required
            min={today}
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (endDate < e.target.value) setEndDate(e.target.value);
            }}
          />
        </label>
        <label className="field">
          Hasta
          <input
            type="date"
            name="end_date"
            required
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
      </div>

      <div className="field">
        Duración de cada turno
        <div className="choices">
          {INTERVALS.map((m) => (
            <label key={m}>
              <input
                type="radio"
                name="interval_min"
                value={m}
                checked={interval === m}
                onChange={() => setIntervalMin(m)}
              />
              <span>{m === 60 ? '1 hora' : `${m} minutos`}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        Franja horaria de cada día
        <span className="hint">Dejá 00:00 a 24:00 para una cadena continua, día y noche.</span>
        <div className="grid-2">
          <select
            name="day_start_min"
            aria-label="Hora de inicio"
            value={dayStart}
            onChange={(e) => setDayStart(Number(e.target.value))}
          >
            {HOURS.slice(0, 24).map((m) => (
              <option key={m} value={m}>Desde las {fmtMin(m)}</option>
            ))}
          </select>
          <select
            name="day_end_min"
            aria-label="Hora de fin"
            value={dayEnd}
            onChange={(e) => setDayEnd(Number(e.target.value))}
          >
            {HOURS.slice(1).map((m) => (
              <option key={m} value={m} disabled={m <= dayStart}>Hasta las {fmtMin(m)}</option>
            ))}
          </select>
        </div>
      </div>

      <label className="field">
        Personas por turno
        <span className="hint">Con 1, cada turno queda ocupado cuando alguien se anota.</span>
        <input type="number" name="max_per_slot" min={1} max={10} defaultValue={1} required style={{ maxWidth: 120 }} />
      </label>

      <input type="hidden" name="timezone" value={timezone} />

      {datesOk && perDay > 0 && days <= MAX_DAYS && (
        <p className="notice">
          Se va a armar una grilla de <strong>{days * perDay} turnos</strong> ({days} {days === 1 ? 'día' : 'días'} ×{' '}
          {perDay} turnos por día), en horario de {timezone.replace(/_/g, ' ') || 'tu zona'}.
        </p>
      )}
      {days > MAX_DAYS && <p className="error">La cadena puede durar como máximo {MAX_DAYS} días.</p>}
      {dayEnd <= dayStart && <p className="error">La hora de fin debe ser posterior a la de inicio.</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <button className="btn" disabled={pending}>
        {pending ? 'Creando…' : 'Crear cadena'}
      </button>
    </form>
  );
}
