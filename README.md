# QwikSlot — Doctor appointment booking

Mobile-first web app: **React (Vite) + Tailwind CSS v4** frontend, **Fastify + Prisma + PostgreSQL** backend, **JWT + RBAC**, **WebSockets** for live token queues, and **mock payments** (Razorpay can replace the mock intent step later).

## Prerequisites

- Node.js 20+
- PostgreSQL 14+

## Run locally (quick)

1. **PostgreSQL** running and a database created (default URL below expects user `postgres`, password `postgres`, DB `doctor_appointment`). Adjust `backend/.env` if yours differs.
2. **Backend** (terminal 1):

```bash
cd backend
npm install
npx prisma db push
npm run db:seed
npm run dev
```

3. **Frontend** (terminal 2):

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The dev server proxies API calls to **http://localhost:4000**.

Env files included for local dev: **`backend/.env`**, **`frontend/.env`**. Copy from **`.env.example`** in each folder if you need a fresh template. For production, set strong `JWT_SECRET` and a real `DATABASE_URL`; **do not commit secrets**.

## Backend

```bash
cd backend
# .env is already present for local dev; edit DATABASE_URL / JWT_SECRET as needed
npm install
npx prisma db push
npm run db:seed
npm run dev
```

API listens on `http://localhost:4000`. WebSocket endpoint: `ws://localhost:4000/ws` (subscribe with `{"type":"subscribe","doctorId":"<id>"}`).

### Seed logins

| Role        | Email               | Password     |
|------------|---------------------|-------------|
| Super admin | super@clinic.test   | password123 |
| Admin      | admin@clinic.test   | password123 |
| Patient    | patient@clinic.test | password123 |

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The dev server proxies `/api` and `/ws` to the backend on port 4000.

## Project layout

- `backend/` — Fastify modules: `auth`, `doctors`, `appointments`, `admin`, `payments` (mock), Prisma schema, WebSocket hub.
- `frontend/` — Pages, Redux + redux-saga (auth), TanStack Query (server state), theme persistence (`localStorage` key `clinic_theme`).

## Production notes

- Set `CORS_ORIGIN` to your web origin (comma-separated for multiple).
- Use `wss://` for WebSockets behind HTTPS.
- Replace mock payment with Razorpay: keep the two-step flow (create payment intent → confirm booking with `paymentRef`).
