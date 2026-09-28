# Docker Dojo

A one-hour, hands-on Docker and Docker Compose workshop. Students pick a random
participant id, work through copy-paste exercises on their own machine, mark each one
done, then take a short quiz. A public Live page shows the whole room's progress.
It is an unofficial training app, not affiliated with Docker, Inc.

- `apps/api`: Laravel 13 on php-fpm. JSON API, MySQL, Reverb websockets.
  (`apps/api/CLAUDE.md` and `AGENTS.md` are the stock Laravel Boost scaffold, not project docs.)
- `apps/web`: Vue 3 + Vite + TypeScript SPA, served by nginx, which also forwards `/api`
  to php-fpm and `/app` (websocket) to Reverb.
- `compose.yaml`: `db`, `api`, `reverb`, `web`. Only `web` publishes a port (`APP_PORT`, default 8000).
- `PRODUCT.md` and `DESIGN.md`: who this is for, and the "Lab Bench" design system. Read both before UI work.

## Writing exercises

Content lives in `apps/api/resources/content/exercises.json` and `quiz.json`. The API
serves it. Editing it needs an api rebuild (`docker compose up -d --build api reverb`),
not a web rebuild.

**Time budget.** Exercises plus the quiz must fit in about an hour. Keep the sum of
`minutes` near 50, and leave 10 for the quiz. If you add an exercise, trim or merge
another.

**Sequence.** The order is the curriculum. Each exercise introduces one idea and may
rely on the ones before it: run, exec, build, cache, volumes, networks, Compose, this
app, cleanup. The home page and journey list point students at the first unfinished one.

**Shape of an exercise:**

```jsonc
{
  "id": "build-an-image",        // stable: stored in exercise_completions, see below
  "title": "Build your own image",
  "minutes": 7,
  "summary": "One sentence, shown in the list and under the title.",
  "steps": [
    {
      "text": "What to do and why, in one or two sentences.",
      "code": "docker build -t my-site:1.0 .",  // optional, copy-paste ready
      "label": "terminal",                    // "terminal" and "inside the container" get a $ prompt; else a filename
      "notes": [{ "for": "Windows", "text": "OS-specific gotcha" }]  // optional
    }
  ],
  "expected": "What success looks like, shown in the highlighted 'You should see' box.",
  "files": {                       // optional, only when the student creates files
    "note": "Run every command from inside my-site.",
    "entries": [{ "path": "my-site/Dockerfile", "note": "step 3, no extension" }]
  }
}
```

**Rules that keep exercises working on every laptop:**

