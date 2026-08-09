import { jest } from "@jest/globals";
import { initConditionWatch, _resetForTests } from "../scripts/watcher.js";

function makeToken({ id = "tok1", actor = null, name = "Goblin", x = 0, y = 0, w = 100, texture } = {}) {
  return {
    id,
    x,
    y,
    w,
    actor,
    document: { name, texture }
  };
}

function makeActor({ id = "actor1", img = "actor.webp", effects } = {}) {
  return { id, img, effects };
}

function makeEffect(overrides = {}) {
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

describe("watcher.js", () => {
  let handlers;

  beforeEach(() => {
    _resetForTests();
    document.body.innerHTML = "";

    handlers = {};
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
  });

  it("registers a handler for every hook it needs", () => {
    for (const event of [
      "hoverToken",
      "targetToken",
      "updateActiveEffect",
      "createActiveEffect",
      "deleteActiveEffect",
      "updateActor",
      "updateCombat",
      "deleteToken",
      "ldMarkd.enabledChanged"
    ]) {
      expect(handlers[event]).toBeInstanceOf(Function);
    }
  });

  describe("hoverToken", () => {
    it("ignores tokens without an actor", () => {
      handlers.hoverToken(makeToken({ actor: null }), true);
      expect(document.querySelector(".ld-markd-panel")).toBeNull();
    });

    it("does not show a panel on hover-in while the module is disabled", () => {
      global.game.settings.get = jest.fn(() => false);
      const actor = makeActor();
      handlers.hoverToken(makeToken({ actor }), true);
      expect(document.querySelector(".ld-markd-panel")).toBeNull();
    });

    it("shows a panel on hover-in while the module is enabled", () => {
      const actor = makeActor();
      handlers.hoverToken(makeToken({ actor }), true);
      const panel = document.querySelector(".ld-markd-panel");
      expect(panel).not.toBeNull();
      expect(panel.classList.contains("ldm-pinned")).toBe(false);
    });

    it("hovering out a never-shown token is a no-op", () => {
      const actor = makeActor();
      handlers.hoverToken(makeToken({ actor }), false);
      expect(document.querySelector(".ld-markd-panel")).toBeNull();
    });

    it("hides the panel on hover-out", () => {
      const actor = makeActor();
      const token = makeToken({ actor });
      handlers.hoverToken(token, true);
      handlers.hoverToken(token, false);
      expect(document.querySelector(".ld-markd-panel")).toBeNull();
    });
  });

  describe("targetToken", () => {
    it("ignores target changes from other users", () => {
      const actor = makeActor();
      handlers.targetToken({ id: "other-user" }, makeToken({ actor }), true);
      expect(document.querySelector(".ld-markd-panel")).toBeNull();
    });

    it("ignores tokens without an actor", () => {
      handlers.targetToken({ id: "user1" }, makeToken({ actor: null }), true);
      expect(document.querySelector(".ld-markd-panel")).toBeNull();
    });

    it("does not pin a panel while the module is disabled", () => {
      global.game.settings.get = jest.fn(() => false);
      const actor = makeActor();
      handlers.targetToken({ id: "user1" }, makeToken({ actor }), true);
      expect(document.querySelector(".ld-markd-panel")).toBeNull();
    });

    it("pins a panel when targeted", () => {
      const actor = makeActor();
      handlers.targetToken({ id: "user1" }, makeToken({ actor }), true);
      const panel = document.querySelector(".ld-markd-panel");
      expect(panel).not.toBeNull();
      expect(panel.classList.contains("ldm-pinned")).toBe(true);
    });

    it("unpins and removes the panel when un-targeted", () => {
      const actor = makeActor();
      const token = makeToken({ actor });
      handlers.targetToken({ id: "user1" }, token, true);
      handlers.targetToken({ id: "user1" }, token, false);
      expect(document.querySelector(".ld-markd-panel")).toBeNull();
    });

    it("reuses an already-connected panel when a hovered token is also targeted", () => {
      const actor = makeActor();
      const token = makeToken({ actor });
      handlers.hoverToken(token, true);
      const firstPanel = document.querySelector(".ld-markd-panel");

      handlers.targetToken({ id: "user1" }, token, true);
      const panels = document.querySelectorAll(".ld-markd-panel");
      expect(panels).toHaveLength(1);
      expect(panels[0]).toBe(firstPanel);
      expect(panels[0].classList.contains("ldm-pinned")).toBe(true);

      handlers.targetToken({ id: "user1" }, token, false);
      expect(document.querySelectorAll(".ld-markd-panel")).toHaveLength(1);
      expect(document.querySelector(".ld-markd-panel").classList.contains("ldm-pinned")).toBe(false);
    });
  });

  describe("docking targeted panels away from the token", () => {
    it("docks a targeted panel in the top-right dock instead of floating near the token", () => {
      const actor = makeActor();
      handlers.targetToken({ id: "user1" }, makeToken({ actor }), true);
      const panel = document.querySelector(".ld-markd-panel");
      const dock = document.getElementById("ld-markd-dock");
      expect(dock).not.toBeNull();
      expect(panel.parentElement).toBe(dock);
      expect(panel.classList.contains("ldm-floating")).toBe(false);
      expect(panel.style.left).toBe("");
      expect(panel.style.top).toBe("");
    });

    it("stacks multiple targeted panels in the same dock", () => {
      const actorA = makeActor({ id: "a" });
      const actorB = makeActor({ id: "b" });
      handlers.targetToken({ id: "user1" }, makeToken({ id: "t1", actor: actorA }), true);
      handlers.targetToken({ id: "user1" }, makeToken({ id: "t2", actor: actorB }), true);

      expect(document.querySelectorAll("#ld-markd-dock")).toHaveLength(1);
      expect(document.querySelectorAll("#ld-markd-dock .ld-markd-panel")).toHaveLength(2);
    });

    it("does not re-append an already-docked panel when it re-renders while still pinned", () => {
      const actor = makeActor();
      const token = makeToken({ actor });
      handlers.targetToken({ id: "user1" }, token, true);
      const dock = document.getElementById("ld-markd-dock");
      const panel = document.querySelector(".ld-markd-panel");

      handlers.hoverToken(token, true);
      expect(document.querySelectorAll("#ld-markd-dock .ld-markd-panel")).toHaveLength(1);
      expect(panel.parentElement).toBe(dock);
    });

    it("moves a panel back to floating near the token when un-targeted while still hovered", () => {
      const actor = makeActor();
      const token = makeToken({ actor });
      handlers.hoverToken(token, true);
      handlers.targetToken({ id: "user1" }, token, true);
      const panel = document.querySelector(".ld-markd-panel");
      expect(panel.parentElement).toBe(document.getElementById("ld-markd-dock"));

      handlers.targetToken({ id: "user1" }, token, false);
      expect(panel.parentElement).toBe(document.body);
      expect(panel.classList.contains("ldm-floating")).toBe(true);
    });
  });

  describe("deleteToken", () => {
    it("removes an existing panel", () => {
      const actor = makeActor();
      const token = makeToken({ actor });
      handlers.hoverToken(token, true);
      handlers.deleteToken({ id: token.id });
      expect(document.querySelector(".ld-markd-panel")).toBeNull();
    });

    it("does nothing for a token with no tracked panel", () => {
      expect(() => handlers.deleteToken({ id: "nonexistent" })).not.toThrow();
    });
  });

  describe("ldMarkd.enabledChanged", () => {
    it("clears every panel when disabled", () => {
      const actorA = makeActor({ id: "a" });
      const actorB = makeActor({ id: "b" });
      handlers.hoverToken(makeToken({ id: "t1", actor: actorA }), true);
      handlers.hoverToken(makeToken({ id: "t2", actor: actorB }), true);
      expect(document.querySelectorAll(".ld-markd-panel")).toHaveLength(2);

      handlers["ldMarkd.enabledChanged"](false);
      expect(document.querySelectorAll(".ld-markd-panel")).toHaveLength(0);
    });

    it("does nothing when re-enabled", () => {
      const actor = makeActor();
      handlers.hoverToken(makeToken({ actor }), true);
      handlers["ldMarkd.enabledChanged"](true);
      expect(document.querySelectorAll(".ld-markd-panel")).toHaveLength(1);
    });
  });

  describe("effect/actor change hooks refresh visible panels", () => {
    it("re-renders a shown panel when its actor's effects change", () => {
      const actor = makeActor({ effects: { contents: [] } });
      const token = makeToken({ actor });
      handlers.hoverToken(token, true);
      const panel = document.querySelector(".ld-markd-panel");
      expect(panel.innerHTML).toContain("LDMARKD.Panel.NoConditions");

      actor.effects = { contents: [makeEffect({ name: "Prone" })] };
      handlers.updateActiveEffect({ parent: actor });
      expect(panel.innerHTML).toContain("Prone");

      handlers.createActiveEffect({ parent: actor });
      handlers.deleteActiveEffect({ parent: actor });
    });

    it("ignores effect changes with no parent actor", () => {
      expect(() => handlers.updateActiveEffect({ parent: undefined })).not.toThrow();
    });

    it("ignores effect changes for actors with no visible panel", () => {
      const shownActor = makeActor({ id: "shown", effects: { contents: [] } });
      const token = makeToken({ actor: shownActor });
      handlers.hoverToken(token, true);
      const panel = document.querySelector(".ld-markd-panel");
      const before = panel.innerHTML;

      const otherActor = makeActor({ id: "other", effects: { contents: [makeEffect()] } });
      handlers.updateActor(otherActor);
      expect(panel.innerHTML).toBe(before);
    });

    it("skips a panel whose token has lost its actor reference", () => {
      const actor = makeActor({ id: "shown", effects: { contents: [] } });
      const token = makeToken({ actor });
      handlers.hoverToken(token, true);
      token.actor = null;

      expect(() => handlers.updateActor(makeActor({ id: "shown" }))).not.toThrow();
    });

    it("refreshes every visible panel on combat update", () => {
      const actorA = makeActor({ id: "a", effects: { contents: [] } });
      const actorB = makeActor({ id: "b", effects: { contents: [] } });
      handlers.hoverToken(makeToken({ id: "t1", actor: actorA }), true);
      handlers.hoverToken(makeToken({ id: "t2", actor: actorB }), true);

      actorA.effects = { contents: [makeEffect({ name: "Stunned" })] };
      actorB.effects = { contents: [makeEffect({ name: "Prone" })] };
      handlers.updateCombat();

      const panels = document.querySelectorAll(".ld-markd-panel");
      expect(panels[0].innerHTML).toContain("Stunned");
      expect(panels[1].innerHTML).toContain("Prone");
    });
  });

  describe("panel content", () => {
    it("falls back from token texture to actor image", () => {
      const actor = makeActor({ img: "actor.webp" });
      handlers.hoverToken(makeToken({ actor, texture: { src: "token.webp" } }), true);
      expect(document.querySelector(".ldm-token-img").getAttribute("src")).toBe("token.webp");

      handlers.hoverToken(makeToken({ id: "tok2", actor, texture: undefined }), true);
      expect(document.querySelectorAll(".ldm-token-img")[1].getAttribute("src")).toBe("actor.webp");
    });

    it("falls back to an empty src when neither a texture nor an actor are available", () => {
      const actor = makeActor({ img: "placeholder.webp" });
      const token = makeToken({ actor, texture: undefined });
      handlers.hoverToken(token, true);
      token.actor = null;
      handlers.updateCombat();
      expect(document.querySelector(".ldm-token-img").getAttribute("src")).toBe("");
    });

    it("escapes a null token name safely", () => {
      const actor = makeActor();
      handlers.hoverToken(makeToken({ actor, name: null }), true);
      expect(document.querySelector(".ldm-token-name").textContent).toBe("");
    });

    it("filters out disabled and suppressed effects", () => {
      const actor = makeActor({
        effects: {
          contents: [
            makeEffect({ name: "Visible", disabled: false, isSuppressed: false }),
            makeEffect({ name: "Disabled", disabled: true }),
            makeEffect({ name: "Suppressed", isSuppressed: true })
          ]
        }
      });
      handlers.hoverToken(makeToken({ actor }), true);
      const panel = document.querySelector(".ld-markd-panel");
      expect(panel.innerHTML).toContain("Visible");
      expect(panel.innerHTML).not.toContain("Disabled");
      expect(panel.innerHTML).not.toContain("Suppressed");
    });

    it("falls back to an empty icon src when the effect has no image", () => {
      const effect = makeEffect({ img: undefined });
      const actor = makeActor({ effects: { contents: [effect] } });
      handlers.hoverToken(makeToken({ actor }), true);
      expect(document.querySelector(".ldm-effect-icon").getAttribute("src")).toBe("");
    });

    it("handles an actor with no effects collection at all", () => {
      const actor = makeActor({ effects: undefined });
      handlers.hoverToken(makeToken({ actor }), true);
      expect(document.querySelector(".ld-markd-panel").innerHTML).toContain("LDMARKD.Panel.NoConditions");
    });

    it("renders duration, applied-by, and description when present", () => {
      global.fromUuidSync = jest.fn(() => ({ name: "Bastard Sword" }));
      const effect = makeEffect({
        name: "Clumsy 1",
        duration: { label: "1 Round" },
        origin: "Item.abc123",
        description: "<p>Clumsy movements.</p>"
      });
      const actor = makeActor({ effects: { contents: [effect] } });
      handlers.hoverToken(makeToken({ actor }), true);
      const html = document.querySelector(".ld-markd-panel").innerHTML;
      expect(html).toContain("1 Round");
      expect(html).toContain("Bastard Sword");
      expect(html).toContain("<p>Clumsy movements.</p>");
    });

    it("omits duration, applied-by, and description when absent", () => {
      const effect = makeEffect({ duration: undefined, origin: undefined, description: undefined });
      const actor = makeActor({ effects: { contents: [effect] } });
      handlers.hoverToken(makeToken({ actor }), true);
      const html = document.querySelector(".ld-markd-panel").innerHTML;
      expect(html).not.toContain("ldm-effect-duration");
      expect(html).not.toContain("ldm-effect-applied-by");
      expect(html).not.toContain("ldm-effect-description");
    });

    it("treats a duration with an empty label as no duration", () => {
      const effect = makeEffect({ duration: { label: "" } });
      const actor = makeActor({ effects: { contents: [effect] } });
      handlers.hoverToken(makeToken({ actor }), true);
      expect(document.querySelector(".ld-markd-panel").innerHTML).not.toContain("ldm-effect-duration");
    });

    it("swallows an error thrown while reading effect.duration", () => {
      const effect = makeEffect();
      Object.defineProperty(effect, "duration", {
        get() {
          throw new Error("boom");
        }
      });
      const actor = makeActor({ effects: { contents: [effect] } });
      expect(() => handlers.hoverToken(makeToken({ actor }), true)).not.toThrow();
      expect(document.querySelector(".ld-markd-panel").innerHTML).not.toContain("ldm-effect-duration");
    });

    it("treats an unresolvable origin as no applied-by label", () => {
      global.fromUuidSync = jest.fn(() => null);
      const effect = makeEffect({ origin: "Item.missing" });
      const actor = makeActor({ effects: { contents: [effect] } });
      handlers.hoverToken(makeToken({ actor }), true);
      expect(document.querySelector(".ld-markd-panel").innerHTML).not.toContain("ldm-effect-applied-by");
    });

    it("swallows an error thrown while resolving the origin uuid", () => {
      global.fromUuidSync = jest.fn(() => {
        throw new Error("bad uuid");
      });
      const effect = makeEffect({ origin: "Item.bad" });
      const actor = makeActor({ effects: { contents: [effect] } });
      expect(() => handlers.hoverToken(makeToken({ actor }), true)).not.toThrow();
      expect(document.querySelector(".ld-markd-panel").innerHTML).not.toContain("ldm-effect-applied-by");
    });
  });

  describe("positioning", () => {
    it("positions the panel relative to the canvas view when canvas is ready", () => {
      global.canvas.app.view.getBoundingClientRect = jest.fn(() => ({ left: 50, top: 20 }));
      const actor = makeActor();
      handlers.hoverToken(makeToken({ actor, x: 100, y: 200, w: 100 }), true);
      const panel = document.querySelector(".ld-markd-panel");
      expect(panel.style.left).toBe("258px");
      expect(panel.style.top).toBe("220px");
    });

    it("skips positioning while the canvas is not ready", () => {
      global.canvas.ready = false;
      const actor = makeActor();
      handlers.hoverToken(makeToken({ actor }), true);
      const panel = document.querySelector(".ld-markd-panel");
      expect(panel.style.left).toBe("");
    });

    it("flips the panel on-screen when it would overflow the viewport", () => {
      const actor = makeActor();
      handlers.hoverToken(makeToken({ actor }), true);
      const panel = document.querySelector(".ld-markd-panel");
      panel.getBoundingClientRect = () => ({ right: 5000, bottom: 5000, width: 4000, height: 4000 });

      handlers.hoverToken(makeToken({ actor }), true);
      expect(panel.style.left).toBe("4px");
      expect(panel.style.top).toBe("4px");
    });
  });

  describe("ticker", () => {
    it("attaches the ticker once and repositions all visible panels on each tick", () => {
      const actor = makeActor();
      handlers.hoverToken(makeToken({ id: "t1", actor }), true);
      handlers.hoverToken(makeToken({ id: "t2", actor }), true);
      expect(global.canvas.app.ticker.add).toHaveBeenCalledTimes(1);

      const tick = global.canvas.app.ticker.add.mock.calls[0][0];
      expect(() => tick()).not.toThrow();
      expect(global.canvas.app.ticker.remove).not.toHaveBeenCalled();
    });

    it("detaches the ticker once no panels remain visible", () => {
      const actor = makeActor();
      const token = makeToken({ actor });
      handlers.hoverToken(token, true);
      const tick = global.canvas.app.ticker.add.mock.calls[0][0];

      handlers.hoverToken(token, false);
      tick();
      expect(global.canvas.app.ticker.remove).toHaveBeenCalledWith(tick);

      handlers.hoverToken(token, true);
      expect(global.canvas.app.ticker.add).toHaveBeenCalledTimes(2);
    });

    it("never attaches the ticker for a targeted-only (docked) panel", () => {
      const actor = makeActor();
      handlers.targetToken({ id: "user1" }, makeToken({ actor }), true);
      expect(global.canvas.app.ticker.add).not.toHaveBeenCalled();
    });

    it("detaches the ticker once the only remaining panels are docked", () => {
      const actor = makeActor();
      const token = makeToken({ actor });
      handlers.hoverToken(token, true);
      const tick = global.canvas.app.ticker.add.mock.calls[0][0];

      handlers.targetToken({ id: "user1" }, token, true);
      tick();
      expect(global.canvas.app.ticker.remove).toHaveBeenCalledWith(tick);
    });

    it("skips repositioning docked panels on tick", () => {
      const floatingActor = makeActor({ id: "floating" });
      const pinnedActor = makeActor({ id: "pinned" });
      handlers.hoverToken(makeToken({ id: "t1", actor: floatingActor }), true);
      handlers.targetToken({ id: "user1" }, makeToken({ id: "t2", actor: pinnedActor }), true);
      const tick = global.canvas.app.ticker.add.mock.calls[0][0];

      const dockedPanel = document.querySelector("#ld-markd-dock .ld-markd-panel");
      tick();
      expect(dockedPanel.style.left).toBe("");
    });
  });
});
