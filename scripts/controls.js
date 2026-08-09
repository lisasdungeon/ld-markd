import { MODULE_ID, SETTINGS, isControlButtonShown } from "./settings.js";
import { openGMHub } from "./gm-hub.js";

const GROUP_NAME = "ld-markd";
const TOGGLE_TOOL_NAME = "ld-markd-toggle";
const HUB_TOOL_NAME = "ld-markd-open-hub";

/**
 * Foundry v13 SceneControls calls tool onChange as (event, active).
 * Button tools fire once with active=true; toggles fire with the new state.
 */
function buildToggleTool() {
  return {
    name: TOGGLE_TOOL_NAME,
    title: "LDMARKD.Controls.Toggle.Title",
    icon: "fa-solid fa-notes-medical",
    toggle: true,
    button: false,
    active: game.settings.get(MODULE_ID, SETTINGS.MODULE_ENABLED),
    order: 1,
    onChange: (_event, active) => {
      game.settings.set(MODULE_ID, SETTINGS.MODULE_ENABLED, active);
      const key = active ? "LDMARKD.Notify.Enabled" : "LDMARKD.Notify.Disabled";
      ui.notifications.info(game.i18n.localize(key));
    }
  };
}

function buildHubTool() {
  return {
    name: HUB_TOOL_NAME,
    title: "LDMARKD.Controls.OpenHub.Title",
    icon: "fa-solid fa-address-card",
    button: true,
    toggle: false,
    order: 2,
    onChange: (_event, active) => {
      if (!active) return;
      openGMHub();
    }
  };
}

function buildControlGroup(controls) {
  const toggleTool = buildToggleTool();
  const hubTool = buildHubTool();
  const tools = Array.isArray(controls)
    ? [toggleTool, hubTool]
    : { [TOGGLE_TOOL_NAME]: toggleTool, [HUB_TOOL_NAME]: hubTool };
  return {
    name: GROUP_NAME,
    title: "LDMARKD.Controls.Toggle.Title",
    icon: "fa-solid fa-notes-medical",
    order: 100,
    layer: "tokens",
    tools
  };
}

/**
 * Add a GM-only scene control group with two tools: a toggle that flips
 * the world "moduleEnabled" setting (see watcher.js), and a button that
 * opens the GM Hub (see gm-hub.js). Supports both the legacy array-based
 * and the v13+ object-based getSceneControlButtons payload.
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
