This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Required environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key — server only, never expose to browser |
| `DATABASE_URL` | Postgres connection string for Drizzle ORM (use the Supabase connection pooler URL in transaction mode) |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `INTEGRATIONS_ENCRYPTION_KEY` | Random secret used to pgp_sym_encrypt Untappd and Printify credentials at rest. Generate with `openssl rand -base64 32`. **Rotating this key invalidates all stored credentials — you must re-enter them in the Integrations admin panel after any rotation.** |
| `CRON_SECRET` | Bearer token that Vercel Cron attaches to scheduled requests (Authorization header). Protects `/api/cron/sync-events`. Generate with `openssl rand -base64 32`. Set in Vercel project environment variables and Vercel will inject it automatically into cron invocations. |

Set these in `.env.local` for local development and in the Vercel project settings for staging/production.
