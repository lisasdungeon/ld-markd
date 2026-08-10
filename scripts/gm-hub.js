import { getSceneMobs } from "./gm-hub-data.js";
import { addCondition, removeCondition, editCondition } from "./gm-hub-actions.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class GMHubApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "ld-markd-gm-hub",
    classes: ["ld-markd-gm-hub"],
    tag: "div",
    window: { title: "LDMARKD.Hub.Title", resizable: true, minimizable: true },
    position: { width: 760, height: 640 },
    actions: {
      "toggle-card": GMHubApp.#onToggleCard,
      "add-condition": GMHubApp.#onAddCondition,
      "remove-condition": GMHubApp.#onRemoveCondition,
      "edit-condition": GMHubApp.#onEditCondition
    }
  };

  static PARTS = {
    main: { template: "modules/ld-markd/templates/gm-hub.hbs" }
  };

  /** @type {Set<string>} Token ids whose cards stay expanded across re-renders. */
  expandedTokenIds = new Set();

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.mobs = getSceneMobs().map((mob) => ({
      ...mob,
      expanded: this.expandedTokenIds.has(mob.tokenId)
    }));
    return context;
  }

  static #onToggleCard(event, target) {
    const card = target.closest(".ldm-hub-card");
    if (!card) return;
    card.classList.toggle("ldm-expanded");
    const tokenId = card.dataset.tokenId;
    if (!tokenId) return;
    if (card.classList.contains("ldm-expanded")) this.expandedTokenIds.add(tokenId);
    else this.expandedTokenIds.delete(tokenId);
  }

  static async #onAddCondition(event, target) {
    const tokenId = target.dataset.tokenId;
    const select = this.element.querySelector(`select[data-token-id="${tokenId}"]`);
    const token = canvas.tokens.get(tokenId);
    if (!token || !select?.value) return;
    await addCondition(token, select.value);
    await this.render({ force: true });
  }

  static async #onRemoveCondition(event, target) {
    const token = tokenFromCard(target);
    const effectId = target.dataset.effectId;
    if (!token) return;
    await removeCondition(token, effectId);
    await this.render({ force: true });
  }

  static #onEditCondition(event, target) {
    const token = tokenFromCard(target);
    const effectId = target.dataset.effectId;
    if (!token) return;
    editCondition(token, effectId);
  }
}

function tokenFromCard(el) {
  const tokenId = el.closest(".ldm-hub-card")?.dataset.tokenId;
  return tokenId ? canvas.tokens.get(tokenId) : null;
}

let hubInstance = null;

export async function openGMHub() {
  if (!hubInstance) hubInstance = new GMHubApp();
  await hubInstance.render({ force: true });
  // Only after render — bringToFront reads element.style and throws if the
  // frame is not in the DOM yet.
  if (hubInstance.rendered) hubInstance.bringToFront?.();
}

export function refreshGMHub() {
  if (hubInstance?.rendered) hubInstance.render({ force: true });
}

export function registerGMHubHooks() {
  const refresh = () => refreshGMHub();
  Hooks.on("createToken", refresh);
  Hooks.on("deleteToken", refresh);
  Hooks.on("updateToken", refresh);
  Hooks.on("createActiveEffect", refresh);
  Hooks.on("updateActiveEffect", refresh);
  Hooks.on("deleteActiveEffect", refresh);
  // PF2e conditions are Items — keep the Hub in sync when they change.
  Hooks.on("createItem", refresh);
  Hooks.on("updateItem", refresh);
  Hooks.on("deleteItem", refresh);
  Hooks.on("canvasReady", refresh);
}

/** Resets module-level state between test runs. Not used at runtime. */
export function _resetForTests() {
  hubInstance = null;
}

/** Exposes the current singleton for assertions. Not used at runtime. */
export function _getHubInstanceForTests() {
  return hubInstance;
}
