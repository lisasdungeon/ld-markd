import { MODULE_ID, SETTINGS, isControlButtonShown } from "./settings.js";

const GROUP_NAME = "ld-markd";
const TOOL_NAME = "ld-markd-toggle";

function buildTool() {
  return {
    name: TOOL_NAME,
    title: "LDMARKD.Controls.Toggle.Title",
    icon: "fa-solid fa-notes-medical",
    toggle: true,
    active: game.settings.get(MODULE_ID, SETTINGS.MODULE_ENABLED),
    onChange: (active) => {
      game.settings.set(MODULE_ID, SETTINGS.MODULE_ENABLED, active);
    }
  };
}

function buildControlGroup(controls) {
  const tool = buildTool();
  return {
    name: GROUP_NAME,
    title: "LDMARKD.Controls.Toggle.Title",
    icon: "fa-solid fa-notes-medical",
    order: 100,
    layer: "tokens",
    tools: Array.isArray(controls) ? [tool] : { [TOOL_NAME]: tool }
  };
}

/**
 * Add a GM-only scene control group with a toggle tool that flips the
 * world "moduleEnabled" setting, which every connected client reacts to
 * (see watcher.js). Supports both the legacy array-based and the v13+
 * object-based getSceneControlButtons payload.
 */
export function registerSceneControls() {
  Hooks.on("getSceneControlButtons", (controls) => {
    if (!game.user.isGM) return;
    if (!isControlButtonShown()) return;

    const group = buildControlGroup(controls);
    if (Array.isArray(controls)) {
      controls.push(group);
    } else if (controls && typeof controls === "object") {
      controls[GROUP_NAME] = group;
    }
  });
}
