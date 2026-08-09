# Changelog

## 1.0.0 (unreleased, pending Odinn's sign-off)

Initial build.

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
