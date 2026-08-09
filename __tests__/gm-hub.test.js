import { jest } from "@jest/globals";

jest.unstable_mockModule("../scripts/gm-hub-data.js", () => ({
  getSceneMobs: jest.fn(() => [{ tokenId: "tok1", name: "Goblin", img: "", conditions: [], availableStatuses: [] }])
}));
jest.unstable_mockModule("../scripts/gm-hub-actions.js", () => ({
  addCondition: jest.fn(),
  removeCondition: jest.fn(),
  editCondition: jest.fn()
}));

const { GMHubApp, openGMHub, refreshGMHub, registerGMHubHooks, _resetForTests, _getHubInstanceForTests } =
  await import("../scripts/gm-hub.js");
const { getSceneMobs } = await import("../scripts/gm-hub-data.js");
const { addCondition, removeCondition, editCondition } = await import("../scripts/gm-hub-actions.js");

function renderCardMarkup(root, { tokenId = "tok1", effectId = "eff1" } = {}) {
  root.innerHTML = `
    <div class="ldm-hub-card" data-token-id="${tokenId}">
      <div class="ldm-hub-card-header" data-action="toggle-card"></div>
      <div class="ldm-hub-card-body">
        <button data-action="edit-condition" data-effect-id="${effectId}"></button>
        <button data-action="remove-condition" data-effect-id="${effectId}"></button>
        <select class="ldm-hub-status-select" data-token-id="${tokenId}">
          <option value="prone">Prone</option>
        </select>
        <button data-action="add-condition" data-token-id="${tokenId}"></button>
      </div>
    </div>
  `;
}

/** Invoke a registered ApplicationV2 action handler bound to the app. */
function invokeAction(app, action, target) {
  const handler = app.options?.actions?.[action] ?? GMHubApp.DEFAULT_OPTIONS.actions[action];
  return handler.call(app, {}, target);
}

