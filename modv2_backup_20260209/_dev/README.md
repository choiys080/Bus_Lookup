# 🛡️ Modular V2: Architectural Guardrails

This project follows a strict **ES Module (ESM)** architecture designed for maximum maintainability and separation of concerns. Any future modifications or additions MUST adhere to these rules.

## 📁 Directory Structure & Responsibilities

| File / Folder | Responsibility | Rules |
| :--- | :--- | :--- |
| `index.html` | **Structure Only** | No inline styles. No inline `<script>` tags except for the entry point `app.js`. |
| `styles.css` | **Styling** | Use Tailwind OR Vanilla CSS. Keep the design system consistent (colors, spacing). |
| `app.js` | **Orchestration** | The entry point. Handles DOM events and connects UI functions to Data services. No raw Firebase logic. |
| `js/config.js` | **Infrastructure** | Firebase initialization and configuration only. |
| `js/services.js` | **Data Layer** | All Firestore/Firebase operations. Returns pure data objects to the caller. |
| `js/ui.js` | **Rendering Layer** | All `document.getElementById` and `innerHTML` logic. Should be "state-blind" (receives data via arguments). |
| `js/utils.js` | **Helpers** | Pure functions (text parsing, formatting, array manipulation). No side effects or DOM access. |

## 🛠️ Development Rules

1. **Strict ESM**: Always use `import` and `export`. Do not use `window.variableName`.
2. **One Source of Truth**: UI logic must live in `ui.js`. If you need to change a color or text layout, do it there.
3. **Pure Services**: `services.js` should not know about the UI. It should only fetch/save data and return it.
4. **No Junk Drawer**: If a function is a generic helper (like `sanitizePhone`), put it in `utils.js`.
5. **Entry Point Integrity**: `app.js` is the only file that links the DOM events to the business logic.

---

> [!IMPORTANT]
> When adding new features (e.g., "Bus Seating" or "User Profiles"), create a new specialized file in `js/` if the logic is complex, rather than expanding `app.js` beyond its role as an orchestrator.
