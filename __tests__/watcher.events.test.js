import { jest } from "@jest/globals";
import { makeToken, makeActor, makeEffect, setupWatcher, flushHoverGrace } from "./helpers/watcher-test-utils.js";
import { _resetForTests } from "../scripts/watcher.js";

describe("watcher.js — hooks and panel lifecycle", () => {
  let handlers;

  beforeEach(() => {
    handlers = setupWatcher();
  });

  it("registers a handler for every hook it needs", () => {
    for (const event of [
      "hoverToken",
      "targetToken",
      "updateActiveEffect",
      "createActiveEffect",
      "deleteActiveEffect",
      "createItem",
      "updateItem",
      "deleteItem",
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

    it("ignores player-owned tokens (PCs are not NPC/monster targets)", () => {
      const actor = makeActor({ hasPlayerOwner: true });
      handlers.hoverToken(makeToken({ actor }), true);
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
      flushHoverGrace();
      expect(document.querySelector(".ld-markd-panel")).toBeNull();
    });

    it("hides the panel on hover-out after the grace period", () => {
      const actor = makeActor();
      const token = makeToken({ actor });
      handlers.hoverToken(token, true);
      handlers.hoverToken(token, false);
      expect(document.querySelector(".ld-markd-panel")).not.toBeNull();
      flushHoverGrace();
      expect(document.querySelector(".ld-markd-panel")).toBeNull();
    });

    it("keeps the panel open while the pointer is over it after token hover-out", () => {
      const actor = makeActor();
      const token = makeToken({ actor });
      handlers.hoverToken(token, true);
      const panel = document.querySelector(".ld-markd-panel");
      panel.dispatchEvent(new Event("pointerenter"));
      handlers.hoverToken(token, false);
      flushHoverGrace();
      expect(document.querySelector(".ld-markd-panel")).not.toBeNull();
      panel.dispatchEvent(new Event("pointerleave"));
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

    it("ignores targeting a player-owned token", () => {
      const actor = makeActor({ hasPlayerOwner: true });
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

    it("lets a pinned panel be dragged by its header to a free position", () => {
      const actor = makeActor();
      handlers.targetToken({ id: "user1" }, makeToken({ actor }), true);
      const panel = document.querySelector(".ld-markd-panel");
      panel.getBoundingClientRect = () => ({ left: 800, top: 60, right: 1000, bottom: 200, width: 200, height: 140 });

      const header = panel.querySelector(".ldm-header");
      header.dispatchEvent(
        new MouseEvent("pointerdown", { button: 0, clientX: 820, clientY: 70, bubbles: true })
      );
      expect(panel.classList.contains("ldm-dragging")).toBe(true);
      expect(panel.parentElement).toBe(document.body);

      window.dispatchEvent(new MouseEvent("pointermove", { clientX: 420, clientY: 220 }));
      expect(panel.style.left).toBe("400px");
      expect(panel.style.top).toBe("210px");

      window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
      expect(panel.classList.contains("ldm-dragging")).toBe(false);
      // Still free-positioned after drag ends
      expect(panel.parentElement).toBe(document.body);
      expect(panel.style.left).toBe("400px");

      // Second drag reuses existing userPos (no dock lift path)
      panel.getBoundingClientRect = () => ({ left: 400, top: 210, right: 600, bottom: 350, width: 200, height: 140 });
      header.dispatchEvent(
        new MouseEvent("pointerdown", { button: 0, clientX: 410, clientY: 220, bubbles: true })
      );
      window.dispatchEvent(new MouseEvent("pointermove", { clientX: 310, clientY: 320 }));
      expect(panel.style.left).toBe("300px");
      expect(panel.style.top).toBe("310px");
      window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));

      // Re-render while free-positioned (already on document.body)
      handlers.hoverToken(makeToken({ actor }), true);
      expect(panel.parentElement).toBe(document.body);
      expect(panel.style.left).toBe("300px");
    });

    it("keeps the panel when leaving it while the token is still hovered", () => {
      const actor = makeActor();
      const token = makeToken({ actor });
      handlers.hoverToken(token, true);
      const panel = document.querySelector(".ld-markd-panel");
      panel.dispatchEvent(new Event("pointerenter"));
      panel.dispatchEvent(new Event("pointerleave"));
      expect(document.querySelector(".ld-markd-panel")).not.toBeNull();
    });

    it("ignores un-target when the token was never tracked", () => {
      const actor = makeActor();
      expect(() => handlers.targetToken({ id: "user1" }, makeToken({ actor }), false)).not.toThrow();
    });

    it("ignores panel pointer events after the entry has been removed", () => {
      const actor = makeActor();
      const token = makeToken({ actor });
      handlers.hoverToken(token, true);
      const panel = document.querySelector(".ld-markd-panel");
      handlers.deleteToken({ id: token.id });
      expect(() => {
        panel.dispatchEvent(new Event("pointerenter"));
        panel.dispatchEvent(new Event("pointerleave"));
      }).not.toThrow();
    });

    it("aborts an in-progress drag if the panel entry is removed", () => {
      const actor = makeActor();
      const token = makeToken({ actor });
      handlers.targetToken({ id: "user1" }, token, true);
      const panel = document.querySelector(".ld-markd-panel");
      panel.getBoundingClientRect = () => ({ left: 100, top: 100, right: 300, bottom: 200, width: 200, height: 100 });
      panel.querySelector(".ldm-header").dispatchEvent(
        new MouseEvent("pointerdown", { button: 0, clientX: 110, clientY: 110, bubbles: true })
      );
      handlers.deleteToken({ id: token.id });
      expect(() => window.dispatchEvent(new MouseEvent("pointermove", { clientX: 200, clientY: 200 }))).not.toThrow();
      window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
    });

    it("ignores drag starts that are not on the header or not left-button", () => {
      const actor = makeActor();
      handlers.targetToken({ id: "user1" }, makeToken({ actor }), true);
      const panel = document.querySelector(".ld-markd-panel");
      panel.querySelector(".ldm-effects").dispatchEvent(
        new MouseEvent("pointerdown", { button: 0, clientX: 10, clientY: 10, bubbles: true })
      );
      expect(panel.classList.contains("ldm-dragging")).toBe(false);
      panel.querySelector(".ldm-header").dispatchEvent(
        new MouseEvent("pointerdown", { button: 2, clientX: 10, clientY: 10, bubbles: true })
      );
      expect(panel.classList.contains("ldm-dragging")).toBe(false);
    });

    it("does not start a drag on a hover-only (unpinned) panel", () => {
      const actor = makeActor();
      handlers.hoverToken(makeToken({ actor }), true);
      const panel = document.querySelector(".ld-markd-panel");
      panel.querySelector(".ldm-header").dispatchEvent(
        new MouseEvent("pointerdown", { button: 0, clientX: 10, clientY: 10, bubbles: true })
      );
      expect(panel.classList.contains("ldm-dragging")).toBe(false);
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

    it("clears pending hover-hide timers when the module is disabled", () => {
      const actor = makeActor();
      const token = makeToken({ actor });
      handlers.hoverToken(token, true);
      handlers.hoverToken(token, false); // schedules grace timer
      handlers["ldMarkd.enabledChanged"](false);
      flushHoverGrace();
      expect(document.querySelector(".ld-markd-panel")).toBeNull();
    });

    it("clears pending hide timers on test reset without re-firing hide", () => {
      const actor = makeActor();
      const token = makeToken({ actor });
      handlers.hoverToken(token, true);
      handlers.hoverToken(token, false);
      _resetForTests();
      // Timer was cleared — advancing time must not throw or resurrect state.
      expect(() => flushHoverGrace()).not.toThrow();
    });

    it("cancels a pending hover-hide when the token is hovered again", () => {
      const actor = makeActor();
      const token = makeToken({ actor });
      handlers.hoverToken(token, true);
      handlers.hoverToken(token, false);
      handlers.hoverToken(token, true);
      flushHoverGrace();
      expect(document.querySelector(".ld-markd-panel")).not.toBeNull();
    });

    it("resets a dragged pinned panel when un-targeted", () => {
      const actor = makeActor();
      const token = makeToken({ actor });
      handlers.targetToken({ id: "user1" }, token, true);
      const panel = document.querySelector(".ld-markd-panel");
      panel.getBoundingClientRect = () => ({ left: 100, top: 100, right: 300, bottom: 200, width: 200, height: 100 });
      panel.querySelector(".ldm-header").dispatchEvent(
        new MouseEvent("pointerdown", { button: 0, clientX: 110, clientY: 110, bubbles: true })
      );
      window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
      handlers.targetToken({ id: "user1" }, token, false);
      expect(document.querySelector(".ld-markd-panel")).toBeNull();
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

    it("resolves an Item parent up to its owning actor for transferred effects", () => {
      const actor = makeActor({ effects: { contents: [] } });
      const token = makeToken({ actor });
      handlers.hoverToken(token, true);
      const panel = document.querySelector(".ld-markd-panel");

      actor.effects = { contents: [makeEffect({ name: "Blessed" })] };
      handlers.updateActiveEffect({ parent: { actor } });
      expect(panel.innerHTML).toContain("Blessed");
    });

    it("resolves a documentName=Item parent via parent.parent", () => {
      const actor = makeActor({ effects: { contents: [] } });
      const token = makeToken({ actor });
      handlers.hoverToken(token, true);
      const panel = document.querySelector(".ld-markd-panel");

      actor.effects = { contents: [makeEffect({ name: "Hexed" })] };
      handlers.createActiveEffect({ parent: { documentName: "Item", parent: actor } });
      expect(panel.innerHTML).toContain("Hexed");
    });

    it("ignores effect changes with no parent actor", () => {
      expect(() => handlers.updateActiveEffect({ parent: undefined })).not.toThrow();
    });

    it("refreshes a panel when a PF2e-style condition item is created on the actor", () => {
      const actor = makeActor({ effects: { contents: [] } });
      const token = makeToken({ actor });
      handlers.hoverToken(token, true);
      const panel = document.querySelector(".ld-markd-panel");

      // Simulate the actor gaining a displayable condition via Item hooks:
      // listDisplayConditions for non-pf2e still reads effects; swap in AE data.
      actor.effects = { contents: [makeEffect({ name: "Blinded" })] };
      handlers.createItem({ actor, type: "condition" });
      expect(panel.innerHTML).toContain("Blinded");
    });

    it("resolves an item parent actor via item.parent", () => {
      const actor = makeActor({ effects: { contents: [] } });
      const token = makeToken({ actor });
      handlers.hoverToken(token, true);
      actor.effects = { contents: [makeEffect({ name: "Grabbed" })] };
      handlers.updateItem({ parent: actor, type: "condition" });
      expect(document.querySelector(".ld-markd-panel").innerHTML).toContain("Grabbed");
    });

    it("ignores item hooks with no resolvable actor", () => {
      expect(() => handlers.deleteItem(null)).not.toThrow();
      expect(() => handlers.deleteItem({})).not.toThrow();
      expect(() => handlers.deleteItem({ parent: { documentName: "Actor" } })).not.toThrow();
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
});
