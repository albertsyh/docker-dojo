# Bahasa Melayu (Brunei) translation

The Dojo can be switched to Malay: the switch is in the footer, and in the menu on a phone. This
page is for whoever reviews or extends the translation.

**Status: draft, waiting for a native speaker's review.** Everything below was drafted by Claude.
Please check it before a workshop uses it.

## Tone and register

- **Standard Malay as written in Brunei** (DBP Brunei spelling), not colloquial Bahasa Brunei.
- **Plain and friendly, for someone who has never used Docker.** Short sentences, as in the English.
- **The reader is "anda".** Instructions are commands: "Jalankan…", "Buka…", "Senaraikan…".
- **No em-dashes (—), as in the English.** Use a colon, a full stop or brackets. The tests check this.

## What stays in English

- **Docker terms:** container, image, volume, network, port, layer, tag, registry, build cache,
  multi-stage build, Dockerfile, Compose, compose file, bind mount, named volume, daemon, engine,
  client, detached, publish (a port).
  - As nouns they take no Malay plural, like other borrowed terms: "dua container", not "container-container".
  - Where English makes a verb of them, the Malay usually keeps the term and adds a Malay verb: "publish port", "build image".
- **Anything the student types or sees on screen:**
  - every command, flag, path and file name;
  - anything in `backticks`. The tests fail if a backticked span differs from the English;
  - quoted output such as "Welcome to nginx!" or "permission denied … docker.sock", because that is what appears in their terminal.
- **Names:** product names (Docker Desktop, Docker Hub, PowerShell), the titles of videos and articles on the References page, and participant names ("brave otter").

## Word choices to review

These recur everywhere, so they're worth settling first. Suggest a better word next to any that feel wrong.

| English | Malay used | Note |
|---|---|---|
| exercise | latihan | |
| step | langkah | |
| quiz | kuiz | |
| workshop | bengkel | |
| take-home track | trek bawa pulang | Awkward? Alternatives: "trek kendiri", "latihan susulan" |
| done / mark as done | selesai / tandakan selesai | |
| run (a command, a container) | jalankan | |
| stop / remove | hentikan / buang | "padam" is used for deleting a chat message |
| pull / download | muat turun | "pull" itself stays in commands |
| folder | folder | "direktori" is more formal |
| file | fail | |
| terminal | terminal | |
| browser | pelayar | "browser" is common in speech |
| refresh | muat semula | |
| copy / copied | salin / disalin | |
| output | output | |
| live (tracker) | langsung / penjejak langsung | |
| chat | sembang | |
| glossary / references | glosari / rujukan | |
| name badge | lencana nama | |
| fill in the blanks | isi tempat kosong | |
| trainer | jurulatih | |
| pet (the mascot) | haiwan / haiwan peliharaan | |
| tip | petua | |
| service (Compose) | service | A Docker term: the `services:` key |
| build (verb) | build / build semula | "dibina semula" in running text |
| database / table | pangkalan data / jadual | |
| path | laluan | Inside `code` it stays as written |
| environment variable | pemboleh ubah persekitaran | |
| dependency / package / library | dependency / pakej / library | |
| vulnerability / severity | kelemahan (keselamatan) / tahap keterukan | Scout's own words (high, critical) stay English |
| key (in YAML) / mapping | kunci / pemetaan | |
| mount (verb) | memasang | |
| healthy | sihat | |
| read-only | baca sahaja | |
| user-defined network | network yang ditentukan pengguna | |
| home folder / working folder | folder rumah / folder kerja | |
| create / edit / overwrite | cipta / sunting / tulis ganti | |
| throwaway (container) | pakai buang | |
| clean up | bersihkan | |
| storage / networking | storan / rangkaian | Group titles in the glossary |
| production (stage, mode) | production | As Docker and frameworks name it |
| secret / key | rahsia / kunci | |
| signal / stop signal / exit code | isyarat / isyarat berhenti / kod keluar | |
| killed (exit 137) | dimatikan secara paksa | |
| crash | ranap / ranapkan | |
| restart policy | polisi restart | |
| listen / listen address | mendengar / alamat dengar | |
| CPU architecture / processor / emulation | seni bina / pemproses / emulasi | |
| development | pembangunan | |
| capstone | projek akhir | |
| log rotation | digilir ("tidak pernah digilir") | |
| drive (disk) / driver | pemacu | Both, by context |

