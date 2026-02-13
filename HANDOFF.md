# Project Handoff Guide: Bus Lookup & Activity Portal

This guide provides the next AI agent with everything needed to maintain and iterate on the B. Braun Bus Lookup application.

## 📁 Project Structure (Sources in `/modv2`)

- **`modv2/index.html`**: Main UI structure. Uses Tailwind CDN and Lucide icons.
- **`modv2/app.js`**: Core logic (Firebase Auth, Firestore, Background Image Loading).
- **`modv2/styles.css`**: Design tokens and custom glassmorphism styles.
- **`modv2/bg_optimized.jpg`**: **CRITICAL** - Memory-safe background image (2000px).
- **`wrangler.toml`**: Cloudflare Pages configuration.
- **`optimize_bg.py`**: Python script used for image optimization (backup reference).

## 📝 Change Log (Optimization Phase)

1. **Memory Optimization**: Fixed OOM crashes on mobile by resizing the background from 132MP to 2MP.
2. **Code Syntax Fix**: Resolved nested function declaration in `initAuth` within `app.js`.
3. **Visual Restoration**: Re-enabled `backdrop-filter: blur(12px)` and restored decorative elements previously hidden during memory crisis.
4. **Scrolling Update**: Enabled vertical scrolling while keeping the background image `fixed`.
5. **Deployment Pivot**: Moved from credit-exhausted Netlify to **Cloudflare Pages**.

## 🚀 Deployment Workflow

**Command**: `npx wrangler pages deploy modv2 --project-name bbraun-itinerary-v2 --branch main`

- **Environment**: Production.
- **Live URL**: [https://bbraun-itinerary-v2.pages.dev](https://bbraun-itinerary-v2.pages.dev)
- **Preview URL**: Accessible via `npx wrangler pages deployment list`.

## ⚠️ Critical Constraints

- **Memory Safety**: Do NOT use images exceeding 2500px on the longest side. Mobile memory limits are strict.
- **CSS Hierarchy**: Use `!important` sparingly but note that some global styles (like `body::before`) use it to override Tailwind defaults for the glassmorphism effect.
- **Firebase**: The app relies on `signInAnonymously()` for data fetch. Ensure Firebase config in `index.html` remains intact.

## 🛠️ Troubleshooting for the Next Agent

- If the background doesn't show: Check `app.js` background loading logic and ensure `bg_optimized.jpg` exists in the deployed folder.
- If scrolling breaks: Verify `index.html` for `overflow-hidden` classes on the `#app` or `body`.
