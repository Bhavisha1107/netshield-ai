# NetShield AI — Frontend (Next.js)

Login page + live traffic monitoring dashboard, wired to the FastAPI backend.

## 1. Prerequisites
- Node.js 18+ installed
- The backend must already be running at `http://localhost:8000` (see `netshield-backend/README.md`)

## 2. Install dependencies
```bash
npm install
```

## 3. Configure the API URL
```bash
copy .env.local.example .env.local
```
Default value already points to `http://localhost:8000` — only change this if your backend runs elsewhere.

## 4. Run the dev server
```bash
npm run dev
```
Open **http://localhost:3000**

## What you'll see
1. **Login page** (`/login`) — sign up (first account becomes admin) or sign in
2. **Dashboard** (`/dashboard`) — auto-redirects here after login:
   - Stat cards: total packets, % anomalous, benign count
   - Bar chart: top protocols by volume
   - Doughnut chart: benign vs anomalous ratio
   - Live traffic table: auto-refreshes every 8 seconds, pulling from `/traffic/recent`

## Design notes
Dark SOC-monitor aesthetic (deep slate background, monospace data columns, teal = benign / amber = anomaly) — matches how real security operations dashboards are built for long monitoring sessions, not a generic light theme.

## Project structure
```
netshield-frontend/
├── app/
│   ├── layout.tsx           # Root layout, font/theme setup
│   ├── page.tsx              # Redirects to /login or /dashboard
│   ├── globals.css           # Design tokens, base styles
│   ├── login/page.tsx        # Sign in / sign up form
│   └── dashboard/page.tsx    # Main monitoring dashboard
├── lib/
│   └── api.ts                 # Axios client + JWT token handling
├── tailwind.config.js         # Color/type design tokens
└── .env.local.example
```