describe("gm-hub.js", () => {
  beforeEach(() => {
    _resetForTests();
    getSceneMobs.mockClear();
    addCondition.mockClear();
    removeCondition.mockClear();
    editCondition.mockClear();
    global.canvas = { tokens: { get: jest.fn((id) => (id ? { id } : null)) } };
    global.Hooks = { on: jest.fn() };
  });

  describe("_prepareContext", () => {
    it("adds the scene mobs to the rendered context", async () => {
      const app = new GMHubApp();
      const context = await app._prepareContext({});
      expect(getSceneMobs).toHaveBeenCalled();
      expect(context.mobs).toEqual([{ tokenId: "tok1", name: "Goblin", img: "", conditions: [], availableStatuses: [] }]);
    });
  });

  describe("ApplicationV2 actions", () => {
    it("toggles the expanded class when the card header action fires", () => {
      const app = new GMHubApp();
      renderCardMarkup(app.element);
      const header = app.element.querySelector('[data-action="toggle-card"]');
      const card = app.element.querySelector(".ldm-hub-card");

      invokeAction(app, "toggle-card", header);
      expect(card.classList.contains("ldm-expanded")).toBe(true);

      invokeAction(app, "toggle-card", header);
      expect(card.classList.contains("ldm-expanded")).toBe(false);
    });

    it("adds a condition using the selected status and re-renders", async () => {
      const app = new GMHubApp();
      renderCardMarkup(app.element);
      app.render = jest.fn();

      const addButton = app.element.querySelector('[data-action="add-condition"]');
      await invokeAction(app, "add-condition", addButton);

      expect(addCondition).toHaveBeenCalledWith({ id: "tok1" }, "prone");
      expect(app.render).toHaveBeenCalledWith({ force: true });
    });

    it("does nothing when adding a condition with no token resolvable", async () => {
      global.canvas.tokens.get = jest.fn(() => null);
      const app = new GMHubApp();
      renderCardMarkup(app.element);
      app.render = jest.fn();

      const addButton = app.element.querySelector('[data-action="add-condition"]');
      await invokeAction(app, "add-condition", addButton);

      expect(addCondition).not.toHaveBeenCalled();
      expect(app.render).not.toHaveBeenCalled();
    });

    it("does nothing when adding a condition with nothing selected", async () => {
      const app = new GMHubApp();
      renderCardMarkup(app.element);
      app.element.querySelector(".ldm-hub-status-select").innerHTML = "";
      app.render = jest.fn();

      const addButton = app.element.querySelector('[data-action="add-condition"]');
      await invokeAction(app, "add-condition", addButton);

      expect(addCondition).not.toHaveBeenCalled();
    });

    it("removes a condition from its card's token and re-renders", async () => {
      const app = new GMHubApp();
      renderCardMarkup(app.element);
      app.render = jest.fn();

      const removeButton = app.element.querySelector('[data-action="remove-condition"]');
      await invokeAction(app, "remove-condition", removeButton);

      expect(removeCondition).toHaveBeenCalledWith({ id: "tok1" }, "eff1");
      expect(app.render).toHaveBeenCalledWith({ force: true });
    });

    it("does nothing when removing a condition whose card has no resolvable token", async () => {
      global.canvas.tokens.get = jest.fn(() => null);
      const app = new GMHubApp();
      renderCardMarkup(app.element);
      app.render = jest.fn();

      const removeButton = app.element.querySelector('[data-action="remove-condition"]');
      await invokeAction(app, "remove-condition", removeButton);

      expect(removeCondition).not.toHaveBeenCalled();
    });

    it("edits a condition from its card's token", () => {
      const app = new GMHubApp();
      renderCardMarkup(app.element);

      const editButton = app.element.querySelector('[data-action="edit-condition"]');
      invokeAction(app, "edit-condition", editButton);

      expect(editCondition).toHaveBeenCalledWith({ id: "tok1" }, "eff1");
    });

    it("does nothing when a condition button is not inside any card", () => {
      const app = new GMHubApp();
      app.element.innerHTML = `<button data-action="edit-condition" data-effect-id="eff1"></button>`;

      const editButton = app.element.querySelector('[data-action="edit-condition"]');
      invokeAction(app, "edit-condition", editButton);

      expect(editCondition).not.toHaveBeenCalled();
    });

    it("does nothing when editing a condition whose card has no resolvable token", () => {
      global.canvas.tokens.get = jest.fn(() => null);
      const app = new GMHubApp();
      renderCardMarkup(app.element);

      const editButton = app.element.querySelector('[data-action="edit-condition"]');
      invokeAction(app, "edit-condition", editButton);

      expect(editCondition).not.toHaveBeenCalled();
    });
  });

  describe("openGMHub / refreshGMHub singleton", () => {
    it("creates a new instance on first open and renders it forced", async () => {
      await openGMHub();
      const instance = _getHubInstanceForTests();
      expect(instance).toBeInstanceOf(GMHubApp);
      expect(instance.rendered).toBe(true);
    });

    it("reuses the same instance across multiple opens", async () => {
      await openGMHub();
      const first = _getHubInstanceForTests();
      await openGMHub();
      expect(_getHubInstanceForTests()).toBe(first);
    });

    it("does nothing when refreshed before any hub has been opened", () => {
      expect(() => refreshGMHub()).not.toThrow();
      expect(_getHubInstanceForTests()).toBeNull();
    });

    it("re-renders the hub when refreshed while it is open", async () => {
      await openGMHub();
      const instance = _getHubInstanceForTests();
      const renderSpy = jest.spyOn(instance, "render");
      refreshGMHub();
      expect(renderSpy).toHaveBeenCalledWith({ force: true });
    });

    it("does not render when refreshed while the hub is closed", async () => {
      await openGMHub();
      const instance = _getHubInstanceForTests();
      instance.rendered = false;
      const renderSpy = jest.spyOn(instance, "render");
      refreshGMHub();
      expect(renderSpy).not.toHaveBeenCalled();
    });

    it("brings an already-open hub to the front only after render completes", async () => {
      await openGMHub();
      const instance = _getHubInstanceForTests();
      instance.bringToFront = jest.fn();
      instance.render = jest.fn(async () => {
        instance.rendered = true;
        return instance;
      });
      await openGMHub();
      expect(instance.render).toHaveBeenCalledWith({ force: true });
      expect(instance.bringToFront).toHaveBeenCalled();
    });

    it("does not call bringToFront when render left the hub unrendered", async () => {
      await openGMHub();
      const instance = _getHubInstanceForTests();
      instance.bringToFront = jest.fn();
      instance.render = jest.fn(async () => {
        instance.rendered = false;
        return instance;
      });
      await openGMHub();
      expect(instance.bringToFront).not.toHaveBeenCalled();
    });
  });

  describe("registerGMHubHooks", () => {
    it("registers a refresh handler for every scene/effect hook it cares about", () => {
      registerGMHubHooks();
      const events = global.Hooks.on.mock.calls.map((call) => call[0]);
      expect(events).toEqual([
        "createToken",
        "deleteToken",
        "updateToken",
        "createActiveEffect",
        "updateActiveEffect",
        "deleteActiveEffect",
        "canvasReady"
      ]);
    });

    it("invoking a registered hook refreshes the open hub", async () => {
      registerGMHubHooks();
      await openGMHub();
      const instance = _getHubInstanceForTests();
      const renderSpy = jest.spyOn(instance, "render");

      const [, callback] = global.Hooks.on.mock.calls[0];
      callback();

      expect(renderSpy).toHaveBeenCalledWith({ force: true });
    });
  });
});
