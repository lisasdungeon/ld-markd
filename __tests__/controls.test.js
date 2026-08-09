import { jest } from "@jest/globals";
import { MODULE_ID, SETTINGS } from "../scripts/settings.js";

jest.unstable_mockModule("../scripts/gm-hub.js", () => ({
  openGMHub: jest.fn()
}));

const { registerSceneControls } = await import("../scripts/controls.js");
const { openGMHub } = await import("../scripts/gm-hub.js");

function captureHookHandler() {
  const handlers = {};
  global.Hooks = {
    on: jest.fn((event, cb) => {
      handlers[event] = cb;
    })
  };
  registerSceneControls();
  return handlers.getSceneControlButtons;
}

describe("controls.js", () => {
  beforeEach(() => {
    openGMHub.mockClear();
    global.game = {
      user: { isGM: true },
      i18n: { localize: jest.fn((key) => key) },
      settings: {
        get: jest.fn(() => true),
        set: jest.fn()
      }
    };
    global.ui = { notifications: { info: jest.fn() } };
  });

  it("registers a getSceneControlButtons hook", () => {
    const handler = captureHookHandler();
    expect(typeof handler).toBe("function");
  });

  it("does nothing for non-GM users", () => {
    global.game.user.isGM = false;
    const handler = captureHookHandler();
    const controls = {};
    handler(controls);
    expect(controls).toEqual({});
  });

  it("does nothing when the control button setting is disabled", () => {
    global.game.settings.get = jest.fn(() => false);
    const handler = captureHookHandler();
    const controls = {};
    handler(controls);
    expect(controls).toEqual({});
  });

  it("pushes a control group with an array-shaped tools collection for legacy array controls", () => {
    const handler = captureHookHandler();
    const controls = [];
    handler(controls);
    expect(controls).toHaveLength(1);
    expect(controls[0].name).toBe("ld-markd");
    expect(Array.isArray(controls[0].tools)).toBe(true);
    expect(controls[0].tools.map((t) => t.name)).toEqual(["ld-markd-toggle", "ld-markd-open-hub"]);
  });

  it("assigns a control group with an object-shaped tools collection for v13+ object controls", () => {
    const handler = captureHookHandler();
    const controls = {};
    handler(controls);
    expect(controls["ld-markd"]).toBeDefined();
    expect(controls["ld-markd"].tools["ld-markd-toggle"]).toBeDefined();
    expect(controls["ld-markd"].tools["ld-markd-open-hub"]).toBeDefined();
  });

  it("does nothing when controls is neither an array nor an object", () => {
    const handler = captureHookHandler();
    expect(() => handler(null)).not.toThrow();
    expect(() => handler("not-an-object")).not.toThrow();
  });

  it("the toggle tool's onChange writes the setting and notifies the GM when enabled", () => {
    const handler = captureHookHandler();
    const controls = {};
    handler(controls);
    const tool = controls["ld-markd"].tools["ld-markd-toggle"];
    // Foundry v13 signature: (event, active)
    tool.onChange({}, true);
    expect(global.game.settings.set).toHaveBeenCalledWith(MODULE_ID, SETTINGS.MODULE_ENABLED, true);
    expect(global.ui.notifications.info).toHaveBeenCalledWith("LDMARKD.Notify.Enabled");
  });

  it("the toggle tool's onChange writes the setting and notifies the GM when disabled", () => {
    const handler = captureHookHandler();
    const controls = {};
    handler(controls);
    const tool = controls["ld-markd"].tools["ld-markd-toggle"];
    tool.onChange({}, false);
    expect(global.game.settings.set).toHaveBeenCalledWith(MODULE_ID, SETTINGS.MODULE_ENABLED, false);
    expect(global.ui.notifications.info).toHaveBeenCalledWith("LDMARKD.Notify.Disabled");
  });

  it("the hub tool's onChange opens the GM Hub only when pressed active", () => {
    const handler = captureHookHandler();
    const controls = {};
    handler(controls);
    const tool = controls["ld-markd"].tools["ld-markd-open-hub"];

    tool.onChange({}, false);
    expect(openGMHub).not.toHaveBeenCalled();

    tool.onChange({}, true);
    expect(openGMHub).toHaveBeenCalledTimes(1);
  });
});
