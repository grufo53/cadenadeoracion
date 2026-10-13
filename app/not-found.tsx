import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="card narrow stack">
      <h2>No encontramos esta página</h2>
      <p className="muted">Puede que el enlace esté incompleto o que la cadena de oración haya sido eliminada.</p>
      <Link href="/" className="btn">Ir al inicio</Link>
    </div>
  );
}
