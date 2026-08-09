import { registerSettings } from "./settings.js";
import { registerSceneControls } from "./controls.js";
import { initConditionWatch } from "./watcher.js";
import { registerGMHubHooks } from "./gm-hub.js";

Hooks.once("init", () => {
  registerSettings();
  registerSceneControls();
  initConditionWatch();
  registerGMHubHooks();
});
