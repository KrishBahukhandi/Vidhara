# NexLex — Design System

> **Status**: Living document · **Version**: 0.2.0 · **Last updated**: 2026-07-13
> Every UI decision must trace back to this document. When UI changes, update this first or alongside.

---

## 1. Design Philosophy

**"A quiet library with a sharp mind."**

1. **Reading is the product.** Most user-minutes are spent reading statutory text. Typography and reading ergonomics outrank decoration everywhere.
2. **Authority through restraint.** Legal tools earn trust with calm, precise, consistent surfaces — no gradients-for-drama, no gamified confetti in serious contexts. Warmth comes from craft, not noise.
3. **Speed is a design feature.** Every interaction should feel instant; skeletons and optimistic UI over spinners.
4. **India-first ergonomics.** Design for a ₹12K Android phone in sunlight on 4G: high contrast, generous touch targets, low bundle weight, graceful offline.
5. **AI is a colleague, not an oracle.** AI surfaces always show grounding (citations), state uncertainty, and offer escape hatches to primary sources.

## 2. Color Palette

Design tokens are defined once in `packages/tokens` (`tokens.cjs`), consumed as a typed theme module in the app and as a Tailwind preset + CSS variables on the web. **Never hardcode hex values in components — either platform.**

### 2.1 Brand
| Token | Light | Dark | Use |
|---|---|---|---|
| `--brand` | `#1E3A5F` (deep judicial blue) | `#7FA6D9` | Primary actions, links, active states |
| `--brand-strong` | `#152C4A` | `#9DBCE6` | Hover/pressed |
| `--accent` | `#B8860B` (subdued brass) | `#D9A93F` | Highlights, premium markers, focus rings on brand surfaces |
| `--on-brand` | `#FFFFFF` | `#121417` | Text/icons on brand fills (dark-mode brand is light — never hardcode white) |

Brass/gold is used *sparingly* — premium badges, key highlights — never as large fills.

### 2.2 Neutrals (surface & text)
| Token | Light | Dark |
|---|---|---|
| `--bg` | `#FAFAF7` (warm paper) | `#121417` |
| `--surface` | `#FFFFFF` | `#1A1D21` |
| `--surface-raised` | `#FFFFFF` + shadow | `#22262B` |
| `--border` | `#E4E2DC` | `#2E3338` |
| `--text` | `#1C1E21` | `#E8E6E1` |
| `--text-muted` | `#5B5F66` | `#9BA0A6` |
| `--text-faint` | `#8A8E94` | `#6B7076` |

Reading background is deliberately warm-paper, not pure white; dark mode is charcoal, not black (OLED-black variant is a future toggle).

### 2.3 Semantic
| Token | Light | Dark | Use |
|---|---|---|---|
| `--success` | `#1E7F4F` | `#4CC38A` | Saved, synced, correct answers |
| `--warning` | `#B45309` | `#F5A623` | Quota nearing, unreviewed content |
| `--danger` | `#B3261E` | `#F2726F` | Errors, destructive actions |
| `--info` | `#0B6E99` | `#5FB6DD` | Tips, neutral notices |

### 2.4 Mapping change-type colors (domain-specific)
| Change type | Token | Hue |
|---|---|---|
| identical/renumbered | `--map-same` | neutral blue |
| modified/expanded | `--map-changed` | amber |
| new | `--map-new` | green |
| omitted | `--map-omitted` | red, struck-through label |

Contrast: all text/background pairs must meet **WCAG 2.1 AA** (4.5:1 body, 3:1 large text) in both themes — verified in CI story tests eventually, manually until then.

## 3. Typography

| Role | Font | Notes |
|---|---|---|
| Statute/reading text | **Source Serif 4** (variable) | Serif for long-form legal text; excellent Devanagari companion planned (Noto Serif Devanagari) |
| UI text | **Inter** (variable) | Labels, navigation, buttons, forms |
| Mono (section nos., citations, code) | **JetBrains Mono** | Sparse use |

