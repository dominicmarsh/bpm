# BPM

Which meetings, people and topics actually stress you out - measured, not guessed.

BPM lines your Garmin heart-rate data up against your calendar and meeting notes, then ranks everything by how hard your body worked.

```
Garmin ───┐
Calendar ─┼─> match on time ──> Claude tags ────> leaderboards
Gmail ────┘   HR, stress,      topic, type,      meetings · people
(Gemini        body battery    sentiment         topics · teams
 notes)
```

Reading it:
- HR elevation - beats above your resting baseline that day
- Stress / Body Battery - Garmin's own scores, before vs after
- Sparkline - trend across recent meetings

Run it:

```bash
npm install
npm run db:push
npm run dev   # localhost:3002
```

Needs a Neon Postgres URL, Google OAuth (calendar + Gmail read), an Anthropic key and your Garmin login. See `.env.example` and `GARMIN_SETUP.md`.

Next.js 14, Prisma, Neon, Recharts. Vercel cron runs the daily sync.
