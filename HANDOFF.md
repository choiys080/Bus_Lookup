# Handoff Guide: Activity Check-In Portal

This guide provides instructions for setting up and deploying the Activity Check-In Portal.

## 1. Prerequisites

- **Node.js**: Required to run the local development server.
- **Firebase Account**: Required for data storage and authentication.

## 2. Firebase Setup

The application uses Firebase Firestore for data storage and Firebase Auth for admin access.

### Step-by-Step Configuration

1. **Create a Firebase Project**: Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. **Enable Firestore**:
    - Select "Firestore Database" in the left menu.
    - Click "Create database" and choose "Production mode".
3. **Enable Authentication**:
    - Select "Authentication" -> "Get Started".
    - Enable the "Email/Password" provider.
    - Add an admin user (e.g., `admin@yourcompany.com`).
4. **Get SDK Keys**:
    - Go to "Project settings" (gear icon).
    - Under "Your apps", add a new "Web app".
    - Copy the `firebaseConfig` code block from the "SDK setup and configuration" section.

## 3. Launch & Configuration (GUI)

1. **Start the Server**:

    ```bash
    npm run dev
    ```

2. **Open in Browser**: Navigate to `http://localhost:3000`.
3. **Setup Wizard**: You will be automatically greeted by the "System Setup" screen.
4. **Paste Configuration**:
    - Paste the Firebase code block you copied into the "Firebase SDK Snippet" box.
    - Type a name for your event in the "Event Identifier" box (e.g., `event-2026`).
5. **Save**: Click "Initialize System". The app will reload and be ready to use!

## 4. Running the Application

From the project root directory, run:

```bash
npm install
npm run dev
```

The application will be available at `http://localhost:3000`.

## 5. Admin Dashboard & Data Import

1. Access the Admin Dashboard by clicking the settings icon on the landing page.
2. Login with your Firebase credentials.
3. Use the "Upload New Participants" button to import your `participants_data.csv`.
4. The system will automatically sync the data to your Firestore instance.

## 6. Backup System

The project includes a PowerShell-based backup system.

- `npm run backup`: Create a manual snapshot of current files.
- `npm run backup:watch`: Automatically create backups whenever files are saved.

---
*Developed for B. Braun Korea Activity Portal*
