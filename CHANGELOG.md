# Changelog

## 1.3.7 — 2026-08-10

- GM Hub cards open expanded by default so condition lists, edit/remove
  controls, and the Add row are visible without clicking each card first.
  Headers still collapse/expand a card; collapsed state is remembered while
  the window stays open.

## 1.3.6 — 2026-08-10

- Condition descriptions now run through Foundry's TextEditor enrichment so
  PF2e `@UUID[...]{Label}` / `@Check[...]` markup shows as proper names and
  links instead of raw UUID text.
- "Applied by" no longer doubles when PF2e already provides a breakdown
  phrase; the granter name is used when available.

## 1.3.5 — 2026-08-10

- Hover panels stay open long enough to move the pointer onto them, and
  remain open while the pointer is over the panel so long descriptions can
  be scrolled without the popup vanishing.
- Targeted (pinned) panels can be dragged by their header to anywhere on
  the screen; untarging resets them to the default top-right dock stack.
- Panels accept pointer events (scrollbar + drag); the dock shell does not
  block the canvas.

## 1.3.4 — 2026-08-10

- **PF2e fix:** conditions are Item documents (`actor.conditions`), not core
  Active Effects. The player panel and GM Hub now list PF2e conditions and
  token-icon effect items, so applied statuses (e.g. Blinded) show in the
  list instead of "No active conditions" while icons already appeared on the
  token. Add/remove/edit use PF2e's condition APIs; Item create/update/delete
  hooks keep the UI in sync. Core Active Effect systems (dnd5e, etc.) are
  unchanged.

## 1.3.3 — 2026-08-10

- Player hover/target panels now only open for NPC/monster tokens
  (`actor.hasPlayerOwner === false`), matching the module description and
  the GM Hub filter. Player characters no longer get condition panels.
- Conditions list now includes transferred item Active Effects via
  `appliedEffects` / `allApplicableEffects` (Foundry v13/v14 + dnd5e), not
  only effects embedded directly on the actor.
- ActiveEffect create/update/delete hooks resolve Item parents up to their
  owning actor so transferred-effect changes refresh open panels.
- Indefinite duration badges ("None" / infinite remaining) are no longer
  shown on panels or in the GM Hub.
- GM Hub card expand/collapse state persists across force re-renders (add
  / remove condition no longer collapses the card you were editing).

## 1.3.1 — 2026-08-09

- Fixed a crash on opening the GM Hub: `bringToFront()` was called before
  `render()` finished, so Foundry tried to read `element.style` on an
  undefined frame. Open now awaits render, then brings the window forward
  only if it is actually rendered.

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
