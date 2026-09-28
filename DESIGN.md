---
name: Docker Dojo
description: A 90-minute, hands-on Docker workshop. Copy a command, run it, tick it off.
colors:
  chalkboard-green: "#226929"
  chalkboard-green-deep: "#15561d"
  green-wash: "#dff6de"
  highlighter: "#fde75e"
  highlighter-wash: "#fff7c9"
  highlighter-ink: "#272201"
  bench-white: "#ffffff"
  bench-panel: "#f3f8f4"
  bench-panel-2: "#e9f1ea"
  rule: "#d9e0da"
  rule-strong: "#7e8a80"
  ink: "#141d16"
  ink-muted: "#535e55"
  terminal: "#131a15"
  terminal-text: "#e3eae4"
  terminal-muted: "#8c9e8f"
  terminal-prompt: "#80cd82"
  error-red: "#c22826"
  error-wash: "#ffece8"
typography:
  display:
    fontFamily: "Figtree Variable, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Figtree Variable, system-ui, sans-serif"
    fontSize: "1.44rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Figtree Variable, system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 650
    lineHeight: 1.35
  body:
    fontFamily: "Figtree Variable, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Figtree Variable, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 650
    lineHeight: 1.2
  code:
    fontFamily: "JetBrains Mono Variable, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.7
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "24px"
  "6": "32px"
  "7": "48px"
  "8": "64px"
components:
  button-primary:
    backgroundColor: "{colors.chalkboard-green}"
    textColor: "{colors.bench-white}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.chalkboard-green-deep}"
  button-secondary:
    backgroundColor: "{colors.bench-white}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-done:
    backgroundColor: "{colors.green-wash}"
    textColor: "{colors.chalkboard-green}"
    rounded: "{rounded.md}"
  tag:
    backgroundColor: "{colors.bench-panel-2}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.sm}"
    padding: "5px 8px"
  tag-here:
    backgroundColor: "{colors.highlighter}"
    textColor: "{colors.highlighter-ink}"
    rounded: "{rounded.sm}"
    padding: "5px 8px"
  code-block:
    backgroundColor: "{colors.terminal}"
    textColor: "{colors.terminal-text}"
    typography: "{typography.code}"
    rounded: "{rounded.md}"
    padding: "12px 16px 16px"
  expected-callout:
    backgroundColor: "{colors.highlighter-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px 24px"
  files-panel:
    backgroundColor: "{colors.bench-panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: Docker Dojo

## 1. Overview

**Creative North Star: "The Lab Bench"**

A well-run university lab session: clean white bench paper, a chalkboard-green instructor's
hand guiding each step, and a highlighter marking the one line that matters right now. The
student's terminal is the real stage; this interface is the printed handout next to it. It
has to be precise enough to trust at a glance, and warm enough that a nervous first-timer
keeps going.

Density is moderate: generous vertical rhythm between steps, tight and consistent inside
components. Fun is concentrated, never spread thin: the name badge, the pet, the "You are
here" highlight and the pass celebration carry the personality, so everything else can stay
calm. It follows PRODUCT.md's line: *"Fun comes from small, earned moments, not from
decoration everywhere."*

It rejects a generic SaaS dashboard (grey cards, stat tiles, blue buttons), a kids' learning
app (cartoon overload, rounded everything, primary colours), and Docker's own branding (no
Docker blue, no whale or container-block marks).

**Key Characteristics:**
- White bench, chalkboard-green actions, highlighter yellow only for "you are here" and celebrations.
- Near-black terminal code blocks with a green `$` prompt that is never copied.
- One sans (Figtree) for everything, JetBrains Mono for commands and ids.
- Flat by default: tinted panels and hairline rules, shadows only on floating things.
- Progress is always visible: header rail, exercise stepper, journey list.

## 2. Colors: The Lab Bench Palette

Restrained: tinted neutrals with a green whisper (hue 150), one committed action colour and
one rare highlight. Canonical values are OKLCH in `apps/web/src/style.css`; hex here is the
sRGB equivalent. Every text pairing passes WCAG AA in both themes.

