# Dhanvanthri Design System — Neo-Brutalist Wellness Theme

## Philosophy

The Dhanvanthri mobile UI blends **Neo-Brutalism** with **Clinical Trustworthiness**.

> 90% monochromatic (black + white) / 10% Trust Blue (`#0047AB`)

The high black-to-white contrast enforces visual clarity for elderly recipients using
the app in variable Indian lighting conditions. The single accent colour — Cobalt Blue —
signals safety, authority, and NHS-style medical trust without the visual noise of a
full-spectrum palette.

---

## Tokens at a Glance

| Token | Value | Usage |
|-------|-------|-------|
| `Colors.trustBlue` | `#0047AB` | Primary actions, Active cards, links |
| `Colors.black` | `#000000` | Body text, borders |
| `Colors.white` | `#FFFFFF` | All backgrounds |
| `Colors.alertYellow` | `#FFC107` | Low-stock inventory warnings |
| `Colors.alertRed` | `#D32F2F` | Critical alerts, expired stock |
| `Colors.alertGreen` | `#388E3C` | OK / in-stock states |

---

## Typography

| Style | Font | Purpose |
|-------|------|---------|
| `heading` | PlayfairDisplay-Bold 24 | Doctor names, section headers — trust-establishing serif |
| `subheading` | PlayfairDisplay-Regular 18 | Card titles, modal headings |
| `value` | JetBrainsMono-Regular 16 | Vitals, medication counts, lab values — clinical monospace |
| `valueSmall` | JetBrainsMono-Regular 13 | Compact data tables, timestamps |
| `body` | System 15 | Instructions, descriptive copy |

**Rationale:** Serif for human names and headings builds unconscious trust (echoes print
medical records). Monospace for data values signals precision and avoids digit ambiguity.

---

## Borders & Shadows

- `Borders.standard` — 2 px solid black, `borderRadius: 0` (hard edges = Neo-Brutalist signature).
- `Shadows.card` — 8 px diffuse soft shadow (`shadowRadius: 8`, opacity 0.12) — the one
  concession to softness that prevents the UI from feeling harsh for wellness contexts.

---

## Action Card

`ActionCard` is a pre-composed style block for **critical trigger surfaces**:
- Sticky appointment alerts
- Active medication reminders
- Low-stock pharmacy warnings

It combines the Trust Blue background with white Playfair heading and JetBrains Mono value
for maximum at-a-glance legibility.

---

## Fonts to Register

Add these to your React Native font setup (e.g., `react-native.config.js` or Expo `app.json`):

```json
{
  "fonts": [
    "PlayfairDisplay-Bold.ttf",
    "PlayfairDisplay-Regular.ttf",
    "JetBrainsMono-Regular.ttf"
  ]
}
```

Source via Google Fonts (both families are OFL licensed).

---

## Do / Don't

| ✅ Do | ❌ Don't |
|-------|---------|
| Use `trustBlue` for one primary CTA per screen | Combine trustBlue with other accent colours |
| Use monospace (`value`) for all numeric clinical data | Use `body` font for vitals or lab numbers |
| Keep `borderRadius: 0` on cards | Add rounded corners — it breaks the design language |
| Use alert colours (`alertRed`, `alertYellow`) for status only | Use red/yellow for decorative elements |
