/**
 * Read-only data assembly for the GM Hub: which NPC/monster tokens are on
 * the current scene, what conditions each one has, and which of the
 * system's native status effects are available to add.
 */

export function getSceneMobs() {
  if (!canvas?.tokens) return [];
  return canvas.tokens.placeables.filter((token) => token.actor && !token.actor.hasPlayerOwner).map(buildMobCard);
}

function buildMobCard(token) {
  const actor = token.actor;
  return {
    tokenId: token.id,
    name: token.document.name,
    img: token.document.texture?.src ?? actor.img ?? "",
    conditions: getConditions(actor),
    availableStatuses: getAvailableStatuses(actor)
  };
}

/**
 * Conditions on the actor plus transferred item effects. Disabled effects
 * stay visible (dimmed in the template) so the GM can still edit/remove them.
 */
function getConditions(actor) {
  const effects = listApplicableEffects(actor);
  return effects
    .filter((effect) => !effect.isSuppressed)
    .map((effect) => ({
      id: effect.id,
      name: effect.name,
      img: effect.img ?? "",
      disabled: effect.disabled,
      duration: getDurationLabel(effect)
    }));
}

function listApplicableEffects(actor) {
  if (typeof actor.allApplicableEffects === "function") {
    return [...actor.allApplicableEffects()];
  }
  if (!actor.effects) return [];
  return actor.effects.contents;
}

function getDurationLabel(effect) {
  try {
    const d = effect.duration;
    const label = d?.label;
    if (!label) return null;
    if (d.remaining === Infinity || d.seconds === Infinity) return null;
    if (/^(none|n\/a|—|-)$/i.test(String(label).trim())) return null;
    return label;
  } catch (err) {
    return null;
  }
}

function getAvailableStatuses(actor) {
  const statuses = CONFIG.statusEffects ?? [];
  const active = actor.statuses ?? new Set();
  // CONFIG.statusEffects is a Proxy-array (v13+); iterate only array slots.
  return [...statuses]
    .filter((status) => status?.id)
    .map((status) => ({
      id: status.id,
      name: game.i18n.localize(status.name ?? status.label ?? status.id),
      active: active.has(status.id)
    }));
}
