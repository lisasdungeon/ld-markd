import { isModuleEnabled } from "./settings.js";

/**
 * @typedef {object} PanelEntry
 * @property {HTMLElement|null} el
 * @property {Token} token
 * @property {boolean} hovered
 * @property {boolean} pinned
 */

/** @type {Map<string, PanelEntry>} */
const entries = new Map();
let tickerAttached = false;

export function initConditionWatch() {
  Hooks.on("hoverToken", onHoverToken);
  Hooks.on("targetToken", onTargetToken);
  Hooks.on("updateActiveEffect", (effect) => refreshActor(effect.parent));
  Hooks.on("createActiveEffect", (effect) => refreshActor(effect.parent));
  Hooks.on("deleteActiveEffect", (effect) => refreshActor(effect.parent));
  Hooks.on("updateActor", (actor) => refreshActor(actor));
  Hooks.on("updateCombat", () => refreshAllContent());
  Hooks.on("deleteToken", (tokenDoc) => removeEntry(tokenDoc.id));
  Hooks.on("ldMarkd.enabledChanged", (enabled) => {
    if (!enabled) clearAll();
  });
}

function onHoverToken(token, hovered) {
  if (!token?.actor) return;
  if (hovered && !isModuleEnabled()) return;
  setEntryState(token, { hovered });
}

function onTargetToken(user, token, targeted) {
  if (user.id !== game.userId) return;
  if (!token?.actor) return;
  if (targeted && !isModuleEnabled()) return;
  setEntryState(token, { pinned: targeted });
}

function setEntryState(token, patch) {
  let entry = entries.get(token.id);
  if (!entry) {
    entry = { el: null, token, hovered: false, pinned: false };
    entries.set(token.id, entry);
  }
  Object.assign(entry, patch);

  const shouldShow = entry.hovered || entry.pinned;
  if (shouldShow) {
    if (!entry.el) entry.el = createPanelElement();
    renderContent(entry);
    if (!entry.el.isConnected) document.body.appendChild(entry.el);
    positionPanel(entry);
    entry.el.classList.toggle("ldm-pinned", entry.pinned);
    ensureTicker();
  } else {
    entry.el?.remove();
    entries.delete(token.id);
  }
}

function removeEntry(tokenId) {
  const entry = entries.get(tokenId);
  if (!entry) return;
  entry.el.remove();
  entries.delete(tokenId);
}

function clearAll() {
  for (const entry of entries.values()) entry.el.remove();
  entries.clear();
}

function refreshActor(actor) {
  if (!actor) return;
  for (const entry of entries.values()) {
    if (entry.token.actor?.id === actor.id) renderContent(entry);
  }
}

function refreshAllContent() {
  for (const entry of entries.values()) renderContent(entry);
}

function createPanelElement() {
  const el = document.createElement("div");
  el.classList.add("ld-markd-panel");
  return el;
}

function getEffects(token) {
  const actor = token.actor;
  if (!actor?.effects) return [];
  return actor.effects.contents.filter((e) => !e.disabled && !e.isSuppressed);
}

function renderContent(entry) {
  const { token, el } = entry;
  const effects = getEffects(token);
  const rows = effects.map(effectRowHTML).join("");
  el.innerHTML = `
    <div class="ldm-header">
      <img class="ldm-token-img" src="${escapeHTML(token.document.texture?.src ?? token.actor?.img ?? "")}" alt="" />
      <span class="ldm-token-name">${escapeHTML(token.document.name)}</span>
    </div>
    <div class="ldm-effects">
      ${rows || `<div class="ldm-empty">${game.i18n.localize("LDMARKD.Panel.NoConditions")}</div>`}
    </div>
  `;
}

function effectRowHTML(effect) {
  const duration = getDurationLabel(effect);
  const description = getDescriptionHTML(effect);
  const appliedBy = getAppliedByLabel(effect);
  return `
    <div class="ldm-effect">
      <img class="ldm-effect-icon" src="${escapeHTML(effect.img ?? "")}" alt="" />
      <div class="ldm-effect-body">
        <div class="ldm-effect-title-row">
          <span class="ldm-effect-name">${escapeHTML(effect.name)}</span>
          ${duration ? `<span class="ldm-effect-duration">${escapeHTML(duration)}</span>` : ""}
        </div>
        ${appliedBy ? `<div class="ldm-effect-applied-by">${escapeHTML(game.i18n.localize("LDMARKD.Panel.AppliedBy"))}: ${escapeHTML(appliedBy)}</div>` : ""}
        ${description ? `<div class="ldm-effect-description">${description}</div>` : ""}
      </div>
    </div>
  `;
}

function getDurationLabel(effect) {
  try {
    const d = effect.duration;
    return d?.label || null;
  } catch (err) {
    return null;
  }
}

function getDescriptionHTML(effect) {
  return effect.description ?? "";
}

function getAppliedByLabel(effect) {
  if (!effect.origin) return null;
  try {
    const origin = fromUuidSync(effect.origin);
    return origin?.name ?? null;
  } catch (err) {
    return null;
  }
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function positionPanel(entry) {
  const { token, el } = entry;
  if (!canvas?.ready) return;

  const topRight = new PIXI.Point(token.x + token.w, token.y);
  const screen = canvas.stage.worldTransform.apply(topRight);
  const rect = canvas.app.view.getBoundingClientRect();
  const x = rect.left + screen.x;
  const y = rect.top + screen.y;

  el.style.left = `${x + 8}px`;
  el.style.top = `${y}px`;

  const box = el.getBoundingClientRect();
  if (box.right > window.innerWidth) el.style.left = `${Math.max(4, x - box.width - 8)}px`;
  if (box.bottom > window.innerHeight) el.style.top = `${Math.max(4, window.innerHeight - box.height - 8)}px`;
}

function tick() {
  if (entries.size === 0) {
    canvas.app.ticker.remove(tick);
    tickerAttached = false;
    return;
  }
  for (const entry of entries.values()) positionPanel(entry);
}

function ensureTicker() {
  if (tickerAttached) return;
  tickerAttached = true;
  canvas.app.ticker.add(tick);
}

/** Resets module-level state between test runs. Not used at runtime. */
export function _resetForTests() {
  entries.clear();
  tickerAttached = false;
}
