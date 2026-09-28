# Product

## Register

product

## Users

Adults learning Docker in a live, trainer-led workshop of about 90 minutes. Each student sits at
their own laptop with a terminal open next to the browser: they read a step, copy a command,
run it, check the result, and come back. Many are developers new to containers; some are
non-developers (analysts, QA, ops). They are anonymous (a random id, no account).

The trainer projects the Live tracker on a room screen to show how many people have joined
and how far the room has got. That screen is read from across the room, at a glance.

## Product Purpose

Docker Dojo walks a room through fourteen short, copy-paste exercises (containers, images,
image size and layers, the build cache, .dockerignore, multi-stage builds, vulnerability
scanning, volumes, networks, Docker Compose) and a fifteen-question quiz, in about 90 minutes.
The app itself runs in Docker, so it doubles as the final worked example.

Success looks like: every student finishes the exercises without getting lost, passes the
quiz, and the trainer can see at a glance who is stuck. Nobody should have to ask "where do
I type this?" or "did that work?".

## Brand Personality

Hands-on, friendly, confident. It should feel like a well-run lab session: practical,
encouraging, and precise, never childish or salesy. Copy is short and plain, with no
em-dashes. Fun comes from small, earned moments (the pet reacting, finishing a step), not
from decoration everywhere.

Reference feel: Linear and Raycast documentation, for their typographic discipline, tight
spacing and quiet high craft, with personality in the details rather than the chrome.

## Anti-references

- A generic SaaS dashboard: grey cards everywhere, stat tiles, blue buttons, admin-panel look.
- A kids' learning app: cartoon overload, rounded everything, primary colours, gamified badges.
- Docker's own branding: no Docker blue, no whale or container-block marks. The Dojo must
  not look like, or imply it is, an official Docker product.

## Design Principles

1. **The terminal is the main stage.** Every screen exists to get a command into the
   student's terminal and confirm it worked. Commands, files and expected output are the
   most legible things on the page.
2. **Always know where you are.** Progress through the ten exercises and the quiz is visible
   at every moment; the next step is obvious.
3. **Read from across the room.** Anything the trainer projects (the Live tracker above all)
   works at projector distance and contrast.
4. **Earned delight.** Celebrate real progress (a step done, a quiz passed); keep everything
   else calm and precise.
5. **Practise what we teach.** Clean structure, no clutter, nothing that needs explaining.

## Accessibility & Inclusion

WCAG 2.2 AA: 4.5:1 body text contrast (3:1 for large text and UI boundaries), full keyboard
use with visible focus, and `prefers-reduced-motion` respected everywhere (the pets stop
animating). Text size control and light/dark themes are built in; both must hold up at the
largest size. Status is never conveyed by colour alone (done, correct and wrong states also
use icons or words).
