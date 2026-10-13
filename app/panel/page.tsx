import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { query, type Chain } from '@/lib/db';
import { fmtDate, listDates, listMinutes } from '@/lib/slots';
import DeleteChainButton from '@/components/DeleteChainButton';

export const metadata = { title: 'Mis cadenas' };

type ChainRow = Chain & { covered: number };

export default async function PanelPage() {
  const user = await getUser();
  if (!user) redirect('/ingresar');

  const chains = await query<ChainRow>(
    `SELECT c.*, (
       SELECT COUNT(*)::int FROM (SELECT DISTINCT slot_date, slot_min FROM signups s WHERE s.chain_id = c.id) x
     ) AS covered
     FROM chains c WHERE c.owner_id = $1 ORDER BY c.created_at DESC`,
    [user.id],
  );

  return (
    <div className="stack">
      <div className="row between">
        <h1>Mis cadenas</h1>
        <Link href="/panel/nueva" className="btn">+ Nueva cadena</Link>
      </div>

      {chains.length === 0 ? (
        <div className="card">
          <p>Todavía no creaste ninguna cadena de oración.</p>
        </div>
      ) : (
        <div className="chain-list">
          {chains.map((c) => {
            const total = listDates(c.start_date, c.end_date).length * listMinutes(c).length;
            return (
              <div key={c.id} className="card chain-item">
                {c.photo_url ? (
                  <img className="thumb" src={c.photo_url} alt="" />
                ) : (
                  <div className="thumb" aria-hidden="true">✚</div>
                )}
                <div className="info">
                  <h3>{c.title}</h3>
                  <p className="muted small">
                    Del {fmtDate(c.start_date)} al {fmtDate(c.end_date)} · turnos de {c.interval_min} min ·{' '}
                    {c.covered} de {total} turnos cubiertos
                  </p>
                </div>
                <div className="row actions">
                  <Link href={`/c/${c.slug}`} className="btn secondary small">Abrir</Link>
                  <DeleteChainButton slug={c.slug} title={c.title} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
