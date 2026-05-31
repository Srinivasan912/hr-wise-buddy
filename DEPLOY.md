# Deploy to Vercel or Netlify

This project ships with three vite configs:

- `vite.config.ts` — used by the Lovable in-editor preview (Cloudflare Workers target). **Do not delete.**
- `vite.config.vercel.ts` — for Vercel.
- `vite.config.netlify.ts` — for Netlify.

## One-time prep (after you download / push to GitHub)

Pick your platform and run the matching command at the repo root:

**Vercel**
```bash
mv vite.config.ts vite.config.lovable.ts
mv vite.config.vercel.ts vite.config.ts
```

**Netlify**
```bash
mv vite.config.ts vite.config.lovable.ts
mv vite.config.netlify.ts vite.config.ts
```

Commit and push.

## Environment variables (set in the platform dashboard)

Server (used by server functions / SSR):
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LOVABLE_API_KEY` *(only if you use the Lovable AI Gateway)*

Client (must start with `VITE_`):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Copy the values from your current `.env` file.

## Deploy

### Vercel — one click
1. Push the repo to GitHub.
2. Go to <https://vercel.com/new>, import the repo.
3. Add the env vars above. Framework preset: **Other**. Build command and output dir are auto-read from `vercel.json`.
4. Click **Deploy**.

### Netlify — one click
1. Push the repo to GitHub.
2. Go to <https://app.netlify.com/start>, pick the repo.
3. Add the env vars above. Build command and publish dir are auto-read from `netlify.toml`.
4. Click **Deploy site**.

## Going back to Lovable preview

```bash
mv vite.config.ts vite.config.vercel.ts   # or vite.config.netlify.ts
mv vite.config.lovable.ts vite.config.ts
```
