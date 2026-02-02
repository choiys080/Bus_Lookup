# **PROJECT BIBLE: Corporate Activity Selection App**

**Version:** 1.0.0 **Status:** Architecture Locked **Target Audience:** AI Agents, Developers

## **1\. Executive Summary & Core Philosophy**

**The Mission:** Build a high-availability PWA (Progressive Web App) for a corporate event. 300+ participants will use this simultaneously to check their tour schedules. **The Constraint:** Failure is not an option. If a user cannot log in because of a typo, the system has failed. **The Logic:** "Phone Number is God." We trust the SIM card, not the user's spelling.

## **2\. Technical Stack (Non-Negotiable)**

* **Frontend:** Next.js 14 (App Router)
* **Styling:** Tailwind CSS \+ Lucide React (Icons)
* **Backend/Database:** Supabase (PostgreSQL)
* **Hosting:** Vercel

## **3\. The "Iron Rules" of Business Logic**

### **Rule A: The "Mongolian Trap" Sanitization**

**Problem:** The CSV contains mixed formats (010-1234-5678 and \+976-9999-0815). **Solution:** You MUST implement a utility function sanitizePhoneNumber(input) that runs on **Data Import** AND **User Login**.
**The Algorithm:**

1. **Strip all non-numeric characters** (remove dashes, spaces, parens).
2. **Check for International Marker (+):**
   * If the *original* input started with \+, PRESERVE the \+ at the start of the cleaned string.
   * *Example:* \+976-9999-0815 → \+97699990815
3. **Handle Korean Mobile (010):**
   * If the cleaned string starts with 010, STRIP the leading 0\.
   * *Example:* 010-1234-5678 → 1012345678
   * *Example:* 01012345678 → 1012345678
4. **Result:** The database stores 1012345678 or \+97699990815. The user is authenticated against *this* string.

### **Rule B: Authentication Strategy**

* **Login Form:** Asks for "Name" and "Phone Number".
* **The Look-up:** Query the database using **ONLY** the sanitized Phone Number.
* **The Name Field:** This is cosmetic. Do NOT use it for the database WHERE clause.
  * *Why?* If HR wrote "Kim Chulsoo" and user types "Kim Chul-soo", a name lookup fails. A phone lookup succeeds.
* **Security:** If the number exists, log them in. If not, error: "Number not found. Please check with the information desk."

## **4\. Database Schema & Data Mapping**

**Table Name:** participants

| CSV Header (Source) | DB Column (Target) | Type | Notes |
| :---- | :---- | :---- | :---- |
| **이름** | name | text | Display only. |
| **부서** | department | text | Display under name. |
| **휴대전화** | phone | text | **UNIQUE KEY.** Must be sanitized (Rule A). |
| **액티비티** | activity\_name | text | The main title of their tour. |
| **출발시간** | start\_time | text | Critical logistics info. |
| **집합장소** | meeting\_point | text | Critical logistics info. |
| **가이드 정보** | guide\_info | text | Nullable. |
| **일정 1** | schedule\_1 | text | Timeline item 1\. |
| **일정 2** | schedule\_2 | text | Timeline item 2\. |
| **일정 3** | schedule\_3 | text | Timeline item 3\. |
| **준비물** | supplies | text | Display in "Notice" box. |
| **주의사항** | notice | text | Display in "Notice" box. |
| *(System)* | checked\_in | bool | Default false. For Admin use. |
| *(System)* | id | uuid | Primary Key. |

## **5\. UI/UX Design System**

### **Colour Palette (Strict)**

* **Primary Brand (BB Green):** \#00A97A
  * *Usage:* Login Buttons, Header Backgrounds, "Active" states.
* **Secondary Brand (BB Violet):** \#9E2AB5
  * *Usage:* Sub-headers, Activity Titles, Accent icons.
* **Backgrounds:** White (\#FFFFFF) or Light Grey (\#F9FAFB).

### **Page Flow**

**1\. Login Screen (/)**

* **Visual:** Clean, centered card. Event Logo at top.
* **Inputs:** Name (Text), Phone (Tel input, auto-format friendly).
* **Action:** Large Button (\#00A97A) labeled "Check My Itinerary".

**2\. Personal Itinerary (/guide/\[id\])**

* **Header:** "Welcome, {name}" (Green bg, white text).
* **Hero Section:** Activity Title ({activity\_name}) in Violet.
  * *Note:* Use a generic placeholder icon (e.g., Lucide MapPin or Bus) unless images are provided later.
* **Logistics Card:**
  * **Time:** {start\_time} (Bold, Large).
  * **Location:** {meeting\_point}.
* **Timeline:** Vertical list of {schedule\_1} → {schedule\_2} → {schedule\_3}.
* **Notice Box:** Yellow/Warning styled box containing {supplies} and {notice}.

**3\. Admin Dashboard (/admin)**

* **Access:** Hidden URL or Footer link.
* **Capabilities:**
  * **Search:** Filter list by Name or Phone (Last 4 digits).
  * **Edit:** Click a user → Modal opens → Edit activity\_name or meeting\_point → Save. (Real-time DB update).
  * **Stats:** Simple count: "Total: 150 / Checked-in: 110".

## **6\. Development Checklist for AI Agent**

1. \[ \] **Setup Supabase:** Create table participants with RLS (Read: Public, Write: Admin).
2. \[ \] **Utility Function:** Write sanitizePhoneNumber.ts immediately. Test with \+976 and 010\.
3. \[ \] **Import Script:** Create a script/page to parse the provided CSV and upload to Supabase using the sanitization logic.
4. \[ \] **Frontend Components:** Build LoginForm, ItineraryCard, AdminTable.
5. \[ \] **Deploy:** Vercel push.

**End of Directive.**
