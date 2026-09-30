# VYRO — Digital Business Platform

Multi-tenant SaaS for digital business websites, catalogs, ordering, QR/NFC, WhatsApp tickets, and operations.

Built for **Eng. Youssef Mohammed**.

**VYRO** is the platform. **RPM — Really Powerful Meals** is the first restaurant tenant.

## Stack

- TanStack Start (React 19) + Vite + Tailwind v4
- Better Auth (email/password + Google + X)
- Postgres (Neon in production, PGLite locally if `DATABASE_URL` is unset)
- Arabic / English UI with RTL
- Zod, Zustand, Recharts, QR generation

## First owner account

There is **no default password**.

1. Open `/login`
2. Create an account (password min 8 characters)
3. Optionally set `VYRO_OWNER_EMAIL` so only your email can bootstrap Super Admin
4. First allowed account becomes VYRO Super Admin + RPM tenant owner

Then:
- `/admin` — VYRO platform console
- `/dashboard` — tenant (RPM) console
- `/r/rpm` — public restaurant experience

## Local run

```bash
npm install
npm run dev
```

App listens on port **8080**.

```bash
npm run typecheck
npm run build
```

## Vercel production

1. Create a free [Neon](https://neon.tech) Postgres project
2. In Vercel → Environment Variables:

| Name | Value |
|------|--------|
| `DATABASE_URL` | Neon connection string |
| `VITE_AUTH_ENABLED` | `true` |
| `BETTER_AUTH_SECRET` | long random secret |
| `BETTER_AUTH_URL` | `https://your-app.vercel.app` |
| `VYRO_OWNER_EMAIL` | your email (recommended) |

3. Redeploy after saving env vars

Without `DATABASE_URL`, Vercel fails with `pglite.data` ENOENT.

## Language

Use the **EN / عر** button in the header (and on login). Preference is saved in the browser. Default is Arabic + RTL.

## Brand

- Platform identity: `src/lib/vyro/brand.ts`
- Logos: `public/brands/vyro/`
- RPM red is tenant-only — never mix into VYRO chrome

## Contact

- Email: vyro.techpro1@gmail.com
- Phone: 01050034183
- WhatsApp: +201050034183
