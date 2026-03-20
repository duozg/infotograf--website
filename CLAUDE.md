# Infotograf Website

Marketing and legal website for Infotograf (infotograf.com).
Hosted on Vercel. Plain HTML + CSS, no build step.

## Tech Stack

- Plain HTML5 + CSS3
- No JavaScript framework
- No build step
- Deployed to Vercel via GitHub
- Clean URLs via vercel.json (privacy.html → /privacy)

## Design Language

The website translates the Infotograf iOS app's vintage 2012–2015 Instagram
aesthetic into a 2015-era Apple product marketing page. Key characteristics:

- **Dark-first hero**: Hero sections use the app's dark background (#1c1a1b)
- **Alternating sections**: Dark hero → Light features → Dark philosophy → Dark CTA → Dark footer
- **Thin typography**: -apple-system with font-weight 200-300 for headings (2015 Apple style)
- **Georgia Italic logo**: The "Infotograf" wordmark uses Georgia italic everywhere, matching the iOS app
- **Skeuomorphic gradients**: Nav bar, CTA buttons, and footer use gradients from the iOS app chrome
- **Warm tones**: Backgrounds are warm (brown-blacks, warm off-whites), never blue-blacks or pure white
- **Generous whitespace**: 100px section padding, large hero with centered content

## Color Tokens (from iOS AppTheme.swift)

### Dark Mode (nav, hero, philosophy, footer)

| Token | Hex | Usage |
|---|---|---|
| bg-app-dark | #1c1a1b | Hero background, CTA section |
| bg-card-dark | #2c2a2b | Philosophy section background |
| text-primary-dark | #e8e6e7 | Headings on dark backgrounds |
| text-secondary-dark | #8a8889 | Body text on dark backgrounds |
| text-tertiary-dark | #666565 | Muted text on dark |
| text-link-dark | #6a9fd4 | Links on dark backgrounds |
| border-primary-dark | #484647 | Borders on dark backgrounds |
| header-gradient | #3a5270 → #263d5c | Navigation bar |
| header-border | #1e344e | Nav bar bottom border |
| cta-gradient | #4a82b5 → #2f6499 | CTA buttons |
| cta-border | #245a8e | CTA button border |
| tab-gradient | #393939 → #1a1a1a | Footer gradient |
| tab-border | #555555 | Footer top border |

### Light Mode (features, content pages)

| Token | Hex | Usage |
|---|---|---|
| bg-app-light | #efedee | Features section, content pages |
| bg-card-light | #ffffff | Feature cards, contact card |
| text-primary-light | #333333 | Headings on light backgrounds |
| text-secondary-light | #999999 | Body text on light backgrounds |
| text-tertiary-light | #bbbbbb | Timestamps, muted text |
| text-link-light | #3b6994 | Links on light backgrounds |
| border-primary-light | #d4d4d4 | Card borders, dividers |
| border-secondary-light | #cccccc | Secondary borders |

### Accents (invariant)

| Token | Hex | Usage |
|---|---|---|
| accent-red | #ed4956 | Error states |
| success-green | #4caf50 | Success states |

## Typography

| Element | Font | Size | Weight |
|---|---|---|---|
| Logo (nav) | Georgia, italic | 21px | normal |
| Logo (hero) | Georgia, italic | 72px | normal |
| Section headings | -apple-system | 32-36px | 200 (thin) |
| Subheadings | -apple-system | 17-22px | 200-300 |
| Body text | -apple-system | 15px | 300 |
| Nav links | -apple-system | 13px | 400 |
| CTA button | -apple-system | 14px | 600 |
| Footer text | -apple-system | 12-13px | 400 |

## Corner Radii

| Element | Radius | Source |
|---|---|---|
| CTA buttons | 3px | iOS: RoundedRectangle(cornerRadius: 3) |
| Feature cards | 4px | iOS: avatar/input cornerRadius 4 |

## File Structure

```
infotograf-website/
  index.html       — Home/landing page
  privacy.html     — Privacy policy
  support.html     — Support & FAQ
  fediverse.html   — Fediverse documentary page
  css/
    style.css      — All styles (single file)
  images/          — Screenshots, App Store badge (future)
  CLAUDE.md        — This file
  vercel.json      — Vercel deployment config
```

## Pages

- **/** (index.html): Hero + Features + Philosophy + CTA + Footer
- **/privacy** (privacy.html): Dark header + Privacy policy content + Footer
- **/support** (support.html): Dark header + Contact card + FAQ accordion + Footer
- **/fediverse** (fediverse.html): Documentary-style page on Fediverse implementation (hero + 6 chapters + CTA)

## Key Conventions

- All CSS custom properties defined in :root
- No JavaScript except native HTML behavior (`<details>` for accordions)
- Footer replicates iOS tab bar gradient for visual brand connection
- Nav bar replicates iOS header gradient
- All pages share the same nav and footer
- Sections alternate dark/light backgrounds
- App Store link: replace `href="#"` with real App Store URL when available

## iOS App Reference

The iOS codebase lives at `../noiscut/`. Key files for design reference:
- `noiscut/Core/Theme/AppTheme.swift` — All color tokens
- `noiscut/Core/Theme/ThemeManager.swift` — Theme switching
- `noiscut/HeaderBarView.swift` — Header gradient + logo styling
- `noiscut/TabBarView.swift` — Tab bar gradient (used for footer)
- `noiscut/Features/Auth/LoginView.swift` — Auth screen logo (42pt Georgia Italic)

## App Tagline

"We cut the noise. No algorithm, no reels, no shopping. Just photos, filters, and a chronological feed."
