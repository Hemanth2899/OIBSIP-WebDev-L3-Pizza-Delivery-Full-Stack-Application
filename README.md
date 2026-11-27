# Oasis Pizza - MERN pizza ordering and inventory platform

React (Vite) + Node/Express + MongoDB + Razorpay (test mode).

## What is included

**Customers**
- Registration with email verification, JWT login, forgot/reset password by email link
- Dashboard with ready-made pizzas and live order tracking (polls every 5 s)
- Pizza builder: base (5) > sauce (5) > cheese (4) > vegetables (multi-select) with a live preview
- Order summary (server-priced, stock-checked) and Razorpay checkout

**Admin**
- Separate login at `/admin/login`. Admin accounts are created only by the seed script; registration can only create customers
- Inventory dashboard (bases, sauces, cheeses, vegetables) with editable stock, alert threshold and price
- Stock is decremented automatically once a payment is verified
- `node-cron` job emails the admin when any item falls below its threshold (default: checks every 30 min, re-alerts after 24 h, resets when restocked)
- Order panel: change status (Order Received > In Kitchen > Sent to Delivery); users see it within 5 s

## Setup

Requirements: Node 18+, MongoDB (local or Atlas).

```bash
# 1. API
cd server
npm install
cp .env.example .env      # then edit values (see below)
npm run seed              # creates admin, inventory, sample pizzas
npm run dev               # http://localhost:5000

# 2. Client (new terminal)
cd client
npm install
npm run dev               # http://localhost:5173
```

### Configure `server/.env`
| Variable | Notes |
|---|---|
| `MONGO_URI` | e.g. `mongodb://127.0.0.1:27017/oasis-pizza` |
| `JWT_SECRET` | any long random string |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | admin login created by `npm run seed`; also where low-stock emails go |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay Dashboard > switch to **Test mode** > Settings > API Keys |
| `SMTP_*` | For Gmail: host `smtp.gmail.com`, port `587`, user = your address, pass = an **App Password**. If `SMTP_HOST` is empty, emails (verification links, reset links, stock alerts) are printed in the server console instead, so you can develop without SMTP |
| `STOCK_CHECK_CRON` | cron expression, default `*/30 * * * *`. Use `* * * * *` while testing |

## Try it end to end
1. Open http://localhost:5173/register, sign up. Click the verification link (from your inbox, or copy it from the server console), then sign in.
2. Build a pizza (or add one from the menu), open the cart, press **Pay with Razorpay**.
3. In the test checkout choose **Netbanking** (or Wallet) and click **Success** on the mock bank page. Cards: use Razorpay's test card numbers from their docs.
4. Go to http://localhost:5173/admin/login, sign in with the seeded admin. Open **Orders** and change the status. The customer's dashboard updates within 5 seconds.
5. In **Inventory**, set a bases "Alert below" value above its stock and press **Run low-stock check now** (or wait for the cron). The admin email arrives.

## API overview
| Route | Access |
|---|---|
| `POST /api/auth/register, /verify-email, /resend-verification, /login, /forgot-password, /reset-password`; `GET /api/auth/me` | public / user |
| `GET /api/menu/ingredients`, `GET /api/menu/pizzas` | signed in |
| `POST /api/orders/quote, /create, /verify`; `GET /api/orders/mine` | customer |
| `POST /api/admin/login` | public |
| `GET/PATCH /api/admin/inventory`, `POST /api/admin/stock-check`, `GET /api/admin/orders`, `PATCH /api/admin/orders/:id/status` | admin only |

## Design notes
- Prices are always computed on the server from the database; the client never sends a price.
- Payment is confirmed only after the Razorpay HMAC signature is verified server-side. The paid transition is atomic, so stock is deducted exactly once even if verify is called twice.
- Verification/reset tokens are stored hashed. Login errors do not reveal which emails exist.
- Auth routes are rate-limited; Helmet and CORS (limited to `CLIENT_URL`) are enabled.

## Deploying
Build the client with `npm run build` and serve `client/dist` from any static host. Set `VITE_API_URL` to the API URL at build time and `CLIENT_URL` on the server to the site's origin. Use HTTPS and real SMTP in production.
