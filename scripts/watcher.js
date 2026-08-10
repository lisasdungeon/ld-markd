import { isModuleEnabled } from "./settings.js";
import { listDisplayConditions } from "./condition-data.js";

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

const DOCK_ID = "ld-markd-dock";

export function initConditionWatch() {
  Hooks.on("hoverToken", onHoverToken);
  Hooks.on("targetToken", onTargetToken);
  Hooks.on("updateActiveEffect", (effect) => refreshActor(actorFromEffectParent(effect)));
  Hooks.on("createActiveEffect", (effect) => refreshActor(actorFromEffectParent(effect)));
  Hooks.on("deleteActiveEffect", (effect) => refreshActor(actorFromEffectParent(effect)));
  // PF2e (and similar) store conditions as Items — refresh when those change.
  Hooks.on("createItem", (item) => refreshActor(actorFromItem(item)));
  Hooks.on("updateItem", (item) => refreshActor(actorFromItem(item)));
  Hooks.on("deleteItem", (item) => refreshActor(actorFromItem(item)));
  Hooks.on("updateActor", (actor) => refreshActor(actor));
  Hooks.on("updateCombat", () => refreshAllContent());
  Hooks.on("deleteToken", (tokenDoc) => removeEntry(tokenDoc.id));
  Hooks.on("ldMarkd.enabledChanged", (enabled) => {
    if (!enabled) clearAll();
  });
}

/** NPC/monster proxy: any actor with no player owner (system-agnostic). */
function isNpcToken(token) {
  return Boolean(token?.actor) && token.actor.hasPlayerOwner === false;
}

/**
 * ActiveEffect hooks fire with parent = Actor or Item. Resolve to the Actor
 * so transferred item-effects still refresh open panels.
 */
function actorFromEffectParent(effect) {
  const parent = effect?.parent;
  if (!parent) return null;
  if (parent.actor) return parent.actor;
  if (parent.documentName === "Item" && parent.parent) return parent.parent;
  return parent;
}

/** Item hooks: parent is the Actor for embedded items. */
function actorFromItem(item) {
  if (!item) return null;
  if (item.actor) return item.actor;
  if (item.parent?.documentName === "Actor" || item.parent?.effects) return item.parent;
  return item.parent ?? null;
}

function onHoverToken(token, hovered) {
  if (!isNpcToken(token)) return;
  if (hovered && !isModuleEnabled()) return;
  setEntryState(token, { hovered });
}

function onTargetToken(user, token, targeted) {
  if (user.id !== game.userId) return;
  if (!isNpcToken(token)) return;
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
    placePanel(entry);
    entry.el.classList.toggle("ldm-pinned", entry.pinned);
  } else {
    entry.el?.remove();
    entries.delete(token.id);
  }
}

/**
 * Targeted (pinned) tokens dock a fixed panel in the top-right corner of
 * the screen, out of the way of the token itself. Hover-only tokens float
 * a panel next to the token and track it every frame.
 */
function placePanel(entry) {
  const { el, pinned } = entry;
  if (pinned) {
    el.classList.remove("ldm-floating");
    el.style.left = "";
    el.style.top = "";
    const dock = getDockContainer();
    if (el.parentElement !== dock) dock.appendChild(el);
  } else {
    el.classList.add("ldm-floating");
    if (el.parentElement !== document.body) document.body.appendChild(el);
    positionPanel(entry);
    ensureTicker();
  }
}

function getDockContainer() {
  let dock = document.getElementById(DOCK_ID);
  if (!dock) {
    dock = document.createElement("div");
    dock.id = DOCK_ID;
    document.body.appendChild(dock);
  }
  return dock;
}

function removeEntry(tokenId) {
  const entry = entries.get(tokenId);
  if (!entry) return;
  entry.el?.remove();
  entries.delete(tokenId);
}

function clearAll() {
  for (const entry of entries.values()) entry.el?.remove();
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

function renderContent(entry) {
  const { token, el } = entry;
  const conditions = listDisplayConditions(token.actor, { activeOnly: true });
  const rows = conditions.map(conditionRowHTML).join("");
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

function conditionRowHTML(condition) {
  // DisplayCondition DTOs always provide string fields for img/description.
  const { duration, description, appliedBy, img, name } = condition;
  return `
    <div class="ldm-effect">
      <img class="ldm-effect-icon" src="${escapeHTML(img)}" alt="" />
      <div class="ldm-effect-body">
        <div class="ldm-effect-title-row">
          <span class="ldm-effect-name">${escapeHTML(name)}</span>
          ${duration ? `<span class="ldm-effect-duration">${escapeHTML(duration)}</span>` : ""}
        </div>
        ${appliedBy ? `<div class="ldm-effect-applied-by">${escapeHTML(game.i18n.localize("LDMARKD.Panel.AppliedBy"))}: ${escapeHTML(appliedBy)}</div>` : ""}
        ${description ? `<div class="ldm-effect-description">${description}</div>` : ""}
      </div>
    </div>
  `;
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

function hasFloatingEntries() {
  for (const entry of entries.values()) {
    if (!entry.pinned) return true;
  }
  return false;
}

function tick() {
  if (!hasFloatingEntries()) {
    canvas.app.ticker.remove(tick);
    tickerAttached = false;
    return;
  }
  for (const entry of entries.values()) {
    if (!entry.pinned) positionPanel(entry);
  }
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
