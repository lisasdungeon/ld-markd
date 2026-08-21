# LD Markd

A Lisa's Dungeon module for Foundry VTT (v13/v14, system-agnostic) that lets
**players** see the conditions/effects currently active on tokens — NPCs,
monsters, and other party members — and gives the **GM** a dedicated Hub for
viewing and editing every NPC's conditions on the current scene.

## Features

- **Hover a token** → a panel floats next to it listing every active
  condition/effect on it (icon, name, description, remaining duration, and
  who/what applied it, when that can be resolved). Works on NPCs, monsters,
  and party members.
- **Close button** on every panel. Click it to dismiss a popup that would
  otherwise stay open from hover or target gestures.
- **Target a token** → instead of floating on the token (where it can get
  in the way), the panel docks in the top-right corner of the screen and
  stays there — even after you move your mouse away — updating live (e.g.
  when a round passes and a duration ticks down). Targeting multiple
  tokens stacks their panels in that same corner. Closing a targeted panel
  also clears that target.
- Visible to any player who can currently see the token (normal vision/fog
  rules still apply — hidden tokens are unaffected).
- **GM Hub**: a window listing every NPC/monster token on the *current
  scene only* as a card (portrait + name). Click a card to expand it and
  see its conditions, add a new one from the system's own status list,
  remove one, or edit one (opens the system's native effect sheet). Player
  characters are never listed. The Hub refreshes itself live as tokens or
  conditions change.
- **GM scene controls**: a toolbar group with a toggle (flip player
  visibility on/off instantly, mid-session, with a confirmation
  notification) and a button that opens the GM Hub.
- **Settings page toggle**: a world setting ("Show Scene Control Button")
  lets the GM hide those toolbar controls entirely if they don't want them
  cluttering the toolbar. It does not disable the underlying feature.

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

- **GM**: open the scene controls toolbar. The medical-notes icon toggles
  player visibility on/off (you'll get a confirmation notification either
  way). The address-card icon opens the **GM Hub**.
- **GM (Hub)**: click an NPC's card to expand it. Pick a status from the
  dropdown and click "Add" to apply it (statuses already active are
  disabled in the list); click the pencil to open that condition's own
  effect sheet, or the × to remove it outright.
- **GM**: to hide the toolbar controls without disabling the underlying
  feature, go to **Game Settings → Configure Settings → Module
  Settings → LD Markd** and turn off "Show Scene Control Button".
- **Players**: hover over any visible token (allies included) to see its
  conditions; right-click-target a token to keep the panel pinned while you
  act. Click the panel's Close button if it stays on screen.

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

The GM Hub's "add condition" list and "edit condition" sheet both delegate
to core Foundry APIs (`Actor#toggleStatusEffect` against
`CONFIG.statusEffects`, and the effect's own `.sheet`) rather than a custom
editor, so both are automatically correct for whatever system is active —
no LD Markd-specific condition data to maintain.

Player-facing panels open for any token that has an actor, including party
members. The GM Hub still lists only tokens whose actor has no player owner
(`actor.hasPlayerOwner === false`) — a system-agnostic proxy for "not a PC,"
not a literal actor-type check.

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
- `scripts/controls.js` — scene control toolbar group (toggle + open-hub button)
- `scripts/watcher.js` — player-facing hover/target panel rendering and positioning
- `scripts/gm-hub.js` — GM Hub window (ApplicationV2) + event wiring + refresh hooks
- `scripts/gm-hub-data.js` — scene-mob/condition/available-status data assembly
- `scripts/gm-hub-actions.js` — add/remove/edit condition operations
- `templates/gm-hub.hbs` — GM Hub Handlebars template
- `styles/module.css` — player-facing panel styling
- `styles/gm-hub.css` — GM Hub window styling
- `lang/en.json` — localization strings
- `dist/bundle.js` — built output Foundry actually loads (via Rollup)
- `__tests__/` — Jest test suite, one file per `scripts/` file, plus shared `helpers/`
- `CHANGELOG.md` — release history
