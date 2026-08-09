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

function getConditions(actor) {
  if (!actor?.effects) return [];
  return actor.effects.contents
    .filter((effect) => !effect.isSuppressed)
    .map((effect) => ({
      id: effect.id,
      name: effect.name,
      img: effect.img ?? "",
      disabled: effect.disabled,
      duration: getDurationLabel(effect)
    }));
}

function getDurationLabel(effect) {
  try {
    return effect.duration?.label || null;
  } catch (err) {
    return null;
  }
}

function getAvailableStatuses(actor) {
  const statuses = CONFIG.statusEffects ?? [];
  const active = actor.statuses ?? new Set();
  return statuses
    .filter((status) => status.id)
    .map((status) => ({
      id: status.id,
      name: game.i18n.localize(status.name ?? status.label ?? status.id),
      active: active.has(status.id)
    }));
}
