# RCB Ticket Alert — Server Deploy Guide

Runs 24/7 on Render's free tier. Checks the RCB shop every 5 minutes and
emails you the moment tickets go live — even when your laptop is off.

---

## Step 1 — Push to GitHub

1. Go to https://github.com/new and create a **new repository** (e.g. `rcb-alert`)
2. On your machine, open a terminal in this folder and run:

```bash
git init
git add .
git commit -m "initial"
git remote add origin https://github.com/YOUR_USERNAME/rcb-alert.git
git push -u origin main
```

---

## Step 2 — Deploy on Render (free)

1. Go to https://render.com and sign up / log in (free account)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account and select the `rcb-alert` repo
4. Fill in:
   - **Name:** rcb-alert (anything)
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. Click **"Add Environment Variable"** and add these one by one:

| Key                  | Value                        |
|----------------------|------------------------------|
| `EMAIL_TO`           | your email address           |
| `EMAILJS_SERVICE`    | your EmailJS Service ID      |
| `EMAILJS_TEMPLATE`   | your EmailJS Template ID     |
| `EMAILJS_PUBKEY`     | your EmailJS Public Key      |
| `CHECK_INTERVAL_MIN` | `5` (or `2` for faster)      |

6. Click **"Create Web Service"**

Render will build and deploy it. Done — it now runs 24/7.

---

## Step 3 — Verify it's working

- In Render, click your service → **"Logs"** tab
- You should see lines like:
  ```
  [21/4/2026, 7:30:00 pm]  🚀 RCB Ticket Alert started — checking every 5 min
  [21/4/2026, 7:30:01 pm]  RCB vs GT — not live yet (no ticket-UI keywords found)
  ```
- Every 5 minutes it will log a new check
- When tickets go live you'll see:
  ```
  🎟️  TICKETS LIVE for RCB vs GT!
  ✅ Email sent to you@example.com
  ```

---

## Notes

- Render free tier **spins down after 15 min of inactivity** — but the HTTP
  server in the script keeps it alive by responding to Render's health checks.
- If you want guaranteed uptime, upgrade to Render's $7/mo Starter tier or
  use Railway which has a more generous free tier.
- Your EmailJS template needs these variables:
  `{{to_email}}`, `{{match_name}}`, `{{match_date}}`, `{{venue}}`, `{{ticket_url}}`
