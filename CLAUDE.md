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
  It must keep working with no `.env` (students run it in the `this-app` exercise).
- `compose.prod.yaml`: production overrides for a public host behind a Cloudflare Tunnel.
  It requires every secret (`${VAR:?}`), publishes no ports, adds `cloudflared`, and mounts
  `deploy/cloudflare-real-ip.conf` so nginx trusts `CF-Connecting-IP`. Never mount that
  file on a stack whose web port is published. `tests/compose.test.ts` checks both files.
- `docs/enterprise/`: reference files for splitting edge, app and data onto three instances
  (mTLS edge to app, TLS to MySQL, separate migrate job, rows-only DB user). Not used by the
  workshop or tests; keep it in step if the api image's entrypoint or env changes.
- With no `APP_KEY`, the entrypoint generates one once into the `appkey` volume. It signs
  quiz papers, so it must survive restarts. `image:` is `${COMPOSE_PROJECT_NAME}-api` so
  throwaway projects never retag the main stack's image.
- `PRODUCT.md` and `DESIGN.md`: who this is for, and the "Lab Bench" design system. Read both before UI work.

## Writing exercises

Content lives in `apps/api/resources/content/`: `exercises.json`, `quiz.json`, `glossary.json` and `references.json`. The API
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

**Take-home tracks.** After the workshop, students can carry on with a self-paced track per
stack. They live in `take-home/`: `tracks.json` lists them (`id`, `title`, `label` such as
"Node", `summary`, `published`), and each has `take-home/<id>/exercises.json` and its own
`quiz.json`. There are two tracks today, `node` and `laravel`. They teach the same pitfalls,
each on one app from start to finish: floating tags, secrets in images, stop signals, listen
addresses and published ports, bind mounts, a database that is not ready, CPU architecture,
and a production Dockerfile.
- Each track stands alone. It creates its own folder (`~/takehome-node`, `~/takehome-laravel`)
  and cleans up everything in its last exercise, so it never relies on the core course's folders.
- Ids start with the track id (`node-…`) and are unique across every track, because
  completions have no track column. The content tests check both.
- The 80-minute budget is for the workshop only. Take-home minutes are shown, not capped.
- `published: false` hides a track from students and the API. Use it for a track that is not
  verified yet.
