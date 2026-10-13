import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import { getUser } from '@/lib/auth';
import { logoutAction } from './actions';
import './globals.css';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-serif' });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: { default: 'Cadena de Rosario', template: '%s · Cadena de Rosario' },
  description: 'Organizá cadenas de oración continua del Santo Rosario y compartilas para que otros se sumen.',
};

export const viewport: Viewport = { themeColor: '#22335c' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <html lang="es" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden="true">✚</span> Cadena de Rosario
          </Link>
          <nav>
            {user ? (
              <>
                <Link href="/panel">Mis cadenas</Link>
                <form action={logoutAction}>
                  <button className="link-btn">Salir</button>
                </form>
              </>
            ) : (
              <Link href="/ingresar">Ingresar</Link>
            )}
          </nav>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <a href="https://www.elsantorosario.es/como-rezar-el-rosario/" target="_blank" rel="noopener noreferrer">
            Cómo rezar el Rosario
          </a>
          <p>Ave María Purísima · Sin pecado concebida</p>
        </footer>
      </body>
    </html>
  );
}
