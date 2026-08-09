export const MODULE_ID = "ld-markd";

export const SETTINGS = {
  MODULE_ENABLED: "moduleEnabled",
  SHOW_CONTROL_BUTTON: "showControlButton"
};

/**
 * Register world settings. Called from the `init` hook.
 */
export function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.MODULE_ENABLED, {
    name: "LDMARKD.Settings.ModuleEnabled.Name",
    hint: "LDMARKD.Settings.ModuleEnabled.Hint",
    scope: "world",
    config: false,
    type: Boolean,
    default: true,
    onChange: () => {
      if (game.ready) {
        ui.controls.render();
        Hooks.callAll("ldMarkd.enabledChanged", game.settings.get(MODULE_ID, SETTINGS.MODULE_ENABLED));
      }
    }
  });

  game.settings.register(MODULE_ID, SETTINGS.SHOW_CONTROL_BUTTON, {
    name: "LDMARKD.Settings.ShowControlButton.Name",
    hint: "LDMARKD.Settings.ShowControlButton.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: false,
    onChange: () => {
      if (game.ready) ui.controls.render(true);
    }
  });
}

export function isModuleEnabled() {
  return game.settings.get(MODULE_ID, SETTINGS.MODULE_ENABLED);
}

export function isControlButtonShown() {
  return game.settings.get(MODULE_ID, SETTINGS.SHOW_CONTROL_BUTTON);
}