### Primary
- **Chalkboard Green** (#226929, oklch(0.46 0.12 145)): primary buttons, links, progress fills,
  "done" states, focus rings. 6.8:1 on white. Hover deepens to **Chalkboard Green Deep** (#15561d).
- **Green Wash** (#dff6de): background of done buttons, selected quiz options, step numbers.

### Secondary
- **Highlighter** (#fde75e, oklch(0.92 0.155 100)): "You are here" tags and nodes, the current
  stepper segment, the "tried" slice of the quiz bar, text selection. Always with Highlighter
  Ink (#272201) text or an ink outline, because yellow alone fails 3:1 on white.
- **Highlighter Wash** (#fff7c9): the "You should see" callout and a passed quiz result.

### Neutral
- **Bench White** (#ffffff): page background.
- **Bench Panel** (#f3f8f4) and **Bench Panel 2** (#e9f1ea): side panels, footer, tags, track backgrounds.
- **Rule** (#d9e0da): dividers. **Rule Strong** (#7e8a80): control borders (3.6:1, meets 3:1 for UI).
- **Ink** (#141d16): all body text and headings. **Ink Muted** (#535e55): secondary text, 6.8:1.
- **Terminal** (#131a15), **Terminal Text** (#e3eae4), **Terminal Muted** (#8c9e8f), **Terminal Prompt** (#80cd82): code blocks only.
- **Error Red** (#c22826) on **Error Wash** (#ffece8): wrong answers and failures.

The dark theme keeps the same roles: bench becomes oklch(0.17 0.012 150), the green lifts to
oklch(0.74 0.15 145) with dark text on it, and the highlighter stays yellow.

### Named Rules
**The Highlighter Rule.** Yellow marks at most one "current" thing per view, plus
celebrations. If two things are highlighted, neither is.

**The Green Means Go Rule.** Green is for actions and completed progress, never decoration.
A done state always also carries a check icon or the word "Done".

## 3. Typography

**Body Font:** Figtree Variable (with system-ui)
**Mono Font:** JetBrains Mono Variable (with ui-monospace)

**Character:** Figtree is friendly without being childish: open, rounded terminals, sturdy
at bold weights on a projector. JetBrains Mono makes every command unambiguous (0 vs O, 1 vs l).

### Hierarchy
- **Display** (700, 2.25rem, 1.2, -0.025em): page titles. The home hero goes to 2.75rem.
- **Headline** (700, 1.44rem, 1.2): section headings.
- **Title** (650, 1.2rem, 1.35): exercise names in the journey, quiz questions.
- **Body** (400, 1rem, 1.6): step text and prose, capped at 68ch.
- **Label** (650, 0.875rem): buttons, meta lines, tags (0.8125rem).
- **Code** (JetBrains Mono, 0.875rem, 1.7): commands, file contents, participant ids.

Fixed rem scale at a 1.2 ratio. No fluid type except the Live tracker headline, which is read
from across a room. The user's text-size control scales the root.

### Named Rules
**The No Eyebrow Rule.** No small uppercase tracked labels above headings. Meta lines are
sentence case ("Exercise 7 of 10 · 5 min").

## 4. Elevation

Flat by default. Depth comes from tonal panels and hairline rules; shadows appear only on
things that float over content.

### Shadow Vocabulary
- **Float** (`0 12px 32px oklch(0.22 0.02 150 / 0.16), 0 2px 6px oklch(0.22 0.02 150 / 0.08)`):
  the pet picker, the sticky quiz submit bar.
- **Badge** (`0 6px 16px oklch(0.22 0.02 150 / 0.12)`): the tilted name badge only.

### Named Rules
**The Flat Bench Rule.** Cards, panels and lists never get shadows at rest. If it doesn't
float, it doesn't cast.

## 5. Components

### Buttons
- **Shape:** 8px radius, 40px tall (44px for the exercise "Mark as done"), 650 weight.
- **Primary:** Chalkboard Green, white text. One per view region; it is the next thing to press.
- **Secondary:** white with a Rule Strong border; hover tints to Bench Panel with an ink border.
- **Ghost:** no border, for low-stakes actions (Previous, Hide pet, Start over).
- **Done:** Green Wash with a green border and check icon; pressing again undoes.
- **States:** hover 150ms colour change, active nudges 1px down, focus shows a 2px green ring,
  disabled at 45% opacity. Buttons whose label swaps stack both labels in one grid cell so
  their width never changes.

### Code Blocks (signature)
- Terminal background, a header row with a mono label and icon (terminal or file), and a
  Copy button that swaps to "Copied" at the same width.
- Shell blocks show a green `$` per line, drawn in CSS so copying never includes it.

### Tags
- 6px radius, 0.8125rem 650 weight. Neutral (panel), OK (green wash), Here (highlighter).

### Callouts
- Tinted background plus a leading icon. "You should see" uses Highlighter Wash with an eye
  icon; errors use Error Wash with an alert icon. Never a coloured side stripe.

### Navigation
- Top bar: logo, three links, the student's id and progress tags. The active link is ink
  with a 2px green underline. A 3px green rail on the header's bottom edge fills with overall
  progress (exercises plus a passed quiz).

### Journey List
- The exercise list is one numbered line of stops: grey ring (to do), filled green with a
  check (done), highlighter with ink ring (you are here). The quiz is the final stop.

### Name Badge
- A "Hello, I'm" conference badge holding the anonymous id: green band, mono name, tilted
  -2deg. The only rotated object in the app.

### Pets
- A 96x104 sprite fixed bottom-right on screens 1000px and wider, never covering content.
  Reacts to real progress (wave on join, jump on done or pass, sad on fail); stills under
  reduced motion. Chosen in a floating picker toggled from the footer.

## 6. Do's and Don'ts

### Do:
- **Do** keep commands the most legible thing on screen: terminal blocks, JetBrains Mono, a Copy button on every one.
- **Do** show where the student is at all times: header rail, stepper, "You are here".
- **Do** pair every status colour with an icon or a word (check plus "Done", x plus "Your answer").
- **Do** write short, plain copy with no em-dashes.
- **Do** use the Float shadow only for things that overlap content.
- **Do** keep motion 150 to 250ms with ease-out-quart, and provide a reduced-motion alternative.
- **Do** make the Live tracker readable from the back of a room: sentences with big numbers and thick bars.

### Don't:
- **Don't** make it look like a generic SaaS dashboard: no grey card grids, no stat tiles, no hero-metric template.
- **Don't** make it look like a kids' learning app: no cartoon overload, no rounded-everything, no primary colours, no badges for badges' sake.
- **Don't** use Docker's branding: no Docker blue, no whale or container-block marks.
- **Don't** use a coloured `border-left` or `border-right` stripe on callouts, cards or list items.
- **Don't** put small uppercase tracked eyebrows above headings.
- **Don't** use yellow text on white, or highlight more than one "current" thing per view.
- **Don't** animate width, height or margins; scale with transforms instead.
