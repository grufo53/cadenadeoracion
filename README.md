# Cadena de Rosario

Página para organizar cadenas de oración continua del Santo Rosario: quien la crea define por quién se reza,
las fechas, la duración de los turnos y una foto; los demás entran por un enlace o QR y se anotan con nombre y email.

## Probar en tu computadora

```bash
npm install
npm run dev
```

Abrí http://localhost:3000. No hace falta configurar nada: sin variables de entorno la app usa una base de
datos local (carpeta `.data/`) y guarda las fotos en `public/uploads/`.

## Publicar en Vercel

1. Subí esta carpeta a un repositorio de GitHub e importalo en https://vercel.com/new
   (o, desde esta carpeta, ejecutá `npx vercel`).
2. En el proyecto de Vercel, pestaña **Storage**:
   - **Create Database → Neon (Postgres)** y conectala al proyecto. Crea sola la variable `DATABASE_URL`.
   - **Create Database → Blob** y conectala al proyecto. Crea sola la variable `BLOB_READ_WRITE_TOKEN`.
3. En **Settings → Environment Variables** agregá `AUTH_SECRET` con un texto largo y aleatorio
   (por ejemplo, el resultado de `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
4. Volvé a desplegar (**Deployments → Redeploy**) para que tome las variables.

Las tablas de la base de datos se crean solas la primera vez que se usa la página.

## Cómo está armado

- `app/` — páginas (Next.js App Router) y `actions.ts` con toda la lógica de servidor.
- `components/` — formulario de creación, grilla de turnos, compartir/QR.
- `lib/db.ts` — conexión a Postgres y esquema de tablas.
- `lib/slots.ts` — cálculo de fechas y turnos.
