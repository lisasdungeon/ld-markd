import { jest } from "@jest/globals";
import { makeToken, makeActor, makeEffect, setupWatcher } from "./helpers/watcher-test-utils.js";

describe("watcher.js — panel content, positioning, and the ticker", () => {
  let handlers;

  beforeEach(() => {
    handlers = setupWatcher();
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

    it("uses allApplicableEffects when present (includes transferred item effects)", () => {
      const actor = makeActor({ effects: { contents: [makeEffect({ name: "OnActorOnly" })] } });
      actor.allApplicableEffects = function* () {
        yield makeEffect({ name: "Transferred", disabled: false, isSuppressed: false });
      };
      handlers.hoverToken(makeToken({ actor }), true);
      const html = document.querySelector(".ld-markd-panel").innerHTML;
      expect(html).toContain("Transferred");
      expect(html).not.toContain("OnActorOnly");
    });

    it("shows PF2e conditions from actor.conditions", () => {
      global.game.system = { id: "pf2e" };
      const actor = makeActor({ effects: undefined });
      actor.conditions = {
        active: [{ id: "c1", name: "Blinded", img: "b.webp", active: true }]
      };
      actor.itemTypes = { effect: [] };
      handlers.hoverToken(makeToken({ actor }), true);
      expect(document.querySelector(".ld-markd-panel").innerHTML).toContain("Blinded");
    });

    it("renders duration, applied-by, and description from display conditions", () => {
      global.game.system = { id: "pf2e" };
      const actor = makeActor({ effects: undefined });
      actor.conditions = {
        active: [
          {
            id: "c1",
            name: "Sickened",
            img: "s.webp",
            active: true,
            remainingDuration: { expired: false, remaining: 90 },
            appliedBy: { name: "Plague" },
            system: { description: { value: "<p>Sick.</p>" } }
          }
        ]
      };
      actor.itemTypes = { effect: [] };
      handlers.hoverToken(makeToken({ actor }), true);
      const html = document.querySelector(".ld-markd-panel").innerHTML;
      expect(html).toContain("ldm-effect-duration");
      expect(html).toContain("Plague");
      expect(html).toContain("<p>Sick.</p>");
    });

    it("renders a condition row without optional duration/applied-by/description", () => {
      global.game.system = { id: "pf2e" };
      const actor = makeActor({ effects: undefined });
      actor.conditions = {
        active: [{ id: "c1", name: "Prone", img: undefined, active: true }]
      };
      actor.itemTypes = { effect: [] };
      handlers.hoverToken(makeToken({ actor }), true);
      const html = document.querySelector(".ld-markd-panel").innerHTML;
      expect(html).toContain("Prone");
      expect(html).not.toContain("ldm-effect-duration");
      expect(html).not.toContain("ldm-effect-applied-by");
      expect(html).not.toContain("ldm-effect-description");
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

    it("omits indefinite duration badges (None / infinite remaining / infinite seconds)", () => {
      for (const duration of [
        { label: "None" },
        { label: "forever", remaining: Infinity },
        { label: "forever", seconds: Infinity },
        { label: "n/a" },
        { label: "-" }
      ]) {
        document.body.innerHTML = "";
        const actor = makeActor({ effects: { contents: [makeEffect({ duration })] } });
        handlers.hoverToken(makeToken({ actor }), true);
        expect(document.querySelector(".ld-markd-panel").innerHTML).not.toContain("ldm-effect-duration");
        handlers.hoverToken(makeToken({ actor }), false);
      }
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
