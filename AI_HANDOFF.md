# AI Session Handoff - 2026-02-23

## Context

We have updated the global agent rules in `GEMINI.md` to ensure better context awareness and tool discovery. We also generated a new QR code for the V2 itinerary portal using local tools and specific branding.

## What Changed

- **Global Rules**: Updated `C:\Users\choiys\.gemini\GEMINI.md` with mandatory startup research (reading Blueprint, Memory, and Handoff) and mandatory tool discovery (`pip list`, `npm list`, `scripts/`).
- **QR Code Generation**: Generated `itinerary_v2_qr.png` for `https://bbraun-itinerary-v2.pages.dev` using the local python `qrcode` package and `Pillow`.
- **Branding**: Established **#00A97A** (RGB 0, 169, 122) as the primary green for QR codes and branding elements.
- **Dependencies**: Installed `Pillow` in the local python environment to support image-based QR generation.

## Current State

- **Official QR Color**: #00A97A.
- **Active QR File**: `itinerary_v2_qr.png` (points to `bbraun-itinerary-v2.pages.dev`).
- **Required Packages**: `qrcode`, `Pillow` (Python); `playwright` (Node).

## Next Steps for Next Agent

1. **Rule Adherence**: Always read `AI_HANDOFF.md`, `Project Blueprint.md`, and `Bus_Lookup_Project_Memory.md` at the start of every session.
2. **Local Tooling**: Check `scripts/` and existing python/node dependencies before adding new ones or using external APIs.
3. **QR Sync**: Ensure any new QR codes generated follow the #00A97A color standard.

## Critical Files

- [GEMINI.md](file:///C:/Users/choiys/.gemini/GEMINI.md) (Global Agent Rules)
- [Project Blueprint.md](file:///d:/Antigravity/Bus_Lookup/Project%20Blueprint.md) (Architecture & Stack)
- [Bus_Lookup_Project_Memory.md](file:///d:/Antigravity/Bus_Lookup/Bus_Lookup_Project_Memory.md) (Deployment & Domain History)
- [itinerary_v2_qr.png](file:///d:/Antigravity/Bus_Lookup/itinerary_v2_qr.png) (Latest Branded QR)
