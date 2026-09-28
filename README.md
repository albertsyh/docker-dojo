# docker-dojo

A one-hour, hands-on Docker and Docker Compose workshop: 9 copy-paste exercises
(~43 min) and a 10-question quiz (~10 min), with anonymous progress tracking and a
live tracker for the trainer. The app is itself fully dockerised, so students can
read and run it as the final example.

## Run it

```sh
docker compose up -d --build
```

Open http://localhost:8000. The live tracker is at http://localhost:8000/live.

Stop with `docker compose down`. To also wipe all progress, run `docker compose down -v`
(this permanently deletes the database volume).

## How it fits together

```
browser ──► web (nginx :80, published as :8000)
              ├─ /        built Vue app (static files)
              ├─ /api/*   ──FastCGI──► api     Laravel 13 on php-fpm ──► db (MySQL 8.4)
              └─ /app/*   ──websocket► reverb  same image as api, `php artisan reverb:start`
                                         ▲
                     api ──HTTP (internal)┘  pushes "stats.updated" on every change
```

| Path | What |
| --- | --- |
| `apps/web` | Vue 3 + Vite + vue-router. Multi-stage Dockerfile: Bun installs, Node builds, nginx serves. |
| `apps/api` | Laravel API. `resources/content/*.json` holds the exercises and quiz. Edit those to change the course. |
| `compose.yaml` | The four services. Every setting has a localhost default. |

- **Identity:** `POST /api/participants` returns an anonymous id like `swift-otter-7f3k9q`,
  stored in the browser's localStorage. Students can type it in on another device to continue.
- **Quiz grading** happens on the server. Answers are never sent to the browser before submission.
  Retakes are allowed, and the best score counts.
- **Live tracker:** every join, exercise toggle and quiz submission broadcasts a fresh
  aggregate snapshot to the public `tracker` channel. It uses `ShouldBroadcastNow`, so no queue
  worker is needed. If Reverb is down, students' requests still succeed and the tracker falls back
  to polling every 30 seconds.

### Do we need Redis?

No, not at workshop scale. MySQL handles the tracker's aggregate queries, and a single
Reverb process can hold thousands of websocket connections. You only need Redis if you run
**more than one Reverb instance** behind a load balancer. Then set `REVERB_SCALING_ENABLED=true`
and point `REDIS_HOST` at a Redis service, so the instances share messages.

## Deploying

1. `cp .env.example .env` and set real values for `APP_KEY`, `DB_PASSWORD`,
   `DB_ROOT_PASSWORD`, `REVERB_APP_KEY` and `REVERB_APP_SECRET`.
2. Put TLS in front of the `web` port (for example a Caddy or Traefik reverse proxy,
   or your platform's load balancer). The browser connects its websocket to whatever host
   and port served the page, so no extra websocket config is needed.
3. `docker compose up -d --build`

Rate limits: joining is limited per IP (`DOJO_JOIN_PER_MINUTE`, default 120, because a
classroom often shares one public IP). Everything else is limited per participant id.

## Developing the frontend

With the stack running, `cd apps/web && bun install && bun run dev` starts Vite with hot
reload. It proxies `/api` and the websocket to `localhost:8000`.

## Credits

Docker Dojo is an unofficial training app. It is not affiliated with or endorsed by
Docker, Inc. Docker is a trademark of Docker, Inc.


- **Pets** by [OpenPets](https://openpets.dev), used with permission: Nori (the default),
  Crumb, Fuse and Professor Hoot (catalog ids `nori`, `crumb`, `fuse`, `professor-hoot`).
  Students pick one with "Choose pet" in the footer. `apps/web/src/assets/pets/` holds
  half-size copies of the original spritesheets, made by:

  ```sh
  cd apps/web && bun scripts/build-pets.ts            # the four pets above
  cd apps/web && bun scripts/build-pets.ts nori crumb # or specific ids; the first is the default
  ```

  The script needs ImageMagick. It checks each sheet's layout, counts the frames in every
  animation, and rewrites `pets.json`. Only add pets you have permission to use, and credit them here.

- Built by [albertsyh](https://github.com/albertsyh), vibe-coded with AI.