### Renderings the drafting flagged as uncertain

- **Glossary:**
  - "killed" (exit code 137) became "dimatikan secara paksa";
  - "the log never rotates" became "tidak pernah berputar". Perhaps "digilir"?
- **References:**
  - "A very fast big-picture tour" became "Lawatan gambaran besar yang sangat pantas";
  - "Older talks, still good on concepts" became "Ceramah lama, masih bagus untuk konsep".
- **Quiz:**
  - "high issues" (Scout) became "isu tahap tinggi";
  - "drops root" became "melepaskan root";
  - "resolves" (DNS) became "diselesaikan";
  - the `shop-cache-started` options were rephrased to answer "Apakah yang ditunggu oleh…".
- **Exercises:**
  - the `dockerignore` title became "Asingkan fail dengan .dockerignore". Perhaps "Jauhkan fail…"?
  - "the bytes still ship" became "baitnya masih dihantar bersama image";
  - `this-app` step 1 says "arahan (command)" to point at the compose `command:` key.
- **Passive forms:** "di-pull", "di-publish", "di-prune", "di-build", "di-pin" and "di-cache" are used for English verbs. The alternative is a Malay verb ("dimuat turun", "dibuang").
- **The two take-home tracks differ; please pick one form for each:**
  - "pin (a version)": Node uses "pin" / "di-pin", Laravel uses "menetapkan (versi)";
  - "floats on latest": Node uses "terapung pada", Laravel uses "bergantung pada";
  - "dangling images": Node uses "dangling image", Laravel uses "image dangling".
- **Take-home tracks, other renderings:**
  - "an empty or reset response" became "respons kosong atau yang diputuskan";
  - "the catch" became "kelemahannya";
  - "serves through php-fpm" became "dihidangkan melalui php-fpm";
  - "the polite way" became "cara yang sopan".

## Where the text lives

- **The app's own text:** `apps/web/src/locales/ms.ts`, next to the English in `en.ts`.
  - A missing key fails the build, and a test checks that every `{placeholder}` is kept.
  - Keep the placeholders as they are (`{count}`, `{name}`…) and move them wherever the Malay sentence needs them.
- **Course content:** `apps/api/resources/content/ms/`, mirroring the English files.
  - Each file holds only the prose, keyed by id.
  - Anything not translated yet shows in English, so a partial translation is safe to publish.
- **Messages from the server:** `apps/api/lang/ms/dojo.php`.

## Translating or reviewing content

From `apps/api`:

```sh
php artisan content:translations                        # how far along each file is, and what is out of date
php artisan content:translations --stamp=exercises.json # after writing or reviewing a file
```

Stamping records which English each entry was translated from. The content tests fail when the
English changes afterwards, and name the entry. Update the Malay, then stamp again. Only stamp after
the translation really matches the English. Stamping just to make the test pass defeats the check.

The tests also refuse a translation that:
- adds or drops a step, note or quiz option;
- changes a backticked command;
- tries to translate something that isn't prose (ids, commands, answers, minutes). Those always come from the English, so a translation can't break a command, a grade or anyone's progress.

## Progress

| Chunk | Status |
|---|---|
| App text (all pages) | drafted |
| Workshop exercises (all 14) | drafted |
| Workshop quiz (54 questions, 4 scenarios) | drafted |
| Glossary (80 terms) and references notes | drafted |
| Take-home tracks: Node, Laravel (exercises and quizzes) | drafted |
