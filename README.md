# docker-dojo

A 90-minute, hands-on Docker and Docker Compose workshop: 14 copy-paste exercises
(~75 min) and a 10-question quiz (~12 min) drawn from a pool of easy, fill-in-the-blank
and compose-file questions, with a glossary, a page of further videos and reading, anonymous progress
tracking and a live tracker for the trainer. The app is itself fully dockerised, so students can
read and run it as the final example.

## Run it

```sh
docker compose up -d --build
```

Open http://localhost:8000. The live tracker is at http://localhost:8000/live.

To show exercise progress inside another website during a session, embed `/live?embed`. It has
no header, footer or quiz, just the room's progress and who is on each exercise right now:

Add `&exercise=<id>` to show just that exercise and its neighbours, one on each side,
highlighted, for example `/live?embed&exercise=dockerignore`. `&count=5` widens it to five.
[`docs/exercise-ids.md`](docs/exercise-ids.md) lists every id with its ready-made URL, and
`GET /api/exercises` returns the same list as JSON.

```html
<iframe src="https://your-dojo-host/live?embed" title="Docker Dojo progress" style="width:100%;height:900px;border:0"></iframe>
```

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
| `apps/api` | Laravel API. `resources/content/*.json` holds the exercises, the quiz pool, the glossary and the references. Edit those to change the course (see CLAUDE.md for the formats). |
| `compose.yaml` | The four services. Every setting has a localhost default. |

- **Identity:** `POST /api/participants` returns an anonymous id like `swift-otter-7f3k9q`,
  stored in the browser's localStorage. Students can type it in on another device to continue.
- **Quiz grading** happens on the server. Answers are never sent to the browser before submission.
  Retakes are allowed, and the best score counts.
- **Live tracker:** every join, exercise toggle, quiz submission and move between exercise pages broadcasts a fresh
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

### Resources

`compose.yaml` caps each container. Together they allow 3 CPUs and about 1.5GB of
memory, so a 2 vCPU / 2GB VPS is enough for a workshop.

| Service | Limit | Idle | Peak in load test |
|---|---|---|---|
| db | 1 CPU, 768MB | ~450MB | 90% CPU, 455MB |
| api | 1 CPU, 384MB | ~12MB | 100% CPU, 46MB |
| reverb | 0.5 CPU, 256MB | ~35MB | 37% CPU, 42MB |
| web | 0.5 CPU, 64MB | ~9MB | 42% CPU, 16MB |

The load test ran 150 students who each joined, finished all 10 exercises and
submitted the quiz, 30 at a time, with 150 Live-page websockets open. That is 1,800
writes in 14 seconds, about 130 requests a second, with p95 latency of 280ms and no
errors. A real workshop is a small fraction of that.

MySQL is most of the memory, and most of that is its default buffers. It could be
trimmed if you need a smaller box.

## Tests

Each image has a `test` stage that runs its suite during the build, and fails the
build if a test fails. `docker compose build` only builds the production stages, so
run the tests explicitly:

```sh
docker build --target test apps/api    # PHPUnit: API behaviour and content rules
docker build --target test apps/web    # Vitest: quiz, tracker, glossary, references, header menu, pets
./scripts/test-stack.sh                # whole stack end to end (needs Bun)
```

- **API tests** cover joining, conflicts, grading, stats and broadcasts.
- **Content tests** check `exercises.json`, `quiz.json`, `glossary.json` and `references.json`:
  ids, required fields, no em-dashes, shell-safe commands, glossary links, and https reference links.
- **`test-stack.sh`** starts a throwaway copy of the stack as the compose project
  `docker-dojo-test` on port 8099, with its own database volume. It tests through
  nginx (routing, websockets, published ports, resource limits), then removes the
  copy. Your normal stack and its data are untouched.

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