- A track's exercises and quiz stay out of the workshop's figures: the header count, the home
  page and the Live page's totals and quiz groups. The Live page lists take-home progress in
  its own section.

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
    },
    {
      "text": "Change \"Hello\" to \"Hi\" in greet.js and save.",
      "code": " export function greet(name) {\n-  return `Hello, ${name}!`\n+  return `Hi, ${name}!`\n }",
      "label": "greet.js",                    // the file it changes
      "diff": true                            // optional: lines start with -, + or a space; drawn red/green, no copy button
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
  - 8083: node-app;
  - 8084: the Node take-home track (node-shop);
  - 8085: the Laravel take-home track (laravel-shop).

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

**Keep `docs/exercise-ids.md` in step.** It is the trainer's list of ids and focused Live
URLs, generated from `exercises.json` and the take-home tracks. After adding, removing, renaming, reordering or
retiming an exercise, run `bun scripts/exercise-ids.ts` and commit the result.
`tests/docs.test.ts` fails while it is out of date, and so does `./scripts/test-stack.sh`.
Don't edit the doc by hand. `GET /api/exercises` serves the same list live, as JSON.

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
- **Take-home quizzes:** each track has its own pool in `take-home/<id>/quiz.json`, same
  shape, with a smaller split (3 easy, 2 medium, 2 advanced). The same rules and tests apply,
  and question ids are unique across every pool.
  - Papers come from `GET|POST /participants/{id}/quiz/{track}`. The track is part of the
    signature, so a paper only counts for its own quiz.
  - Attempts are stored with a `track` column (`core` for the workshop). Only the workshop
    quiz sets `quiz_opened_at` or counts on the Live page. `progress.quiz` is the workshop's,
    and `progress.trackQuizzes` has each track's.

## Languages

English, and Bahasa Melayu (Brunei), a draft waiting for a native speaker's review. Terminology,
workflow and progress are in `docs/translation-ms.md`. Docker terms, commands and anything in backticks stay English.
- **App text:** `apps/web/src/locales/{en,ms}.ts` (vue-i18n).
  - Every new string goes in both. `ms` is typed against `en`, and `src/__tests__/messages.test.ts` checks keys and placeholders.
  - Content labels stay English in the data; `codeLabel()` / `noteFor()` in `src/i18n.ts` translate what is shown.
- **Course content:** English is the source. `resources/content/ms/` holds prose-only overlays keyed by id, merged by
  `App\Support\Translations` along the prose fields only.
  - Missing entries fall back to English.
  - When you change English content, the ContentTest fails for its stale translations. Update the Malay, then run
    `php artisan content:translations --stamp=<file>`. If you can't translate it, delete that entry instead, so the page falls back to English, and say so.
- **Choosing a language:** the API reads `?lang=` (`SetLanguage` middleware), and the web client sends it on every call when it isn't English.
  - `Content::*($lang)` takes the language explicitly, so stats, grading and ids stay English whatever the request.
  - The Live page maps its (English, broadcast) titles to the viewer's language by id.
  - `lang=ms` also works in the URL, before or after the `#`, without being saved (like `theme=`).

## Copy and voice

- Plain, short and friendly. Write for someone who has never used Docker.
- **No em-dashes anywhere in UI copy or content.** Use a colon, a full stop, or brackets.
- Backticks in quiz text and glossary entries render as inline code (`RichText.vue`).
  Exercise step `text` is plain.
- The glossary (`apps/api/resources/content/glossary.json`) is the vocabulary list for the exercises.
  When an exercise introduces a new term, add it there. `seenIn` must name real
  exercise ids. The content tests check that.
- The References page (`references.json`) lists videos and reading for after the workshop,
  grouped by topic. Each link needs `title`, an https `url`, `kind` (`video` or `reading`)
  and `source` (who made it, and when). `note` and a group `intro` are optional. Keep
  titles as published, but swap any em-dash for a colon.

## Backend patterns (apps/api)

- Participants have no login. An id like `brave-otter-k3x9q2` is suggested by the
  server; the client shows it, lets the student reroll, and creates it only when they
  start. `Participant::isValidId()` guards every write.
- Every endpoint that changes progress calls `Stats::broadcast()`, which pushes the
  `stats.updated` event on the public `tracker` channel. The broadcast is wrapped so a
  Reverb outage never fails the student's request.
- Update rows with `find()` + `save()`, not `where()->update()`. MySQL reports 0
  affected rows when nothing changed, which once caused false 404s.
- Named rate limiters in `AppServiceProvider`: `join`, `suggest`, `participant`, `quiz`, `chat`.
  A whole classroom shares one IP behind NAT, so `join` is configurable
  (`DOJO_JOIN_PER_MINUTE`).
- The tracker puts every participant in exactly one quiz group: passed, trying again
  (submitted, not passed), taking it now, or not started. "Taking it now" means
  `quiz_opened_at` is set, no submission yet, and `last_seen_at` is inside the 5-minute
  active window. Answering sends nothing, so the quiz page checks in every 2 minutes to
  keep a student in that group. Keep that check-in if you touch `QuizView`.
- "Here now" on the Live page counts who has each exercise page open. `usePresence`
  (`src/presence.ts`) posts the exercise id on arrival and every minute, even while the tab
  is hidden (the student is in their terminal), and sends `null` on leaving (a beacon on
  tab close). The server stores it in `participants.current_exercise_id` and counts it for
  3 minutes after the last check-in. Only a change of page broadcasts, not the heartbeat.
  The heartbeat also refreshes `last_seen_at`, so "active now" includes students reading an exercise.
- **Chat** (`ChatController`, `App\Support\Chat`): students post questions, delete their
  own, and say "Me too". There is no trainer role or moderation, by design: the trainer
  reads `/chat`, which works without joining (`GET /api/chat` is public).
  - A participant id works like a password, so it never appears in chat responses or
    events. Authors show as `Participant::displayName()` ("brave otter"), and `mine` and
    `meToo` come only from the participant-scoped `GET /participants/{id}/chat`. Tests
    assert on the raw JSON; keep it that way if you add fields.
  - `ChatUpdated` on the public `chat` channel carries no messages, only "changed".
    Every browser then refetches its own view (`src/chat.ts`). Don't put messages in the event.
  - Deleting is a hard delete of your own message (someone else's is a 404). Nothing is pruned automatically.
- Redis is not needed. It only becomes necessary with more than one Reverb instance.
- The container entrypoint caches config and routes and runs migrations, so env changes
  need a restart, not just a file edit.

## Frontend patterns (apps/web)

- State lives in `src/store.ts` (progress, content) and `src/prefs.ts` (theme, text
  size). Pets are in `src/pets.ts`. There is no Pinia; plain `reactive` modules are the
  pattern.
- `completed` holds ids from every track. Workshop counts use `coreCompleted`. `trackOf(id)`
  gives an exercise's own list, so the stepper, numbering and Previous/Next stay inside its
  track, and the last exercise leads to that track's quiz (`quizRoute`). `JourneyList.vue`
  draws a track's numbered stops for `/exercises` and `/take-home/<id>`, and
  `ExerciseLadder.vue` draws the Live page's rows.
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
- `?embed` on any route (used as `/live?embed`) hides the header, footer and pet, for an
  iframe on another site. On `/live` it also drops the quiz and shows exercise progress only.
  On `/exercises/<id>` it shows only the steps, needs no participant, and doesn't
  count toward "Here now" (the router passes `embed` to `ExerciseView` as a prop).
  `/live?exercise=<id>&count=N` narrows the list to N exercises (default 3) centred on that
  one, shifted in at either end, with the named one highlighted. A take-home id narrows that
  track's own list instead. An unknown id shows them all. `exercise` and `count` also work after
  a `#` (`/live?embed#exercise=<id>`, the `#` wins), so a host changing only that part of an
  iframe's src moves the list without reloading it. `main.ts` skips anchor scrolling for a `#` with `=`.
  `theme=light|dark` (either place, any route, read by `routeParam()` in `src/routeParams.ts`) sets the
  theme for that view without saving it (`setUrlTheme` in `prefs.ts`; `index.html` applies it before first paint).
  Keep nginx free of `X-Frame-Options` and `frame-ancestors`, or the embed breaks (the stack test checks).
- Link previews: `index.html` carries Open Graph tags with `__OG_TITLE__`-style placeholders, which
  nginx fills in (`sub_filter`) because crawlers don't run the app. Per-route titles and descriptions
  live in `apps/web/og-meta.conf`, shared by `nginx.conf` and the enterprise edge; add a route there
  when you add a page. Every page shares `public/og.png`, rendered from `apps/web/og/og-image.html`
  by `bun scripts/og-image.ts`. The stack test checks the filled-in tags.
- Copying goes through `copyText()` in `src/clipboard.ts`. The Clipboard API is missing on
  plain-http LAN addresses (a workshop on a laptop's IP), so it falls back to a hidden
  textarea. `notify()` shows the one-line toast (`ToastHost.vue`). The participant id copies
  from the header, the phone menu and the home page badge.
- The pet opens the chat popup (the unread count shows on the pet and on the Chat nav
  link). The popup and the pet picker share the pet's corner, so opening one closes the other.
- The header folds its nav into a Menu button below 1024px, and hides the id text below 1280px. Check new pages at phone
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
    It also runs `tests/docs.test.ts`, which you can run alone with `bun test tests/docs.test.ts`.
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
