/**
 * Read-only data assembly for the GM Hub: which NPC/monster tokens are on
 * the current scene, what conditions each one has, and which of the
 * system's native status effects are available to add.
 */

import { listDisplayConditions, listAvailableStatuses } from "./condition-data.js";

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
    availableStatuses: listAvailableStatuses(actor)
  };
}

/**
 * Conditions for the Hub. Disabled core AEs stay visible (dimmed). PF2e
 * lists active condition items (and effect items with token icons).
 */
function getConditions(actor) {
  return listDisplayConditions(actor, { activeOnly: false }).map((condition) => ({
    id: condition.id,
    name: condition.name,
    img: condition.img,
    disabled: condition.disabled,
    duration: condition.duration
  }));
}
