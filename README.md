# docker-dojo

A 90-minute, hands-on Docker and Docker Compose workshop: 14 copy-paste exercises
(~75 min) and a 10-question quiz (~12 min) drawn from a pool of easy, fill-in-the-blank
and compose-file questions, with a glossary, a page of further videos and reading, a questions chat, anonymous progress
tracking and a live tracker for the trainer. The app is itself fully dockerised, so students can
read and run it as the final example.

After the workshop, two self-paced take-home tracks (Node.js and Laravel, about 50 minutes
each, with a quiz each) cover the mistakes that only show up later: floating tags, secrets in
images, stop signals, listen addresses, bind mounts, a database that is not ready yet, and
building for the wrong CPU.

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
| `apps/api` | Laravel API. `resources/content/*.json` holds the exercises, the quiz pool, the glossary and the references, and `resources/content/take-home/` the take-home tracks. Edit those to change the course (see CLAUDE.md for the formats). |
| `compose.yaml` | The four services. Every setting has a localhost default. |
| `compose.prod.yaml` | Production overrides: required secrets, no published ports, a Cloudflare Tunnel. |

- **Identity:** `POST /api/participants` returns an anonymous id like `swift-otter-7f3k9q`,
  stored in the browser's localStorage. Students can type it in on another device to continue.
- **Chat:** students ask questions at `/chat`, or by clicking their pet on wide screens.
  They can delete their own messages and say "Me too" to others'. The trainer can read
  `/chat` without joining. Nobody else ever sees a student's id, only its words ("brave otter").
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

Production runs behind a [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/):
the host publishes no ports, and a `cloudflared` container dials out to Cloudflare.
`compose.prod.yaml` adds it on top of `compose.yaml`.

1. In the Cloudflare dashboard (Zero Trust > Networks > Tunnels), create a tunnel with the
   Docker connector and copy its token. Add a public hostname (for example
   `docker-dojo.example.com`) with service `http://web:80`. Cloudflare terminates TLS and
   carries the websocket too, so nothing else is needed for `/app`.
2. `cp .env.example .env`, uncomment `COMPOSE_FILE=compose.yaml:compose.prod.yaml`, and set
   real values for `APP_KEY`, `APP_URL` (the https address), `DB_PASSWORD`,
   `DB_ROOT_PASSWORD`, `REVERB_APP_KEY`, `REVERB_APP_SECRET` and `CLOUDFLARE_TUNNEL_TOKEN`.
   Compose stops with a clear error if any of them is missing.
3. `docker compose up -d --build`

`COMPOSE_FILE` makes every `docker compose` command on the server (`up`, `ps`, `logs`,
`down`) use both files. Without it you would have to pass
`-f compose.yaml -f compose.prod.yaml` each time, and a forgotten one falls back to the
local file, which publishes port 8000.

- **Real client IPs.** nginx takes the client address from Cloudflare's `CF-Connecting-IP`
  header (`deploy/cloudflare-real-ip.conf`, mounted in prod only). That is safe only because
  nothing but `cloudflared` can reach nginx. Don't publish `web`'s port on that host.
- **Rate limits.** Joining is limited per IP (`DOJO_JOIN_PER_MINUTE`, default 120, because a
  classroom often shares one public IP). Everything else is limited per participant id.
- **Set the database passwords before the first start.** MySQL reads them only when the
  `dbdata` volume is created. Changing `DB_PASSWORD` later locks the api out of the existing
  database. Either change it inside MySQL too (`ALTER USER`), or accept losing all progress
  and run `down -v`, which permanently deletes the database volume.
- **Keep `APP_KEY` stable.** It signs quiz papers, so changing it breaks any quiz a student
  has open. Without an `APP_KEY` (the local setup), the api generates one once and keeps it
  in the `appkey` volume.
- **One checkout per host.** `compose.yaml` pins the project name to `docker-dojo`, so a
  second clone on the same host is the same project and takes over the running stack and
  its database. Give it its own name with `-p`.

For a layout that splits the frontend, backend and database onto separate instances
(the shape enterprise security reviews usually ask for), see
[`docs/enterprise/`](docs/enterprise/README.md). It's a reference; the workshop doesn't use it.

### Resources

`compose.yaml` caps each container. Together they allow 3 CPUs and about 1.5GB of
memory (plus 128MB for `cloudflared` in production), so a 2 vCPU / 2GB VPS is enough for
a workshop. Each php-fpm request may use up to 64MB, so the api's 5 workers always fit
inside its 384MB.

| Service | Limit | Idle | Peak in load test |
|---|---|---|---|
| db | 1 CPU, 768MB | ~450MB | 90% CPU, 455MB |
| api | 1 CPU, 384MB | ~12MB | 100% CPU, 46MB |
| reverb | 0.5 CPU, 256MB | ~35MB | 37% CPU, 42MB |
| web | 0.5 CPU, 64MB | ~9MB | 42% CPU, 16MB |
| cloudflared (prod) | 0.5 CPU, 128MB | | |

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
  nginx (routing, websockets, published ports, resource limits, quiz papers surviving an
  api restart), then removes the copy. It builds its own `docker-dojo-test-api` image, so
  your normal stack, its image and its data are untouched.
- **Compose tests** (`tests/compose.test.ts`) check what `docker compose config` makes of
  `compose.yaml` and `compose.prod.yaml`, for example that prod refuses to start without a
  secret and publishes no ports. They run in `test-stack.sh`, or alone with
  `bun test tests/compose.test.ts`.

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
