import { jest } from "@jest/globals";
import { initConditionWatch, _resetForTests } from "../../scripts/watcher.js";

export function makeToken({ id = "tok1", actor = null, name = "Goblin", x = 0, y = 0, w = 100, texture } = {}) {
  return {
    id,
    x,
    y,
    w,
    actor,
    document: { name, texture }
  };
}

export function makeActor({ id = "actor1", img = "actor.webp", effects, hasPlayerOwner = false, appliedEffects } = {}) {
  const actor = { id, img, effects, hasPlayerOwner };
  if (appliedEffects !== undefined) actor.appliedEffects = appliedEffects;
  return actor;
}

export function makeEffect(overrides = {}) {
  return {
    name: "Prone",
    img: "icons/prone.webp",
    disabled: false,
    isSuppressed: false,
    duration: undefined,
    description: undefined,
    origin: undefined,
    ...overrides
  };
}

/**
 * Resets watcher.js module state, installs fresh Foundry global mocks, and
 * re-registers the watcher's hooks, capturing each handler by event name.
 * Call from beforeEach; returns the handlers object.
 */
export function setupWatcher() {
  _resetForTests();
  document.body.innerHTML = "";

  const handlers = {};
  global.Hooks = {
    on: jest.fn((event, cb) => {
      handlers[event] = cb;
    })
  };

  global.game = {
    userId: "user1",
    i18n: { localize: jest.fn((key) => key) },
    settings: { get: jest.fn(() => true) }
  };

  global.canvas = {
    ready: true,
    stage: { worldTransform: { apply: jest.fn((pt) => ({ x: pt.x, y: pt.y })) } },
    app: {
      view: { getBoundingClientRect: jest.fn(() => ({ left: 0, top: 0 })) },
      ticker: { add: jest.fn(), remove: jest.fn() }
    }
  };

  global.PIXI = {
    Point: function Point(x, y) {
      this.x = x;
      this.y = y;
    }
  };

  global.fromUuidSync = jest.fn();
  global.window.innerWidth = 1024;
  global.window.innerHeight = 768;

  initConditionWatch();
  return handlers;
}
