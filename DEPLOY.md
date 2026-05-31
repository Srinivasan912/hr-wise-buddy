# Deploy to Vercel or Netlify

This project ships with three vite configs:

- `vite.config.ts` — used by the Lovable in-editor preview (Cloudflare Workers target). **Do not delete.**
- `vite.config.vercel.ts` — for Vercel.
- `vite.config.netlify.ts` — for Netlify.

---

## Step 1 — Export the code to GitHub

In Lovable: **GitHub → Connect to GitHub → Create repository**, then clone it locally:

```bash
git clone https://github.com/<you>/<repo>.git
cd <repo>
```

---

## Step 2 — Swap the vite config for your target

Pick **one** platform. Run at the repo root:

**Vercel**
```bash
mv vite.config.ts vite.config.lovable.ts
mv vite.config.vercel.ts vite.config.ts
git add -A && git commit -m "chore: switch vite config to vercel target"
git push
```

**Netlify**
```bash
mv vite.config.ts vite.config.lovable.ts
mv vite.config.netlify.ts vite.config.ts
git add -A && git commit -m "chore: switch vite config to netlify target"
git push
```

> ⚠️ After this swap, the Lovable in-editor preview will stop working **for that branch**. To restore it, swap the files back (see bottom of this doc).

---

## Step 3 — Set environment variables in the platform dashboard

Copy these values from your project's `.env` file.

**Server (used by SSR / server functions):**
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LOVABLE_API_KEY` *(only if you use the Lovable AI Gateway)*

**Client (must start with `VITE_`):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

---

## Step 4 — Deploy

### Vercel
1. Go to <https://vercel.com/new> and import your GitHub repo.
2. **Framework Preset:** *Other* (leave as-is — `vercel.json` handles it).
3. **Build Command:** `bun run build` *(auto-filled from `vercel.json`)*
4. **Output Directory:** leave **empty** — TanStack Start emits the Vercel Build Output API at `.vercel/output/`, which Vercel auto-detects. **Do NOT set this to `public` or `dist`** (that's what caused the "No Output Directory named public" error).
5. Paste the env vars from Step 3.
6. Click **Deploy**.

### Netlify
1. Go to <https://app.netlify.com/start> and pick your GitHub repo.
2. **Build command** and **Publish directory** are auto-read from `netlify.toml` (`bun run build` → `.output/public`).
3. Paste the env vars from Step 3.
4. Click **Deploy site**.

---

## Going back to the Lovable preview

```bash
mv vite.config.ts vite.config.vercel.ts   # or vite.config.netlify.ts
mv vite.config.lovable.ts vite.config.ts
git add -A && git commit -m "chore: restore lovable vite config"
git push
```

---

## Troubleshooting

- **"No Output Directory named public found"** (Vercel) → You set an Output Directory manually. Clear that field in Vercel project settings → Build & Output, redeploy.
- **Blank page / 500 on first load** → Server env vars (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are missing. Set them and redeploy.
- **`bun: command not found`** (Netlify) → Netlify auto-installs bun when `bun.lockb` is present; ensure it's committed.
- **Auth works locally, fails in production** → Add your production URL to Supabase Auth → URL Configuration → Site URL & Redirect URLs.
