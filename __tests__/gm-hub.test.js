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

  describe("_onRender event wiring", () => {
    it("toggles the expanded class when the card header is clicked", () => {
      const app = new GMHubApp();
      renderCardMarkup(app.element);
      app._onRender({}, {});

      const header = app.element.querySelector('[data-action="toggle-card"]');
      const card = app.element.querySelector(".ldm-hub-card");
      header.dispatchEvent(new window.Event("click", { bubbles: true }));
      expect(card.classList.contains("ldm-expanded")).toBe(true);

      header.dispatchEvent(new window.Event("click", { bubbles: true }));
      expect(card.classList.contains("ldm-expanded")).toBe(false);
    });

    it("adds a condition using the selected status and re-renders", async () => {
      const app = new GMHubApp();
      renderCardMarkup(app.element);
      app._onRender({}, {});
      app.rendered = true;

      const addButton = app.element.querySelector('[data-action="add-condition"]');
      addButton.dispatchEvent(new window.Event("click", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();

      expect(addCondition).toHaveBeenCalledWith({ id: "tok1" }, "prone");
    });

    it("does nothing when adding a condition with no token resolvable", async () => {
      global.canvas.tokens.get = jest.fn(() => null);
      const app = new GMHubApp();
      renderCardMarkup(app.element);
      app._onRender({}, {});

      const addButton = app.element.querySelector('[data-action="add-condition"]');
      addButton.dispatchEvent(new window.Event("click", { bubbles: true }));
      await Promise.resolve();

      expect(addCondition).not.toHaveBeenCalled();
    });

    it("does nothing when adding a condition with nothing selected", async () => {
      const app = new GMHubApp();
      renderCardMarkup(app.element);
      app.element.querySelector(".ldm-hub-status-select").innerHTML = "";
      app._onRender({}, {});

      const addButton = app.element.querySelector('[data-action="add-condition"]');
      addButton.dispatchEvent(new window.Event("click", { bubbles: true }));
      await Promise.resolve();

      expect(addCondition).not.toHaveBeenCalled();
    });

    it("removes a condition from its card's token and re-renders", async () => {
      const app = new GMHubApp();
      renderCardMarkup(app.element);
      app._onRender({}, {});

      const removeButton = app.element.querySelector('[data-action="remove-condition"]');
      removeButton.dispatchEvent(new window.Event("click", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();

      expect(removeCondition).toHaveBeenCalledWith({ id: "tok1" }, "eff1");
    });

    it("does nothing when removing a condition whose card has no resolvable token", async () => {
      global.canvas.tokens.get = jest.fn(() => null);
      const app = new GMHubApp();
      renderCardMarkup(app.element);
      app._onRender({}, {});

      const removeButton = app.element.querySelector('[data-action="remove-condition"]');
      removeButton.dispatchEvent(new window.Event("click", { bubbles: true }));
      await Promise.resolve();

      expect(removeCondition).not.toHaveBeenCalled();
    });

    it("edits a condition from its card's token", () => {
      const app = new GMHubApp();
      renderCardMarkup(app.element);
      app._onRender({}, {});

      const editButton = app.element.querySelector('[data-action="edit-condition"]');
      editButton.dispatchEvent(new window.Event("click", { bubbles: true }));

      expect(editCondition).toHaveBeenCalledWith({ id: "tok1" }, "eff1");
    });

    it("does nothing when a condition button is not inside any card", () => {
      const app = new GMHubApp();
      app.element.innerHTML = `<button data-action="edit-condition" data-effect-id="eff1"></button>`;
      app._onRender({}, {});

      const editButton = app.element.querySelector('[data-action="edit-condition"]');
      editButton.dispatchEvent(new window.Event("click", { bubbles: true }));

      expect(editCondition).not.toHaveBeenCalled();
    });

    it("does nothing when editing a condition whose card has no resolvable token", () => {
      global.canvas.tokens.get = jest.fn(() => null);
      const app = new GMHubApp();
      renderCardMarkup(app.element);
      app._onRender({}, {});

      const editButton = app.element.querySelector('[data-action="edit-condition"]');
      editButton.dispatchEvent(new window.Event("click", { bubbles: true }));

      expect(editCondition).not.toHaveBeenCalled();
    });
  });

  describe("openGMHub / refreshGMHub singleton", () => {
    it("creates a new instance on first open and renders it", () => {
      openGMHub();
      const instance = _getHubInstanceForTests();
      expect(instance).toBeInstanceOf(GMHubApp);
      expect(instance.rendered).toBe(true);
    });

    it("reuses the same instance across multiple opens", () => {
      openGMHub();
      const first = _getHubInstanceForTests();
      openGMHub();
      expect(_getHubInstanceForTests()).toBe(first);
    });

    it("does nothing when refreshed before any hub has been opened", () => {
      expect(() => refreshGMHub()).not.toThrow();
      expect(_getHubInstanceForTests()).toBeNull();
    });

    it("re-renders the hub when refreshed while it is open", () => {
      openGMHub();
      const instance = _getHubInstanceForTests();
      const renderSpy = jest.spyOn(instance, "render");
      refreshGMHub();
      expect(renderSpy).toHaveBeenCalledWith();
    });

    it("does not render when refreshed while the hub is closed", () => {
      openGMHub();
      const instance = _getHubInstanceForTests();
      instance.rendered = false;
      const renderSpy = jest.spyOn(instance, "render");
      refreshGMHub();
      expect(renderSpy).not.toHaveBeenCalled();
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

    it("invoking a registered hook refreshes the open hub", () => {
      registerGMHubHooks();
      openGMHub();
      const instance = _getHubInstanceForTests();
      const renderSpy = jest.spyOn(instance, "render");

      const [, callback] = global.Hooks.on.mock.calls[0];
      callback();

      expect(renderSpy).toHaveBeenCalled();
    });
  });
});
