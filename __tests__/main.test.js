import { jest } from "@jest/globals";

jest.unstable_mockModule("../scripts/settings.js", () => ({
  registerSettings: jest.fn()
}));
jest.unstable_mockModule("../scripts/controls.js", () => ({
  registerSceneControls: jest.fn()
}));
jest.unstable_mockModule("../scripts/watcher.js", () => ({
  initConditionWatch: jest.fn()
}));
jest.unstable_mockModule("../scripts/gm-hub.js", () => ({
  registerGMHubHooks: jest.fn()
}));

describe("main.js", () => {
  it("wires settings, scene controls, the watcher, and the GM Hub on the init hook", async () => {
    const handlers = {};
    global.Hooks = {
      once: jest.fn((event, cb) => {
        handlers[event] = cb;
      })
    };

    const settings = await import("../scripts/settings.js");
    const controls = await import("../scripts/controls.js");
    const watcher = await import("../scripts/watcher.js");
    const gmHub = await import("../scripts/gm-hub.js");
    await import("../scripts/main.js");

    expect(global.Hooks.once).toHaveBeenCalledWith("init", expect.any(Function));
    handlers.init();

    expect(settings.registerSettings).toHaveBeenCalled();
    expect(controls.registerSceneControls).toHaveBeenCalled();
    expect(watcher.initConditionWatch).toHaveBeenCalled();
    expect(gmHub.registerGMHubHooks).toHaveBeenCalled();
  });
});
