# Hourly Wallet

A local-first mobile app for hourly workers. Clock in and out, track lunches and breaks, estimate weekly and monthly take-home pay, manage bills and subscriptions, and see whether you're on track to afford your month.

No sign-up, no backend, no cloud. All data lives in SQLite on your device.

## Getting started

```bash
npm install
npx expo start
```

Then press `a` to open the app in an Android emulator, or scan the QR code with Expo Go.

## Features

- **Clock** — Clock in/out, lunches, breaks, live shift timer, manual shift entry, edit/delete with confirmation, and per-shift pay snapshots so rate changes never rewrite history.
- **Bills** — Recurring bills and subscriptions (weekly/biweekly/monthly/yearly/one-time), autopay processing on app open/foreground/date change, optional local reminders, filters, paid/unpaid toggles.
- **Dashboard** — Active shift status, today's/this week's hours, estimated gross/net pay, monthly affordability status ("on track" / "close" / "shortfall"), bills due today/this week/overdue.
- **Reports** — Hours per day, gross/net/taxes, overtime, bills paid vs unpaid, bills by category, net income after bills, with week/month period filters.
- **Settings** — Hourly rate, overtime rules, tax withholding, default lunch/break behavior, pay period, theme, haptics, JSON export/import, and full data reset.

All pay numbers are estimates based on your hourly rate, weekly overtime rules, and a flat withholding percentage.

## Tech stack

- Expo SDK 57 / React Native / TypeScript
- Expo Router (bottom tabs)
- expo-sqlite (versioned migrations, no ORM)
- Zustand for lightweight app state
- date-fns, Zod, lucide-react-native
- expo-haptics, expo-notifications (optional reminders only)

## Project layout

```txt
src/
  app/            Expo Router routes (tabs, onboarding)
  components/     UI building blocks + feature components
  db/             SQLite database, schema, migrations, queries
  features/       Services and hooks (clock, bills, settings, reports)
  lib/            Pure calculation utilities, dates, money, types
  state/          Zustand store
  theme/          Colors, spacing, typography tokens
```

## Scripts

- `npm start` — start the Expo dev server
- `npm run android` — start and open on Android
- `npm run lint` — ESLint
- `npx tsc --noEmit` — typecheck
