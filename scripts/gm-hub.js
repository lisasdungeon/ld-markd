import { getSceneMobs } from "./gm-hub-data.js";
import { addCondition, removeCondition, editCondition } from "./gm-hub-actions.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class GMHubApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "ld-markd-gm-hub",
    classes: ["ld-markd-gm-hub"],
    window: { title: "LDMARKD.Hub.Title", resizable: true },
    position: { width: 760, height: 640 }
  };

  static PARTS = {
    main: { template: "modules/ld-markd/templates/gm-hub.hbs" }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.mobs = getSceneMobs();
    return context;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    wireHubEvents(this.element, this);
  }
}

function wireHubEvents(root, app) {
  root.querySelectorAll('[data-action="toggle-card"]').forEach((el) => {
    el.addEventListener("click", (event) => {
      event.currentTarget.closest(".ldm-hub-card")?.classList.toggle("ldm-expanded");
    });
  });

  root.querySelectorAll('[data-action="add-condition"]').forEach((el) => {
    el.addEventListener("click", async (event) => {
      const tokenId = event.currentTarget.dataset.tokenId;
      const select = root.querySelector(`select[data-token-id="${tokenId}"]`);
      const token = canvas.tokens.get(tokenId);
      if (!token || !select?.value) return;
      await addCondition(token, select.value);
      app.render();
    });
  });

  root.querySelectorAll('[data-action="remove-condition"]').forEach((el) => {
    el.addEventListener("click", async (event) => {
      const token = tokenFromCard(event.currentTarget);
      const effectId = event.currentTarget.dataset.effectId;
      if (!token) return;
      await removeCondition(token, effectId);
      app.render();
    });
  });

  root.querySelectorAll('[data-action="edit-condition"]').forEach((el) => {
    el.addEventListener("click", (event) => {
      const token = tokenFromCard(event.currentTarget);
      const effectId = event.currentTarget.dataset.effectId;
      if (!token) return;
      editCondition(token, effectId);
    });
  });
}

function tokenFromCard(el) {
  const tokenId = el.closest(".ldm-hub-card")?.dataset.tokenId;
  return tokenId ? canvas.tokens.get(tokenId) : null;
}

let hubInstance = null;

export function openGMHub() {
  if (!hubInstance) hubInstance = new GMHubApp();
  hubInstance.render(true);
}

export function refreshGMHub() {
  if (hubInstance?.rendered) hubInstance.render();
}

export function registerGMHubHooks() {
  const refresh = () => refreshGMHub();
  Hooks.on("createToken", refresh);
  Hooks.on("deleteToken", refresh);
  Hooks.on("updateToken", refresh);
  Hooks.on("createActiveEffect", refresh);
  Hooks.on("updateActiveEffect", refresh);
  Hooks.on("deleteActiveEffect", refresh);
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
