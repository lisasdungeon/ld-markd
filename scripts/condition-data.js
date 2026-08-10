/**
 * System-agnostic condition listing for display (player panel + GM Hub).
 *
 * Core Foundry systems (e.g. dnd5e): Active Effects on the actor.
 * PF2e: conditions are Item documents (`actor.conditions` / item type
 * "condition"), not core Active Effects. Token HUD icons come from
 * PF2e's temporaryEffects override synthesizing those items.
 */

/**
 * @typedef {object} DisplayCondition
 * @property {string} id
 * @property {string} name
 * @property {string} img
 * @property {boolean} disabled
 * @property {string|null} duration
 * @property {string} description
 * @property {string|null} appliedBy
 * @property {"active-effect"|"pf2e-condition"|"pf2e-effect"} kind
 */

export function isPf2e() {
  return game.system?.id === "pf2e";
}

/**
 * @param {Actor|null|undefined} actor
 * @param {{ activeOnly?: boolean }} [options]
 * @returns {DisplayCondition[]}
 */
export function listDisplayConditions(actor, { activeOnly = true } = {}) {
  if (!actor) return [];
  if (isPf2e()) return listPf2eConditions(actor, { activeOnly });
  return listCoreActiveEffects(actor, { activeOnly });
}

/**
 * Statuses available to add in the GM Hub dropdown.
 * @param {Actor} actor
 */
export function listAvailableStatuses(actor) {
  const statuses = CONFIG.statusEffects ?? [];
  return [...statuses]
    .filter((status) => status?.id)
    .map((status) => ({
      id: status.id,
      name: game.i18n.localize(status.name ?? status.label ?? status.id),
      active: isStatusActiveOnActor(actor, status.id)
    }));
}

function isStatusActiveOnActor(actor, statusId) {
  if (!actor) return false;
  if (isPf2e()) {
    if (typeof actor.hasCondition === "function") return actor.hasCondition(statusId);
    if (actor.conditions?.hasType) return actor.conditions.hasType(statusId);
  }
  const active = actor.statuses ?? new Set();
  return active.has(statusId);
}

function listCoreActiveEffects(actor, { activeOnly }) {
  const effects = collectCoreEffects(actor);
  return effects
    .filter((effect) => {
      if (effect.isSuppressed) return false;
      if (activeOnly && effect.disabled) return false;
      return true;
    })
    .map((effect) => ({
      id: effect.id,
      name: effect.name,
      img: effect.img ?? "",
      disabled: Boolean(effect.disabled),
      duration: getCoreDurationLabel(effect),
      description: effect.description ?? "",
      appliedBy: getCoreAppliedBy(effect),
      kind: "active-effect"
    }));
}

function collectCoreEffects(actor) {
  if (typeof actor.allApplicableEffects === "function") {
    return [...actor.allApplicableEffects()];
  }
  if (Array.isArray(actor.appliedEffects)) return actor.appliedEffects;
  if (!actor.effects) return [];
  if (actor.effects.contents) return actor.effects.contents;
  return [...actor.effects];
}

function listPf2eConditions(actor, { activeOnly }) {
  const rows = [];
  const seen = new Set();

  for (const condition of iterPf2eConditions(actor)) {
    if (activeOnly && condition.active === false) continue;
    // Skip in-memory-only duplicates when a stored copy exists with same id handling
    if (!condition.id || seen.has(condition.id)) continue;
    seen.add(condition.id);
    rows.push({
      id: condition.id,
      name: condition.name ?? condition.slug ?? condition.id,
      img: condition.img ?? "",
      disabled: condition.active === false,
      duration: getPf2eDurationLabel(condition),
      description: getPf2eDescription(condition),
      appliedBy: getPf2eAppliedBy(condition),
      kind: "pf2e-condition"
    });
  }

  // PF2e effect items that show a token icon (same source as temporaryEffects).
  const effectItems = actor.itemTypes?.effect ?? [];
  for (const effect of effectItems) {
    if (!effect?.id || seen.has(effect.id)) continue;
    if (effect.system?.tokenIcon?.show === false) continue;
    if (!game.user?.isGM && effect.isIdentified === false) continue;
    seen.add(effect.id);
    rows.push({
      id: effect.id,
      name: effect.name ?? effect.id,
      img: effect.img ?? "",
      disabled: false,
      duration: getPf2eDurationLabel(effect),
      description: getPf2eDescription(effect),
      appliedBy: null,
      kind: "pf2e-effect"
    });
  }

  return rows;
}

