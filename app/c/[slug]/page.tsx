import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { query, type Chain } from '@/lib/db';
import { fmtDate, fmtMin, nowInTz } from '@/lib/slots';
import ChainView, { type Signup } from '@/components/ChainView';
import Share from '@/components/Share';

type Params = { params: Promise<{ slug: string }> };

const getChain = cache(async (slug: string) => {
  const rows = await query<Chain>('SELECT * FROM chains WHERE slug = $1', [slug]);
  return rows[0] ?? null;
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const chain = await getChain((await params).slug);
  if (!chain) return { title: 'Cadena no encontrada' };
  const description = chain.intention || 'Sumate a esta cadena de oración del Santo Rosario y elegí tu turno.';
  return {
    title: chain.title,
    description,
    openGraph: {
      title: `Cadena de Rosario: ${chain.title}`,
      description,
      images: chain.photo_url?.startsWith('http') ? [chain.photo_url] : undefined,
    },
  };
}

export default async function ChainPage({ params }: Params) {
  const chain = await getChain((await params).slug);
  if (!chain) notFound();

  const user = await getUser();
  const isOwner = user?.id === chain.owner_id;

  const rows = await query<{ id: number; slot_date: string; slot_min: number; name: string; email: string }>(
    'SELECT id, slot_date, slot_min, name, email FROM signups WHERE chain_id = $1 ORDER BY slot_date, slot_min, seat',
    [chain.id],
  );
  // El email solo viaja al navegador de quien creó la cadena.
  const signups: Signup[] = rows.map((r) => ({
    id: r.id,
    d: r.slot_date,
    m: r.slot_min,
    name: r.name,
    ...(isOwner ? { email: r.email } : {}),
  }));

  const sameDay = chain.start_date === chain.end_date;
  const allDay = chain.day_start_min === 0 && chain.day_end_min === 1440;

  return (
    <div className="stack" style={{ gap: 28 }}>
      <section className="card">
        <div className="chain-head">
          {chain.photo_url && <img className="chain-photo" src={chain.photo_url} alt={chain.title} />}
          <div>
            <span className="eyebrow">Cadena de oración del Rosario</span>
            <h1>{chain.title}</h1>
            {chain.intention && <p className="intention">{chain.intention}</p>}
            <div className="facts">
              <span className="fact">
                {sameDay ? fmtDate(chain.start_date) : `Del ${fmtDate(chain.start_date)} al ${fmtDate(chain.end_date)}`}
              </span>
              <span className="fact">
                {allDay ? 'Las 24 horas' : `De ${fmtMin(chain.day_start_min)} a ${fmtMin(chain.day_end_min)}`}
              </span>
              <span className="fact">
                Turnos de {chain.interval_min === 60 ? '1 hora' : `${chain.interval_min} minutos`}
              </span>
            </div>
          </div>
        </div>

        <ChainView
          slug={chain.slug}
          shape={{
            start_date: chain.start_date,
            end_date: chain.end_date,
            day_start_min: chain.day_start_min,
            day_end_min: chain.day_end_min,
            interval_min: chain.interval_min,
          }}
          maxPerSlot={chain.max_per_slot}
          timezone={chain.timezone}
          signups={signups}
          isOwner={isOwner}
          initialNow={nowInTz(chain.timezone)}
        />
      </section>

      <Share slug={chain.slug} title={chain.title} />
    </div>
  );
}
