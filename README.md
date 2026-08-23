# Order Management Dashboard

Small internal order desk: React + Node/Express + MySQL (raw SQL via `mysql2`, no ORM).

## What is included

- Dashboard with summary cards + recent orders
- Orders list: search (debounced), status filter, pagination
- Order detail + validated status transitions
- Create-order form (submit disabled while in flight)
- Central API layer (`frontend/src/services/api.js`)
- Parameterized SQL, input validation, centralized Express error handler
- Idempotent `POST /api/orders` via `Idempotency-Key` header
- Optional Redis cache-aside for dashboard summary
- Optional USD conversion on the dashboard (public FX API; falls back to INR)

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 18, Vite, React Router |
| Backend | Node.js, Express |
| DB | MySQL 8, `mysql2` |
| Cache (optional) | Redis via `ioredis` |

## How to run

### 1. Start MySQL (and Redis if you want the stretch)

```bash
docker compose up -d
```

Or point `.env` at any MySQL 8 instance.

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:init
npm run dev
```

API: http://localhost:4000  
Health: http://localhost:4000/api/health

`.env.example`:

```
PORT=4000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=secret
DB_NAME=order_mgmt
REDIS_URL=           # e.g. redis://127.0.0.1:6379  — leave empty to skip Redis
```

`npm run db:init` runs `scripts/schema.sql` then seeds ~5 customers, 8 products, 30 orders.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

UI: http://localhost:5173  
Vite proxies `/api` to the backend, so no CORS gymnastics in local dev.

## REST API

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/orders` | `page`, `limit`, `status`, `q` (customer name or order id). JOIN for customer name + total |
| GET | `/api/orders/:id` | Order + line items (product name, qty, unit price, line total) |
| POST | `/api/orders` | `{ customerId, items: [{ productId, quantity }] }`. Total computed server-side from current product prices. Send `Idempotency-Key` to make a double POST return the same order |
| PATCH | `/api/orders/:id/status` | `{ status }`. Transition rules enforced |
| GET | `/api/dashboard/summary` | total orders, revenue (excl. cancelled), count by status, top 5 customers by spend. Independent queries run with `Promise.all` |
| GET | `/api/customers` | lookup for the create form |
| GET | `/api/products` | lookup for the create form |

### Status transitions

```
pending    → confirmed | cancelled
confirmed  → shipped   | cancelled
shipped    → delivered | cancelled
delivered  → (terminal)
cancelled  → (terminal)
```

`delivered → pending` is rejected with `409`.

## Promise.all vs sequential

**Parallel (`Promise.all` / `Promise.allSettled`)**

- Backend `GET /api/dashboard/summary`: four independent aggregates have no data dependency, so they run concurrently.
- Frontend Dashboard: summary + recent orders + FX rate are fetched together. `Promise.allSettled` is used so one failure still renders the rest of the page (not a blank screen).

**Sequential (deliberate)**

- `POST /api/orders` is a transaction: validate customer → load product prices → insert order → insert items → store idempotency key. Each step depends on the previous result, so it stays sequential inside one connection.
- Order detail **status update then reload** is sequential: the UI must wait for the PATCH before it can show the new status from `GET /api/orders/:id`.

## Redis stretch (optional)

Enabled only when `REDIS_URL` is set. If Redis is down, the API keeps serving MySQL (cache becomes a no-op).

| Key | TTL | Pattern |
| --- | --- | --- |
| `dashboard:summary` | 45 seconds | cache-aside: read Redis first; on miss query MySQL and `SET EX 45` |

**Invalidation:** `POST /api/orders` and `PATCH /api/orders/:id/status` call `cache.invalidateDashboard()` after a successful write so the summary cannot stay stale. A cache without this write-path delete would be a bug.

The orders list is not cached: it is filtered/paginated/searched, so a single key would either be wrong or explode into many keys. Summary is the expensive, globally-shared payload.

## Tests

```bash
cd backend
npm test
```

Covers status-transition rules (the easy-to-get-wrong part). Full HTTP tests would need a live MySQL; with more time I would add them against a test schema.

## Trade-offs / what I would add with more time

- Auth (this is an internal desk; left open as specified).
- Integration tests against MySQL in CI + a test container.
- Soft inventory / stock checks on create.
- Cursor pagination instead of `LIMIT/OFFSET` if the table grows.
- Structured logging and request ids.
- Deploy backend (Railway/Render) + frontend (Vercel) with a managed MySQL.

Styling is intentionally simple. Correct SQL, async, and error paths were the priority.
