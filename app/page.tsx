import Link from 'next/link';
import { getUser } from '@/lib/auth';

export default async function HomePage() {
  const user = await getUser();
  return (
    <>
      <section className="hero">
        <span className="eyebrow">Oración continua</span>
        <h1>Unidos en el Rosario, sin que la oración se corte</h1>
        <p>
          Creá una cadena de oración por una persona o una intención, compartila con un enlace o un código QR
          y que cada uno elija el momento en que va a rezar.
        </p>
        <Link href={user ? '/panel/nueva' : '/registrarse'} className="btn">
          Crear una cadena de oración
        </Link>
        {!user && (
          <p className="small muted">
            ¿Ya tenés cuenta? <Link href="/ingresar">Ingresá</Link>
          </p>
        )}
      </section>

      <section className="steps">
        <div className="card">
          <div className="step-num">1</div>
          <h3>Definí la intención</h3>
          <p className="muted">Por quién se reza, una foto, las fechas y si los turnos son de 15, 30 o 60 minutos.</p>
        </div>
        <div className="card">
          <div className="step-num">2</div>
          <h3>Compartila</h3>
          <p className="muted">Enviá el enlace o el código QR por WhatsApp para invitar a familiares y amigos.</p>
        </div>
        <div className="card">
          <div className="step-num">3</div>
          <h3>Cada uno toma su turno</h3>
          <p className="muted">Sin registrarse: solo nombre y email. La grilla se va completando hasta cubrir toda la cadena.</p>
        </div>
      </section>
    </>
  );
}
