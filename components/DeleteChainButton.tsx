'use client';

import { deleteChainAction } from '@/app/actions';

export default function DeleteChainButton({ slug, title }: { slug: string; title: string }) {
  return (
    <form
      action={deleteChainAction}
      onSubmit={(e) => {
        if (!confirm(`¿Eliminar la cadena "${title}"? Se borran también todos los turnos anotados. No se puede deshacer.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="slug" value={slug} />
      <button className="btn danger small">Eliminar</button>
    </form>
  );
}
