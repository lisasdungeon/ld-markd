import { jest } from "@jest/globals";
import { registerSceneControls } from "../scripts/controls.js";
import { MODULE_ID, SETTINGS } from "../scripts/settings.js";

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
    global.game = {
      user: { isGM: true },
      settings: {
        get: jest.fn(() => true),
        set: jest.fn()
      }
    };
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
    expect(controls[0].tools[0].name).toBe("ld-markd-toggle");
  });

  it("assigns a control group with an object-shaped tools collection for v13+ object controls", () => {
    const handler = captureHookHandler();
    const controls = {};
    handler(controls);
    expect(controls["ld-markd"]).toBeDefined();
    expect(controls["ld-markd"].tools["ld-markd-toggle"]).toBeDefined();
  });

  it("does nothing when controls is neither an array nor an object", () => {
    const handler = captureHookHandler();
    expect(() => handler(null)).not.toThrow();
    expect(() => handler("not-an-object")).not.toThrow();
  });

  it("the toggle tool's onChange writes the moduleEnabled setting", () => {
    const handler = captureHookHandler();
    const controls = {};
    handler(controls);
    const tool = controls["ld-markd"].tools["ld-markd-toggle"];
    tool.onChange(false);
    expect(global.game.settings.set).toHaveBeenCalledWith(MODULE_ID, SETTINGS.MODULE_ENABLED, false);
  });
});
