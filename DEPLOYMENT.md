Deployment steps for Vercel (GitHub integration)

1. Create a GitHub repository and push this project.

2. In the GitHub repo settings, add the following repository secrets:
   - `VERCEL_TOKEN` — your Vercel personal token (used by the workflow)
   - `VITE_SUPABASE_URL` — your Supabase URL (e.g. https://xxxx.supabase.co)
   - `VITE_SUPABASE_PUBLISHABLE_KEY` — your Supabase anon/public key

3. (Optional) You can also add `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` if you want to target a specific Vercel project, but the workflow uses `npx vercel --prod` and will prompt for selection on first run.

4. In Vercel dashboard, link the GitHub repository (Import Project) and configure build settings:
   - Framework Preset: `Other` (or `Vite` if available)
   - Build Command: `npm run build`
   - Output Directory: `dist`

5. Add the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as Environment Variables in the Vercel Project Settings (Production).

6. Push to `main`/`master` — the GitHub Actions workflow will run, build, and deploy to Vercel.

Troubleshooting:
- If you see a blank page, check the browser console for module evaluation errors caused by missing `VITE_*` env vars.
- If the GitHub Action fails, inspect the Actions tab for logs.
