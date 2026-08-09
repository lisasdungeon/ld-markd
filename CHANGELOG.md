# Changelog

## 1.3.0 — 2026-08-09

- Fixed the GM Hub not opening from the scene-control address-card button.
  Foundry v13 calls tool handlers as `onChange(event, active)`; the previous
  handlers read the first argument as the active flag, so the hub open path
  and the visibility toggle never received the real boolean.
- Hub window interactions (expand card, add/remove/edit condition) now use
  ApplicationV2 `actions` instead of re-binding DOM listeners every render.
- Hub open/refresh always force-renders and brings the window to the front.

## 1.2.0 — 2026-08-09

- Added the **GM Hub**: a window listing every NPC/monster token on the
  current scene only (player characters excluded) as a card. Click a card
  to see its conditions, add one from the system's own native status list,
  remove one, or edit one (opens the effect's own sheet). Refreshes live
  as tokens/conditions/scene change.
- Added a scene control button that opens the GM Hub, alongside the
  existing player-visibility toggle in the same toolbar group.
- The player-visibility toggle now shows a confirmation notification to
  the GM when flipped, instead of doing so silently.

## 1.1.0 — 2026-08-09

- Targeted (pinned) panels now dock in the top-right corner of the screen
  instead of floating on top of the token, so they stay out of the way.
  Multiple targeted tokens stack in that same corner. Hover-only panels
  are unchanged — they still float next to the token.

## 1.0.0 — 2026-08-09

Initial packaged build. Not yet signed off by Odinn as feature-complete.

- Hover/target panel showing NPC/monster conditions (icon, description,
  remaining duration, applied-by when resolvable) for any player who can
  see the token.
- GM scene control toggle to enable/disable the feature live for all
  connected clients.
- World setting to show/hide that scene control button.
- Full Jest test suite (`__tests__/`) at 100% statement/branch/function/line
  coverage across every source file, per the Dev Bible's testing chapter.
- ESLint + Rollup build pipeline (`npm run lint` / `npm run build`);
  `module.json` loads the built `dist/bundle.js`.
