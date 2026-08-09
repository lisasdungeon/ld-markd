/**
 * Runs before every test file's module graph loads. gm-hub.js reads
 * foundry.applications.api at module-evaluation time (it extends
 * ApplicationV2 in a class declaration), so that global must exist before
 * anything imports it, directly or transitively.
 */
class FakeApplicationV2 {
  constructor(options = {}) {
    this.options = options;
    this.rendered = false;
    this.element = document.createElement("div");
  }

  async _prepareContext() {
    return {};
  }

  _onRender() {}

  render(force) {
    this.rendered = true;
    return this;
  }

  close() {
    this.rendered = false;
    return this;
  }
}

global.foundry = {
  applications: {
    api: {
      ApplicationV2: FakeApplicationV2,
      HandlebarsApplicationMixin: (Base) => Base
    }
  }
};