- Commands must run unchanged in bash, zsh and PowerShell. That means:
  - no `\` line continuations, one command per line;
  - no host-side `$(...)` or `$VAR`;
  - anything the container should expand goes in single quotes inside `sh -c '...'`.
- Put OS differences in a step's `notes`, not in separate command variants.
- Students work in a new folder under their home directory (`cd ~`, `mkdir`, `cd`). The
  `files` panel shows only files in that working folder on their machine, never paths
  inside a container. Leave `files` out when the exercise creates no files, and the
  panel disappears.
- Use small, public, pinned images (`nginx:alpine`, `alpine:3.20`, `redis:7-alpine`,
  `postgres:17-alpine`). They must pull quickly on shared workshop Wi-Fi.
- Host ports in use:
  - 8000: the Dojo itself;
  - 8080: nginx exercises;
  - 8081: my-site;
  - 8082: the Compose demo.

  Pick a free one for anything new.
- Name everything the student creates, and tidy up at the end of the exercise, so that
  re-running an exercise never hits "name already in use". Anything kept for later must
  be removed in `cleanup`. Keep `cleanup` in sync.
- Warn before anything that deletes data (volumes, `down -v`, `prune`).
- Actually run each new or changed command on macOS/Linux, and think through PowerShell,
  before shipping. Quoting bugs have happened here before.

**Ids are data.** Completions are stored by exercise id, and the Live stats only count
ids that are still in the file. Renaming or removing an id silently drops everyone's
progress for it. Only do that between workshops.

## Quiz

- `quiz.json` has a `passMark` (0.7) and questions with an `id`, `prompt`, four
  `options`, the `answer` index, and an `explanation`.
- Answers are graded on the server and must never reach the browser before submission.
  `Content::publicQuiz()` strips them. Keep it that way for any new field that gives the
  answer away.
- One question per exercise idea, roughly. Keep the correct-answer positions varied.

## Copy and voice

- Plain, short and friendly. Write for someone who has never used Docker.
- **No em-dashes anywhere in UI copy or content.** Use a colon, a full stop, or brackets.
- Backticks in quiz text and glossary entries render as inline code (`RichText.vue`).
  Exercise step `text` is plain.
- The glossary (`apps/web/src/glossary.ts`) is the vocabulary list for the exercises.
  When an exercise introduces a new term, add it there. `seenIn` must name real
  exercise ids (unknown ids are hidden, not flagged).

## Backend patterns (apps/api)

- Participants have no login. An id like `brave-otter-k3x9q2` is suggested by the
  server; the client shows it, lets the student reroll, and creates it only when they
  start. `Participant::isValidId()` guards every write.
- Every endpoint that changes progress calls `Stats::broadcast()`, which pushes the
  `stats.updated` event on the public `tracker` channel. The broadcast is wrapped so a
  Reverb outage never fails the student's request.
- Update rows with `find()` + `save()`, not `where()->update()`. MySQL reports 0
  affected rows when nothing changed, which once caused false 404s.
- Named rate limiters in `AppServiceProvider`: `join`, `suggest`, `participant`, `quiz`.
  A whole classroom shares one IP behind NAT, so `join` is configurable
  (`DOJO_JOIN_PER_MINUTE`).
- Redis is not needed. It only becomes necessary with more than one Reverb instance.
- The container entrypoint caches config and routes and runs migrations, so env changes
  need a restart, not just a file edit.

## Frontend patterns (apps/web)

- State lives in `src/store.ts` (progress, content) and `src/prefs.ts` (theme, text
  size). Pets are in `src/pets.ts`. There is no Pinia; plain `reactive` modules are the
  pattern.
- Styling:
  - use the tokens in `src/style.css` (OKLCH, light and dark), never raw colours;
  - every page sits in the same `var(--content)` column so nothing shifts between
    pages (and `scrollbar-gutter: stable` keeps short pages from jumping), and only
    `.layout.has-files` and `.wide-page` break out;
  - yellow highlight means "you are here", green means go or done;
  - no side-stripe borders, eyebrow kickers or hero-metric tiles.
- Motion:
  - animate `transform` and `opacity`, not width;
  - respect reduced motion.
- A control that opens something also closes it, deciding from the live state.
- Buttons that swap their label use the `.swap` stacked-grid pattern so they never
  change width.
- The header folds its nav into a Menu button below 860px. Check new pages at phone
  width and at the largest text size, in both themes.
- Pets are OpenPets sprite sheets, used with permission and credited in the footer and
  README. To add one, run `bun scripts/build-pets.ts` in `apps/web`, which regenerates
  the WebP sheets and `pets.json`. They only show at 1000px and wider.
- `bun run build` (vue-tsc plus vite) is the typecheck. Run it before handing over.

## Working here

- Use Bun, not npm. The web Dockerfile uses Node for the build stage only because
  vue-tsc misbehaves under Bun there.
- Never read `.env`. `.env.example` lists the keys.
- Run the stack with `docker compose up -d --build`, then open http://localhost:8000.
  For frontend dev, run `bun run dev` in `apps/web`, which proxies to :8000.
- `.gitattributes` forces LF on `*.sh`. A CRLF entrypoint breaks the api container on
  Windows clones.
