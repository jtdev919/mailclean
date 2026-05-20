# MailClean

Clean up your Gmail inbox in seconds. Remove spam, junk, and unwanted emails with a simple web interface.

## Features

- **Bulk Delete by Sender** — See who sends you the most email and delete all their messages at once
- **Quick Cleanup** — One-click removal of promotions, social notifications, old updates, and spam
- **Safe** — Emails are moved to trash (not permanently deleted), so you can recover if needed

## Setup

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the **Gmail API** under APIs & Services > Library
4. Go to APIs & Services > Credentials
5. Click **Create Credentials > OAuth 2.0 Client ID**
6. Set application type to **Web application**
7. Add `http://localhost:3000` to **Authorized JavaScript origins**
8. Add `http://localhost:3000/api/auth/callback/google` to **Authorized redirect URIs**
9. Copy the Client ID and Client Secret

### 2. Configure Environment

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Google OAuth credentials and a random secret.

### 3. Run the App

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with Google.

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the project on [Vercel](https://vercel.com)
3. Add your environment variables in the Vercel dashboard
4. Update the Google OAuth redirect URI to `https://your-domain.vercel.app/api/auth/callback/google`
5. Set `NEXTAUTH_URL` to your production URL

## Tech Stack

- [Next.js](https://nextjs.org/) — React framework
- [NextAuth.js](https://next-auth.js.org/) — Authentication
- [Gmail API](https://developers.google.com/gmail/api) — Email access
- [Tailwind CSS](https://tailwindcss.com/) — Styling
