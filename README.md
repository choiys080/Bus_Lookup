# Bus Lookup System

A cloud-synced self-service portal for event participants to find their bus assignments.

## Quick Start

1. Open `index.html` in a browser
2. Double-click the footer text ("Secure Cloud Portal v4.1") to access Admin mode
3. Upload a CSV file with participant data
4. Participants can now look up their bus assignments

## CSV Format

See `participants_template.csv` for the required format:

| Column | Description |
|--------|-------------|
| Name | Full name (e.g., "John Doe") |
| Phone | Digits only, no dashes (e.g., "01012345678") |
| Affiliation | Company/Organization |
| Bus_Assignment | Bus and gate info |
| Departure_Time | Departure time |

## Deployment (GitHub Pages)

1. Create a GitHub repository named `bus-lookup`
2. Push this code to the repository
3. Go to Settings → Pages → Enable from `main` branch
4. Your site will be live at: `https://yourusername.github.io/bus-lookup`
5. Generate a QR code for this URL

## Firebase Setup (Required for Cloud Sync)

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Anonymous Authentication
3. Create a Firestore database
4. Replace the `firebaseConfig` object in `index.html` with your project config

## Event Day Guide

1. Navigate to the live URL
2. Double-click footer → Access Admin mode
3. Upload the final participant CSV
4. When "Cloud Synced!" appears, the system is live for all users
