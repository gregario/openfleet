# OpenFleet

Fleet management that doesn't charge you per van.

Built with [The Rouge](https://github.com/gregario/the-rouge) — an autonomous AI product factory.

## Features

- **GPS Tracking** — real-time vehicle location, trip history with polyline maps
- **Maintenance Scheduling** — mileage and time-based service alerts, cost tracking
- **Driver Management** — licence expiry tracking, privacy controls, GDPR compliance
- **Automated Alerts** — overdue maintenance, expired licences, stale vehicle tracking

## Tech Stack

- **Frontend:** Next.js 14 App Router, React 19, TypeScript, Tailwind CSS
- **Backend:** Cloudflare Workers (edge compute), Supabase (database + auth)
- **Maps:** MapLibre GL for trip visualization
- **Deployment:** Cloudflare Workers + Supabase

## Setup

```bash
git clone https://github.com/gregario/openfleet.git
cd openfleet
npm install
cp .env.example .env
# Fill in your Supabase credentials in .env
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Environment Variables

See `.env.example` for required configuration. You'll need:
- Supabase project (database + auth)
- Cloudflare Workers account (for deployment)

## License

MIT
