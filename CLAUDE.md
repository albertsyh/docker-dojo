# Docker Dojo

A 90-minute, hands-on Docker and Docker Compose workshop. Students pick a random
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

Content lives in `apps/api/resources/content/`: `exercises.json`, `quiz.json` and `glossary.json`. The API
serves it. Editing it needs an api rebuild (`docker compose up -d --build api reverb`),
not a web rebuild.

**Time budget.** Exercises plus the quiz must fit in about 90 minutes. Keep the sum
of `minutes` at or under 80 (a content test enforces it), and leave about 12 for the
quiz. If you add an exercise, trim or merge another.

**Sequence.** The order is the curriculum. Each exercise introduces one idea and may
rely on the ones before it: run, exec, build, image size and layers, dependency cache,
.dockerignore, multi-stage, scanning, volumes, networks, Compose, this app, cleanup.
`layer-cache`, `dockerignore` and `multi-stage` share one `~/node-app` folder, each
building on the last. The home page and journey list point students at the first unfinished one.

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
  - 8082: the Compose demo;
  - 8083: node-app.

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

`quiz.json` is a **pool**. Each quiz (a "paper") draws `split` questions from each level:
4 easy, 3 medium and 3 advanced, 10 in total. The server picks the questions the
participant has seen least, so retakes get new ones. `App\Support\Quiz` holds the logic.

Top-level keys: `passMark`, `minutes` (shown in the course list), `split`, `scenarios`
and `questions`. Code may be a string or a list of lines. Use lines for anything longer
than one line, so the JSON stays readable. The three kinds of question:

```jsonc
// easy: multiple choice
{ "id": "ps-all", "level": "easy", "prompt": "…", "options": ["…", "…", "…", "…"], "answer": 2, "explanation": "…" }

// medium: fill in the blanks. context sets the scene first; {{1}}, {{2}} mark the gaps.
// Each blank lists accepted answers, and the first one is shown as the solution.
{ "id": "build-tag", "level": "medium", "context": "You are in a folder…", "prompt": "Fill in the flag and the build context.",
  "label": "terminal", "code": ["docker build {{1}} my-site:2.0 {{2}}"], "blanks": [["-t", "--tag"], ["."]], "explanation": "…" }

// advanced: multiple choice about one full compose file from "scenarios"
{ "id": "shop-browser", "level": "advanced", "scenario": "shop", "prompt": "…", "options": […], "answer": 1, "explanation": "…" }
```

- **Blanks matching:** case, surrounding spaces and quotes, and doubled spaces are
  ignored (`Quiz::normalise`). List real alternatives (`-d`, `--detach`), not typos.
- **Blank order:** if two blanks could be filled in either order, rewrite the question so
  each has only one right place. Grading is by position.
- **Advanced papers:** all advanced questions in a paper come from one scenario. Give
  every scenario at least `split.advanced` questions (more is better, for variety).
- **Growing the pool:** keep at least twice the split per level, so a retake never
  repeats a question. The content tests enforce all of this.
- **Answers stay on the server:**
  - they are never sent before submission;
  - a paper is signed (HMAC over participant and question ids) and can be submitted
    only once, via the unique `paper_token` column;
  - any new field that gives away an answer must stay out of `Quiz::publicQuestion`.
- **Answer positions:** keep the correct option in varied positions.

## Copy and voice

- Plain, short and friendly. Write for someone who has never used Docker.
- **No em-dashes anywhere in UI copy or content.** Use a colon, a full stop, or brackets.
- Backticks in quiz text and glossary entries render as inline code (`RichText.vue`).
  Exercise step `text` is plain.
- The glossary (`apps/api/resources/content/glossary.json`) is the vocabulary list for the exercises.
  When an exercise introduces a new term, add it there. `seenIn` must name real
  exercise ids. The content tests check that.

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
- The tracker puts every participant in exactly one quiz group: passed, trying again
  (submitted, not passed), taking it now, or not started. "Taking it now" means
  `quiz_opened_at` is set, no submission yet, and `last_seen_at` is inside the 5-minute
  active window. Answering sends nothing, so the quiz page checks in every 2 minutes to
  keep a student in that group. Keep that check-in if you touch `QuizView`.
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
- `bun run build` (vue-tsc plus vite) is the typecheck and `bun run test` runs Vitest.
  Run both before handing over.

## Tests

- Run them before handing over:
  - `docker build --target test apps/api` (PHPUnit);
  - `docker build --target test apps/web` (Vitest);
  - `./scripts/test-stack.sh` (the whole stack end to end, in a throwaway compose project on port 8099).
- API tests use SQLite in memory, so keep SQL portable. For example, write
  `score * 1.0 / total`, because SQLite divides integers.
- `tests/Feature/ContentTest.php` encodes the exercise rules above. When you add a
  rule, add a test for it.
- A new behaviour gets a test that fails without it. Check that by breaking a scratch
  copy, never the real stack's data.

## Working here

- Use Bun, not npm. The web Dockerfile uses Node for the build stage only because
  vue-tsc misbehaves under Bun there.
- Never read `.env`. `.env.example` lists the keys.
- Run the stack with `docker compose up -d --build`, then open http://localhost:8000.
  For frontend dev, run `bun run dev` in `apps/web`, which proxies to :8000.
- `.gitattributes` forces LF on `*.sh`. A CRLF entrypoint breaks the api container on
  Windows clones.
