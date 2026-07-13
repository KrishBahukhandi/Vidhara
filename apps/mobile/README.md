# @nexlex/mobile

The NexLex Android app (primary product surface) — Expo / React Native, expo-router, tokens from `@nexlex/tokens`.

```bash
# from repo root
pnpm install
cp ../../.env.example .env   # then fill EXPO_PUBLIC_* values (see root .env.example)
pnpm dev:app                 # Expo dev server → press `a` for Android
```

Builds ship via EAS (`eas.json`): `development` (dev client APK) → `preview` (internal APK) → `production` (Play AAB).

Conventions: docs/rules.md governs. Feature logic in `src/features/*`, UI primitives in `src/components/ui/`, all colors/spacing via `@/theme` (never hardcoded).
