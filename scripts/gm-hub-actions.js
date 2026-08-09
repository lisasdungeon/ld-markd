/**
 * Mutating operations the GM Hub triggers, all delegated to the actor's
 * own/native Foundry APIs so behavior stays correct for whatever game
 * system is active.
 */

export async function addCondition(token, statusId) {
  if (!statusId || !token?.actor) return;
  await token.actor.toggleStatusEffect(statusId, { active: true });
}

export async function removeCondition(token, effectId) {
  const effect = token?.actor?.effects?.get(effectId);
  if (!effect) return;
  await effect.delete();
}

export function editCondition(token, effectId) {
  const effect = token?.actor?.effects?.get(effectId);
  effect?.sheet?.render(true);
}
