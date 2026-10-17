# Gestión de Turnos

App web personal para agendar turnos, llevar la lista de precios y controlar ganancias y gastos.

- **Next.js 16 + React 19 + Tailwind 4**
- **Neon Postgres** como base de datos (acceso solo desde el servidor, vía Server Actions en `lib/data.ts`)

## Configuración

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Crear `.env.local` con la conexión a Neon (no se sube a Git):

   ```
   DATABASE_URL=postgresql://...
   ```

3. Crear las tablas (se puede correr varias veces, no borra datos):

   ```bash
   npm run db:setup
   ```

## Uso

```bash
npm run dev
```

Abre en http://localhost:3001.

> La app no tiene login: cualquiera que pueda abrir la URL ve y modifica los datos. Está pensada para usarse en local; si se publica en internet hay que protegerla.