### Scale (rem, 1rem = 16px)
| Token | Size/Line | Use |
|---|---|---|
| `display` | 2.25/1.15 | Marketing hero only |
| `h1` | 1.75/1.25 | Page titles |
| `h2` | 1.375/1.3 | Section headers |
| `h3` | 1.125/1.4 | Card titles |
| `body-lg` | 1.125/1.75 | **Statute reading text** (default reader size) |
| `body` | 1.0/1.6 | UI default |
| `small` | 0.875/1.5 | Meta, captions |
| `micro` | 0.75/1.4 | Badges, timestamps |

Reader offers user-adjustable text size (4 steps, persisted). Max reading measure: **68ch**. Statute text is never justified (ragged right; justified text rivers hurt low-end rendering).

## 4. Spacing, Grid, Radius, Elevation

- **Spacing scale**: 4px base — `4, 8, 12, 16, 20, 24, 32, 40, 48, 64` (Tailwind default maps cleanly). No arbitrary values in components.
- **Grid**: content pages max-width `72rem`; reader column max `68ch` centered; 12-col grid only on dashboard/marketing.
- **Radius**: `--radius-sm 6px` (inputs, chips), `--radius-md 10px` (cards, buttons), `--radius-lg 16px` (modals, sheets). Never fully-round rectangles except pills/avatars.
- **Elevation**: 3 levels only — flat (borders), raised (`shadow-sm`), overlay (`shadow-lg` + scrim). Dark mode uses surface lightening instead of shadows.

## 5. Platform & Responsive Rules

**The Android app (Expo/React Native) is the primary surface.** Design every feature for the app first at a 360dp-width baseline; touch targets ≥ 44×44dp; respect Android conventions: system back (button/gesture) always navigates predictably and closes sheets/modals first, safe-area insets honored, native share sheet for sharing sections.

Both renderers consume the same `packages/tokens`: the app through a typed theme module (`useTheme()` + RN StyleSheet, ADR-11), the web through the shared Tailwind preset + generated CSS variables — colors, spacing, radii, and type scale are identical by construction.

Web breakpoints (`apps/web` — marketing, SEO content pages, later full web app):

| Breakpoint | Width | Behavior |
|---|---|---|
| `base` | <640 | Single column; bottom tab bar (5 slots); sheets over modals |
| `sm` | ≥640 | Wider gutters |
| `md` | ≥768 | Sidebar navigation appears; reader gains margin notes column |
| `lg` | ≥1024 | Split views (mapping side-by-side, tutor beside reader) |
| `xl` | ≥1280 | Max content width caps |

## 6. Components

Built on shadcn/ui primitives, customized via tokens. Canonical variants:

### Buttons
- Variants: `primary` (brand fill), `secondary` (surface + border), `ghost`, `destructive`, `link`.
- Sizes: `sm 32px`, `md 40px`, `lg 48px` height. Icon buttons square, labeled via `aria-label`.
- Loading state: spinner replaces label, width locked (no layout shift). Disabled ≠ hidden — show why via tooltip/helper text where relevant.

### Cards
- `Card` (flat, bordered) default; `CardRaised` for dashboard stats.
- Section cards in lists: section number (mono, muted) + marginal note (serif, semibold) + act badge + 2-line body preview.

### Forms
- Labels always visible above inputs (no placeholder-as-label). Inline validation on blur, summary on submit. Error text below field in `--danger` with icon. All inputs 40px+ height. OTP input: 6 boxed digits, auto-advance.

### Navigation
- App (and mobile web): bottom tab bar — **Library · Mapping · Tutor · Notes · Profile**.
- App: global search reachable from a persistent search affordance in Library + Mapping headers; deep links (`nexlex://acts/bns/103`) for every section.
- Desktop web: left sidebar, collapsible; global search (`⌘K` / `/`) command palette.
- Breadcrumbs in reader: Act → Chapter → Section.

