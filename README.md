# LD Markd

A Lisa's Dungeon module for Foundry VTT (v13/v14, system-agnostic) that lets
**players** see the conditions/effects currently active on NPC and monster
tokens — icon, description, and remaining duration — without needing
ownership of the token.

## Features

- **Hover a token** → a panel floats next to it listing every active
  condition/effect on it (icon, name, description, remaining duration, and
  who/what applied it, when that can be resolved).
- **Target a token** → instead of floating on the token (where it can get
  in the way), the panel docks in the top-right corner of the screen and
  stays there — even after you move your mouse away — updating live (e.g.
  when a round passes and a duration ticks down). Targeting multiple
  tokens stacks their panels in that same corner.
- Visible to any player who can currently see the token (normal vision/fog
  rules still apply — hidden tokens are unaffected).
- **GM scene control toggle**: a control group in the scene controls toolbar
  lets the GM flip the whole feature on/off instantly, mid-session, for
  every connected player.
- **Settings page toggle**: a world setting ("Show Scene Control Button")
  lets the GM hide that toolbar button entirely if they don't want it
  cluttering the toolbar.

## Installation

1. Copy the `ld-markd` folder into your Foundry `Data/modules/`
   directory (so the path is `Data/modules/ld-markd/module.json`).
2. Restart Foundry (or refresh), then enable **LD Markd** in your
   world's **Manage Modules** screen.

There's no external manifest URL yet — this is unpublished, install it via
the folder-copy method above (or zip it and use "Install Module" → browse to
a local file, if your Foundry build supports that).

The repo ships a pre-built `dist/bundle.js` — Foundry loads that directly,
so no build step is required just to run the module. You only need the
Node tooling below if you're changing the source.

## Usage

- **GM**: open the scene controls toolbar and click the "Toggle Condition
  Watch" control (medical-notes icon) to enable/disable the feature for
  everyone.
- **GM**: to hide that button from the toolbar without disabling the
  feature itself, go to **Game Settings → Configure Settings → Module
  Settings → LD Markd** and turn off "Show Scene Control Button".
- **Players**: hover over any visible NPC/monster token to see its
  conditions; right-click-target a token to keep the panel pinned while you
  act.

## How duration is calculated

LD Markd reads Foundry's built-in `ActiveEffect#duration` getter, which
most systems (dnd5e, pf2e, etc.) populate automatically based on
rounds/turns/seconds elapsed in the active combat. If a system or a
specific effect doesn't populate duration data, no duration badge is shown
for that effect — this module doesn't invent one.

## System-agnostic scope

This module reads whatever is on `actor.effects` (Foundry's core
`ActiveEffect` documents) for the token's actor, since that's the one
condition/effect representation shared across systems. If a particular
system tracks its "conditions" as a totally separate data structure (e.g. a
custom item type) rather than as Active Effects, this module won't see
those — most modern systems represent status conditions as Active Effects
under the hood, but it's worth a quick check in unfamiliar systems.

## Development

```sh
npm install     # installs Jest, ESLint, Rollup
npm run lint    # eslint scripts/**/*.js
npm test        # Jest, with coverage; enforces 100% branches/functions/lines/statements
npm run build   # bundles scripts/main.js -> dist/bundle.js
npm run watch   # rebuilds dist/bundle.js on change
```

Every source file in `scripts/` is required to carry its own full test file
in `__tests__/` at 100% coverage on every metric before it's considered
done. `dist/bundle.js` must be rebuilt (and the rebuilt file committed)
after any change to `scripts/`.

## Files

- `module.json` — manifest
- `scripts/main.js` — entry point
- `scripts/settings.js` — world settings
- `scripts/controls.js` — scene control toolbar group
- `scripts/watcher.js` — hover/target panel rendering and positioning
- `styles/module.css` — panel styling
- `lang/en.json` — localization strings
- `dist/bundle.js` — built output Foundry actually loads (via Rollup)
- `__tests__/` — Jest test suite, one file per `scripts/` file
- `CHANGELOG.md` — release history
