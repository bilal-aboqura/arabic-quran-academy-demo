# Arabic & Quran Academy Demo

Standalone sales demo website for **Arabic & Quran Academy**, a premium English-first online academy concept for international students. It is published separately from NexaClass and can be shown to a teacher as a ready-made academy website.

## Preview

- Live demo: https://arabic-quran-academy-demo.vercel.app/
- GitHub: https://github.com/bilal-aboqura/arabic-quran-academy-demo

## What is included

- English-first landing page with visible `EN | العربية` switcher and RTL Arabic copy
- Hero composition with teacher/student online lesson imagery
- Four program pages: Arabic for Beginners, Quran Reading, Tajweed, and Quran Memorization
- Course cards and detail pages with verified Unsplash educational stock imagery
- Ustadha Maryam demo teacher profile with replaceable bio and languages
- Student feedback section clearly labeled `SAMPLE STUDENT FEEDBACK · DEMO`
- Trial lesson CTA that stays unconfigured until academy contact details are supplied
- Mobile layouts checked at 375, 390, 430, 768, 1024, and 1440px
- Static public routes only; no database or authentication is required for this sales preview

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. The public routes are `/`, `/courses`, `/courses/arabic-beginners`, `/courses/quran-reading`, `/courses/tajweed`, `/courses/quran-memorization`, and `/login`.

## Demo content policy

All teacher, course, learner, and testimonial details are replaceable preview content. The learner quotes are illustrative samples, not verified business claims or private student records. Course and testimonial photos use Unsplash stock imagery and should be replaced or licensed according to the final academy's needs before launch.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The standalone test command runs the template smoke test; backend-only tests from the source SaaS are intentionally excluded because this repo is a static sales demo.
