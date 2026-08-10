import { isModuleEnabled } from "./settings.js";
import { listDisplayConditions } from "./condition-data.js";

/**
 * @typedef {object} PanelEntry
 * @property {HTMLElement|null} el
 * @property {Token} token
 * @property {boolean} hovered
 * @property {boolean} pinned
 * @property {boolean} panelHover  Pointer is over the panel (keeps hover-panels open for scrolling).
 * @property {{ left: number, top: number }|null} userPos  User drag position for pinned panels.
 */

/** @type {Map<string, PanelEntry>} */
const entries = new Map();
/** @type {Map<string, ReturnType<typeof setTimeout>>} */
const hideTimers = new Map();
let tickerAttached = false;
/** @type {{ entry: PanelEntry, offsetX: number, offsetY: number }|null} */
let dragState = null;

const DOCK_ID = "ld-markd-dock";
const HOVER_GRACE_MS = 250;

export function initConditionWatch() {
  Hooks.on("hoverToken", onHoverToken);
  Hooks.on("targetToken", onTargetToken);
  Hooks.on("updateActiveEffect", (effect) => refreshActor(actorFromEffectParent(effect)));
  Hooks.on("createActiveEffect", (effect) => refreshActor(actorFromEffectParent(effect)));
  Hooks.on("deleteActiveEffect", (effect) => refreshActor(actorFromEffectParent(effect)));
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

function isNpcToken(token) {
  return Boolean(token?.actor) && token.actor.hasPlayerOwner === false;
}

function actorFromEffectParent(effect) {
  const parent = effect?.parent;
  if (!parent) return null;
  if (parent.actor) return parent.actor;
  if (parent.documentName === "Item" && parent.parent) return parent.parent;
  return parent;
}

function actorFromItem(item) {
  if (!item) return null;
  if (item.actor) return item.actor;
  if (item.parent?.documentName === "Actor" || item.parent?.effects) return item.parent;
  return item.parent ?? null;
}

function onHoverToken(token, hovered) {
  if (!isNpcToken(token)) return;
  if (hovered) {
    if (!isModuleEnabled()) return;
    clearHideTimer(token.id);
    setEntryState(token, { hovered: true });
    return;
  }
  // Grace period so the pointer can move from the token onto the panel
  // (e.g. to use the description scrollbar) without the panel vanishing.
  clearHideTimer(token.id);
  hideTimers.set(
    token.id,
    setTimeout(() => {
      hideTimers.delete(token.id);
      setEntryState(token, { hovered: false });
    }, HOVER_GRACE_MS)
  );
}

function onTargetToken(user, token, targeted) {
  if (user.id !== game.userId) return;
  if (!isNpcToken(token)) return;
  if (targeted && !isModuleEnabled()) return;
  if (!targeted) {
    const entry = entries.get(token.id);
    if (entry) entry.userPos = null;
  }
  setEntryState(token, { pinned: targeted });
}

function clearHideTimer(tokenId) {
  const timer = hideTimers.get(tokenId);
  if (timer !== undefined) {
    clearTimeout(timer);
    hideTimers.delete(tokenId);
  }
}

function setEntryState(token, patch) {
  let entry = entries.get(token.id);
  if (!entry) {
    entry = { el: null, token, hovered: false, pinned: false, panelHover: false, userPos: null };
    entries.set(token.id, entry);
  }
  Object.assign(entry, patch);

  const shouldShow = entry.hovered || entry.pinned || entry.panelHover;
  if (shouldShow) {
    if (!entry.el) entry.el = createPanelElement(entry);
    entry.el.dataset.tokenId = token.id;
    renderContent(entry);
    placePanel(entry);
    entry.el.classList.toggle("ldm-pinned", entry.pinned);
  } else {
    entry.el?.remove();
    entries.delete(token.id);
  }
}

/**
 * Targeted panels default to the top-right dock, or a user-dragged fixed
 * position. Hover-only panels float next to the token each frame.
 */
function placePanel(entry) {
  const { el, pinned, userPos } = entry;
  if (pinned) {
    el.classList.remove("ldm-floating");
    if (userPos) {
      if (el.parentElement !== document.body) document.body.appendChild(el);
      el.style.left = `${userPos.left}px`;
      el.style.top = `${userPos.top}px`;
      el.style.right = "auto";
    } else {
      el.style.left = "";
      el.style.top = "";
      el.style.right = "";
      const dock = getDockContainer();
      if (el.parentElement !== dock) dock.appendChild(el);
    }
  } else {
    el.classList.add("ldm-floating");
    el.style.right = "";
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
  clearHideTimer(tokenId);
  const entry = entries.get(tokenId);
  if (!entry) return;
  entry.el?.remove();
  entry.el = null;
  entries.delete(tokenId);
}

function clearAll() {
  for (const id of [...hideTimers.keys()]) clearHideTimer(id);
  for (const entry of entries.values()) entry.el?.remove();
  entries.clear();
  endDrag();
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

function createPanelElement(entry) {
  const el = document.createElement("div");
  el.classList.add("ld-markd-panel");
  el.addEventListener("pointerenter", () => onPanelEnter(entry));
  el.addEventListener("pointerleave", () => onPanelLeave(entry));
  el.addEventListener("pointerdown", (ev) => onPanelPointerDown(ev, entry));
  return el;
}

function onPanelEnter(entry) {
  const live = entries.get(entry.token.id);
  if (!live) return;
  clearHideTimer(live.token.id);
  live.panelHover = true;
}

function onPanelLeave(entry) {
  const live = entries.get(entry.token.id);
  if (!live) return;
  live.panelHover = false;
  if (!live.hovered && !live.pinned) {
    setEntryState(live.token, { panelHover: false });
  }
}

function onPanelPointerDown(ev, entry) {
  const live = entries.get(entry.token.id);
  if (!live?.pinned || !live.el) return;
  if (!ev.target.closest(".ldm-header")) return;
  if (ev.button !== 0) return;

  const rect = live.el.getBoundingClientRect();
  // Lift out of the dock into free fixed positioning at the current place.
  if (!live.userPos) {
    live.userPos = { left: rect.left, top: rect.top };
    placePanel(live);
  }

  dragState = {
    entry: live,
    offsetX: ev.clientX - rect.left,
    offsetY: ev.clientY - rect.top
  };
  live.el.classList.add("ldm-dragging");
  ev.preventDefault();

  window.addEventListener("pointermove", onDragMove);
  window.addEventListener("pointerup", onDragEnd, { once: true });
}

function onDragMove(ev) {
  const state = dragState;
  if (!state?.entry?.el) return;
  const { entry, offsetX, offsetY } = state;
  const left = Math.max(4, Math.min(window.innerWidth - 40, ev.clientX - offsetX));
  const top = Math.max(4, Math.min(window.innerHeight - 40, ev.clientY - offsetY));
  entry.userPos = { left, top };
  entry.el.style.left = `${left}px`;
  entry.el.style.top = `${top}px`;
}

function onDragEnd() {
  endDrag();
}

function endDrag() {
  if (dragState?.entry?.el) dragState.entry.el.classList.remove("ldm-dragging");
  dragState = null;
  window.removeEventListener("pointermove", onDragMove);
}

function renderContent(entry) {
  const { token, el } = entry;
  const conditions = listDisplayConditions(token.actor, { activeOnly: true });
  const rows = conditions.map(conditionRowHTML).join("");
  el.innerHTML = `
    <div class="ldm-header" title="${escapeHTML(game.i18n.localize("LDMARKD.Panel.DragHint"))}">
      <img class="ldm-token-img" src="${escapeHTML(token.document.texture?.src ?? token.actor?.img ?? "")}" alt="" />
      <span class="ldm-token-name">${escapeHTML(token.document.name)}</span>
    </div>
    <div class="ldm-effects">
      ${rows || `<div class="ldm-empty">${game.i18n.localize("LDMARKD.Panel.NoConditions")}</div>`}
    </div>
  `;
}

function conditionRowHTML(condition) {
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
  for (const id of [...hideTimers.keys()]) clearHideTimer(id);
  endDrag();
  entries.clear();
  tickerAttached = false;
}
