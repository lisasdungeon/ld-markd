import { registerSettings } from "./settings.js";
import { registerSceneControls } from "./controls.js";
import { initConditionWatch } from "./watcher.js";

Hooks.once("init", () => {
  registerSettings();
  registerSceneControls();
  initConditionWatch();
});
