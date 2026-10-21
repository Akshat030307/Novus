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