function iterPf2eConditions(actor) {
  const conditions = actor.conditions;
  // Real PF2e ActorConditions is a Collection (iterable over all entries).
  if (conditions && typeof conditions[Symbol.iterator] === "function") {
    return conditions;
  }
  // Test doubles / partial mocks may only expose `.active`.
  if (conditions?.active != null && typeof conditions.active !== "function") {
    const active = conditions.active;
    if (Array.isArray(active) || typeof active[Symbol.iterator] === "function") {
      return active;
    }
  }
  if (actor.itemTypes?.condition) return actor.itemTypes.condition;
  return [];
}

function getCoreDurationLabel(effect) {
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

function getCoreAppliedBy(effect) {
  if (!effect.origin) return null;
  try {
    const origin = fromUuidSync(effect.origin);
    return origin?.name ?? null;
  } catch (err) {
    return null;
  }
}

function getPf2eDurationLabel(item) {
  try {
    const remaining = item.remainingDuration;
    if (remaining && !remaining.expired && Number.isFinite(remaining.remaining) && remaining.remaining > 0) {
      // remaining is in seconds for many effects; keep simple badge text.
      const total = remaining.remaining;
      if (total >= 86400) return `${Math.ceil(total / 86400)}d`;
      if (total >= 3600) return `${Math.ceil(total / 3600)}h`;
      if (total >= 60) return `${Math.ceil(total / 60)}m`;
      return `${Math.ceil(total)}s`;
    }
    const unit = item.system?.duration?.unit;
    const value = item.system?.duration?.value;
    if (!unit || unit === "unlimited" || unit === "encounter") return null;
    if (value == null) return null;
    return `${value} ${unit}`;
  } catch (err) {
    return null;
  }
}

function getPf2eDescription(item) {
  try {
    const desc = item.system?.description?.value ?? item.description ?? "";
    return typeof desc === "string" ? desc : "";
  } catch (err) {
    return "";
  }
}

function getPf2eAppliedBy(condition) {
  try {
    // Prefer the granter name only. PF2e `breakdown` is already a full
    // "Applied By: …" phrase and would double-label in the panel.
    const appliedBy = condition.appliedBy;
    if (appliedBy?.name) return appliedBy.name;
    const breakdown = condition.breakdown;
    if (!breakdown) return null;
    const stripped = String(breakdown).replace(/^[^:]+:\s*/i, "").trim();
    return stripped || breakdown;
  } catch (err) {
    return null;
  }
}

/**
 * Resolve Foundry/PF2e inline enrichers (@UUID, @Check, …) to display HTML.
 * Falls back to stripping enrichers to their brace labels when TextEditor
 * is unavailable (tests / early boot).
 * @param {string} raw
 * @returns {Promise<string>}
 */
export async function enrichDescriptionHTML(raw) {
  if (!raw) return "";
  const editor =
    globalThis.foundry?.applications?.ux?.TextEditor?.implementation ?? globalThis.TextEditor ?? null;
  if (typeof editor?.enrichHTML === "function") {
    try {
      return await editor.enrichHTML(raw, {
        async: true,
        secrets: false,
        documents: true,
        links: true,
        rolls: true,
        embeds: false
      });
    } catch (err) {
      // fall through
    }
  }
  return stripInlineEnrichers(raw);
}

/**
 * @param {string} html
 * @returns {string}
 */
export function stripInlineEnrichers(html) {
  return String(html)
    .replace(/@\w+\[([^\]]+)\]\{([^}]+)\}/g, "$2")
    .replace(/@\w+\[([^\]]+)\]/g, "$1");
}
