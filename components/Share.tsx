'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function Share({ slug, title }: { slug: string; title: string }) {
  const [url, setUrl] = useState('');
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const link = `${window.location.origin}/c/${slug}`;
    setUrl(link);
    QRCode.toDataURL(link, { width: 720, margin: 2, color: { dark: '#22335c', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [slug]);

  const message = `Te invito a sumarte a la cadena de oración del Rosario "${title}". Elegí tu turno acá: ${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <section className="card share">
      {qr ? <img src={qr} alt="Código QR para entrar a esta cadena de oración" /> : <div style={{ width: 180, height: 180 }} />}
      <div className="stack" style={{ minWidth: 0 }}>
        <div>
          <h3>Invitá a otros a rezar</h3>
          <p className="muted small">Compartí el enlace o el código QR para que más personas tomen un turno.</p>
        </div>
        <p className="share-url">{url || '…'}</p>
        <div className="row">
          <a className="btn small" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
            Enviar por WhatsApp
          </a>
          <button type="button" className="btn secondary small" onClick={copy}>
            {copied ? '¡Copiado!' : 'Copiar enlace'}
          </button>
          {qr && (
            <a className="btn secondary small" href={qr} download={`cadena-rosario-${slug}.png`}>
              Descargar QR
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
