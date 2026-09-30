# Architect AI — Software Research & Planning Agent

A Next.js (App Router) based full-stack application built for a private workspace that acts as a Software Research & Planning Architect.
It uses Gemini's advanced modeling and Google Search Grounding to turn software ideas into complete implementation blueprints.

## Features Built
- **Private Owner Workspace:** Completely isolated and restricted to specific allowlisted email addresses.
- **Architect Chat Agent:** Powered by Gemini 2.5 Pro. Follows strict guidelines to extract requirements.
- **Search-Grounded Research:** Allows checking facts, APIs, and pricing in real time with clickable source citations.
- **Requirements Confirmation:** UI to track facts, assumptions, and block confirmation if questions remain.
- **Blueprint Generation:** Generates a strict 17-point markdown blueprint including a coding-agent prompt.
- **Exports:** Download MD, JSON, and Prompt text files.

## Local Setup Instructions

1. **Install dependencies:**
   `npm install`

2. **Configure Environment Variables:**
   Rename `.env.example` to `.env.local` and fill in the values:
   - `GEMINI_API_KEY`: Obtain from Google AI Studio. The free tier is sufficient.
   - `ALLOWED_EMAILS`: Comma-separated list of your Google accounts (e.g., `you@gmail.com`).
   - `NEXT_PUBLIC_FIREBASE_*`: Your Firebase project configuration.

3. **Firebase Setup:**
   - Create a free Firebase project (Spark Plan).
   - Enable **Authentication** -> **Google Sign-In**.
   - Enable **Firestore Database**. You do NOT need to pay or upgrade to the Blaze plan.
   - Set basic Firestore rules (ensure only authenticated owners can read/write).

4. **Run the Development Server:**
   `npm run dev`
   Open `http://localhost:3000`

## Deployment

You can deploy this application for free using Vercel.

1. Push this repository to GitHub.
2. Import the project into Vercel.
3. Add all the Environment Variables from your `.env.local` into the Vercel project settings.
4. Deploy!

*Note: As long as you stay within the 15 requests/minute Gemini limit and standard Firebase limits, running this personal tool is 100% free.*

## Docker Deployment

You can host Architect AI yourself using Docker.

1. **Build the Docker Image:**
   Make sure to pass your public Firebase configuration during the build, as Next.js needs them to compile the client bundles.
   ```bash
   docker build \
     --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="your_api_key" \
     --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com" \
     --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_project_id" \
     --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_project.appspot.com" \
     --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="sender_id" \
     --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="app_id" \
     -t architect-ai .
   ```

2. **Run the Container:**
   Pass the private server-side secrets when running the container.
   ```bash
   docker run -p 3000:3000 \
     -e GEMINI_API_KEY="your_gemini_key" \
     -e ALLOWED_EMAILS="your_email@gmail.com" \
     architect-ai
   ```
