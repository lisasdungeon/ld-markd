/**
 * Mutating operations the GM Hub triggers, delegated to each system's own
 * APIs so behavior stays correct (core Active Effects vs PF2e conditions).
 */

import { isPf2e } from "./condition-data.js";

export async function addCondition(token, statusId) {
  if (!statusId || !token?.actor) return;
  const actor = token.actor;
  // PF2e Actor#toggleStatusEffect already redirects condition slugs to
  // toggleCondition; calling either path is safe.
  if (isPf2e() && typeof actor.toggleCondition === "function") {
    await actor.toggleCondition(statusId, { active: true });
    return;
  }
  await actor.toggleStatusEffect(statusId, { active: true });
}

export async function removeCondition(token, effectId) {
  const actor = token?.actor;
  if (!actor || !effectId) return;

  if (isPf2e()) {
    const condition = actor.conditions?.get?.(effectId) ?? null;
    if (condition) {
      if (typeof actor.decreaseCondition === "function") {
        await actor.decreaseCondition(condition, { forceRemove: true });
      } else if (typeof condition.delete === "function") {
        await condition.delete();
      }
      return;
    }
    const item = actor.items?.get?.(effectId);
    if (item && (item.type === "condition" || item.type === "effect")) {
      await item.delete();
      return;
    }
  }

  const effect = actor.effects?.get?.(effectId);
  if (!effect) return;
  await effect.delete();
}

export function editCondition(token, effectId) {
  const actor = token?.actor;
  if (!actor || !effectId) return;

  if (isPf2e()) {
    const condition = actor.conditions?.get?.(effectId);
    if (condition?.sheet) {
      condition.sheet.render(true);
      return;
    }
    const item = actor.items?.get?.(effectId);
    if (item?.sheet) {
      item.sheet.render(true);
      return;
    }
  }

  const effect = actor.effects?.get?.(effectId);
  effect?.sheet?.render(true);
}