### Icons
- **Lucide** icon set only, 1.5px stroke, 20px default (24px in tab bar). No mixed icon families. Legal-specific glyphs (scales, gavel, pillar) drawn as custom Lucide-style additions in `components/ui/icons/`.

### Domain components (to be specced per phase)
- `SectionReader`, `MappingChip` (inline old⇄new pill), `MappingComparator` (side-by-side), `CitationLink` (AI answer → section deep link), `QuotaMeter`, `StreakBadge`, `AiMessage` (with citation footer + feedback buttons + "verify in library" affordance).

## 7. Motion & Animation Principles

- Purpose only: orientation (page transitions ≤ 200ms), feedback (press states 100ms), continuity (shared-element on reader navigation where cheap).
- Easing `cubic-bezier(0.2, 0, 0, 1)`; durations 100/150/200/300ms tokens.
- AI streaming: token-by-token text; subtle caret; **no** typing-dots theatre.
- Respect `prefers-reduced-motion`: all non-essential motion disabled.
- Never animate layout of reading text.

## 8. Accessibility

- WCAG 2.1 AA baseline. Full keyboard operability; visible focus ring (`--accent`, 2px offset).
- Semantic HTML first (nav/main/article for statutes — screen readers get real document structure).
- All interactive elements labeled; icon-only buttons require `aria-label`.
- Reader: adjustable text size, line-height ≥ 1.7 for statute text, no text in images.
- AI chat: streamed content announced politely (`aria-live="polite"`), citations navigable by keyboard.
- Color never the sole signal (mapping change-types get icons + labels, not just hue).
- Hindi/regional readiness: no baked-in text in images; layouts tolerate 30% string expansion.

## 9. Dark & Light Themes

- Both themes ship from day one; system-default with manual override (persisted per user).
- Implementation: CSS variables swapped via `data-theme` on `<html>`; no `dark:` class sprawl for colors — components reference semantic tokens only.
- Dark theme is a first-class reading mode (night study is a core use case): reduced pure-white text (`#E8E6E1`), dimmed images, same contrast guarantees.

## 10. Illustration & Imagery Style

- Style: minimal line illustrations, 2px stroke, brand-blue + brass on paper backgrounds; motifs from Indian legal iconography (pillar of Ashoka abstracted, scales, court architecture) — dignified, never cartoon-gavel clipart.
- Used only in: empty states, onboarding, marketing, error pages. Never inside the reader.
- Photography: none in-app (marketing may use it).

## 11. UI States (mandatory for every feature)

Every screen/component ships all four states — reviewed in PR:

### Empty states
- Illustration (small) + one-line headline + one-line guidance + primary action.
- e.g., Notes empty: "Your notebook is empty — Save your first note from any section you're reading." + [Browse Acts].

### Loading states
- Skeletons mirroring real layout (reader: heading bar + text lines). Spinners only for sub-200ms unknowns and button-internal loading. Streaming for AI.

### Error states
- Human, specific, actionable: what happened + what to do + retry affordance. Offline distinguished from server error ("You're offline — showing saved copy" banner pattern). Never raw error codes to users; error ID shown small for support.

### Partial/degraded
- AI unavailable → tutor input disabled with notice + library still fully usable (content never held hostage by AI outages).

## 12. Voice & Microcopy

- Tone: precise, warm, plain-English (Indian English conventions); no legalese in UI chrome, full legalese fidelity in content.
- AI disclaimers: persistent, single-line, non-scary: "NexLex explains law for learning — it isn't legal advice."
- Numbers/format: Indian numbering (1,00,000), DD Mon YYYY dates, ₹ symbol.

---

*Change log*
- 2026-07-13 · v0.2.1 · Token consumption updated per ADR-11: app uses typed theme module (RN StyleSheet); NativeWind references removed.
- 2026-07-13 · v0.2.0 · Android-first pivot: tokens single-sourced in `packages/tokens`; §5 reframed around the native app (Android back, safe areas, deep links); navigation split app vs desktop web.
- 2026-07-13 · v0.1.0 · Initial design system defined (pre-implementation).
