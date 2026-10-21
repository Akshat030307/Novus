# Deploying Novus

The site is a static bundle behind nginx on the shared VPS. See the project
memory for the box's topology; the short version:

```sh
npm run build
rsync -az --delete --exclude 'novus-demo.mp4' --exclude 'novus-demo-poster.jpg' \
  dist/ coursefactory-vps:/root/novus/site/
```

The two excluded files are the 11 MB trailer and its poster: they live on the
server and never change, so there is no reason to push them every time.

## nginx

`nginx.conf` here is the copy of record for `/root/novus/nginx.conf` on the
VPS. It is bind-mounted into the `novus-web` container, so changing it needs a
container restart — not a rebuild:

```sh
scp deploy/nginx.conf coursefactory-vps:/root/novus/nginx.conf
ssh coursefactory-vps 'docker restart novus-web'
```

That restarts **only** Novus. Nothing else on the box is touched, and the
restart is a second or two of 502 on this one domain.

The config exists because the site is two documents: `index.html` is the
static front door, `play.html` is the React app, and `/play` and `/teach` have
to reach the app rather than the front door.

## The syllabus reader (Supabase function `syllabus-plan`)

The one part of Novus that calls TinyFish while someone is using it: a
teacher pastes a syllabus link on the Work set tab and the TinyFish Agent
reads it. The key lives in the function, never in the site. Three steps, once:

1. **Database.** Run `docs/supabase.sql` in the SQL editor (it is
   idempotent). It adds `syllabus_runs`, which the function uses to enforce
   five reads per teacher per day.
2. **Secret.** Supabase → Edge Functions → Secrets → add
   `TINYFISH_API_KEY` with the same value as in `.env`.
   (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided by Supabase.)
3. **Deploy**, either way:
   - CLI: `npx supabase login`, then
     `npx supabase functions deploy syllabus-plan --project-ref lckmgjurvefeudlffyzi`
   - Dashboard: Edge Functions → Deploy a new function → via editor, name it
     `syllabus-plan`, and paste the whole of `deploy/syllabus-plan.single.ts`
     (generated from the source by `node tools/build-edge-single.mjs`).

Leave "Verify JWT" on. The function also checks the caller itself: signed in,
owns a class, under the daily limit. Otherwise it spends nothing.
