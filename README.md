# Quiet Journal

A calm, local-first way to keep a few goals and their meaningful checkpoints in view.

Quiet Journal is deliberately not a task manager. It has no accounts, cloud sync, deadlines, streaks, or overdue states. Your journal is stored in this browser on this device. Use **Settings → Export backup** to save a private JSON copy, and **Import backup** to restore it later.

## Run locally

```bash
npm ci
npm run dev
```

## Checks

```bash
npm run check:runtime
npm run build
npm run test:runtime
npm run test:sites
```

## Publishing

The included GitHub Actions workflow publishes the static app to GitHub Pages whenever `main` is updated. It builds with the `/quiet-journal/` project path used by the public Pages site.
