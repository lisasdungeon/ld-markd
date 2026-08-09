import { jest } from "@jest/globals";
import { registerSettings, isModuleEnabled, isControlButtonShown, MODULE_ID, SETTINGS } from "../scripts/settings.js";

function makeGame({ ready } = { ready: true }) {
  const store = {};
  return {
    ready,
    settings: {
      register: jest.fn((moduleId, key, data) => {
        store[key] = data;
      }),
      get: jest.fn((moduleId, key) => store[key]?.default),
      _store: store
    }
  };
}

describe("settings.js", () => {
  beforeEach(() => {
    global.game = makeGame();
    global.ui = { controls: { render: jest.fn() } };
    global.Hooks = { callAll: jest.fn() };
  });

  it("registers both world settings under the module id", () => {
    registerSettings();
    expect(global.game.settings.register).toHaveBeenCalledTimes(2);
    expect(global.game.settings.register).toHaveBeenCalledWith(MODULE_ID, SETTINGS.MODULE_ENABLED, expect.any(Object));
    expect(global.game.settings.register).toHaveBeenCalledWith(MODULE_ID, SETTINGS.SHOW_CONTROL_BUTTON, expect.any(Object));
  });

  it("moduleEnabled onChange re-renders controls and broadcasts when the game is ready", () => {
    global.game.ready = true;
    registerSettings();
    const { onChange } = global.game.settings._store[SETTINGS.MODULE_ENABLED];
    onChange(true);
    expect(global.ui.controls.render).toHaveBeenCalledWith();
    expect(global.Hooks.callAll).toHaveBeenCalledWith("ldMarkd.enabledChanged", true);
  });

  it("moduleEnabled onChange does nothing when the game is not ready", () => {
    global.game.ready = false;
    registerSettings();
    const { onChange } = global.game.settings._store[SETTINGS.MODULE_ENABLED];
    onChange(true);
    expect(global.ui.controls.render).not.toHaveBeenCalled();
    expect(global.Hooks.callAll).not.toHaveBeenCalled();
  });

  it("showControlButton onChange re-renders controls when the game is ready", () => {
    global.game.ready = true;
    registerSettings();
    const { onChange } = global.game.settings._store[SETTINGS.SHOW_CONTROL_BUTTON];
    onChange(false);
    expect(global.ui.controls.render).toHaveBeenCalledWith(true);
  });

  it("showControlButton onChange does nothing when the game is not ready", () => {
    global.game.ready = false;
    registerSettings();
    const { onChange } = global.game.settings._store[SETTINGS.SHOW_CONTROL_BUTTON];
    onChange(false);
    expect(global.ui.controls.render).not.toHaveBeenCalled();
  });

  it("isModuleEnabled reads the moduleEnabled setting", () => {
    global.game.settings.get = jest.fn(() => true);
    expect(isModuleEnabled()).toBe(true);
    expect(global.game.settings.get).toHaveBeenCalledWith(MODULE_ID, SETTINGS.MODULE_ENABLED);
  });

  it("isControlButtonShown reads the showControlButton setting", () => {
    global.game.settings.get = jest.fn(() => false);
    expect(isControlButtonShown()).toBe(false);
    expect(global.game.settings.get).toHaveBeenCalledWith(MODULE_ID, SETTINGS.SHOW_CONTROL_BUTTON);
  });
});
