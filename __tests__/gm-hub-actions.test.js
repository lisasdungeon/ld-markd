import { jest } from "@jest/globals";
import { addCondition, removeCondition, editCondition } from "../scripts/gm-hub-actions.js";

describe("gm-hub-actions.js", () => {
  beforeEach(() => {
    global.game = { system: { id: "dnd5e" } };
  });

  describe("addCondition", () => {
    it("toggles the given status on via the actor's native API", async () => {
      const toggleStatusEffect = jest.fn();
      const token = { actor: { toggleStatusEffect } };
      await addCondition(token, "prone");
      expect(toggleStatusEffect).toHaveBeenCalledWith("prone", { active: true });
    });

    it("uses toggleCondition on PF2e when available", async () => {
      global.game.system = { id: "pf2e" };
      const toggleCondition = jest.fn();
      const token = { actor: { toggleCondition, toggleStatusEffect: jest.fn() } };
      await addCondition(token, "blinded");
      expect(toggleCondition).toHaveBeenCalledWith("blinded", { active: true });
      expect(token.actor.toggleStatusEffect).not.toHaveBeenCalled();
    });

    it("does nothing when no statusId is given", async () => {
      const toggleStatusEffect = jest.fn();
      const token = { actor: { toggleStatusEffect } };
      await addCondition(token, undefined);
      expect(toggleStatusEffect).not.toHaveBeenCalled();
    });

    it("does nothing when the token has no actor", async () => {
      await expect(addCondition({ actor: null }, "prone")).resolves.toBeUndefined();
    });
  });

  describe("removeCondition", () => {
    it("deletes the matching effect", async () => {
      const del = jest.fn();
      const effect = { delete: del };
      const token = { actor: { effects: { get: jest.fn(() => effect) } } };
      await removeCondition(token, "eff1");
      expect(del).toHaveBeenCalled();
    });

    it("force-removes a PF2e condition via decreaseCondition", async () => {
      global.game.system = { id: "pf2e" };
      const decreaseCondition = jest.fn();
      const condition = { id: "c1" };
      const token = {
        actor: {
          decreaseCondition,
          conditions: { get: jest.fn(() => condition) }
        }
      };
      await removeCondition(token, "c1");
      expect(decreaseCondition).toHaveBeenCalledWith(condition, { forceRemove: true });
    });

    it("deletes a PF2e condition document when decreaseCondition is unavailable", async () => {
      global.game.system = { id: "pf2e" };
      const del = jest.fn();
      const token = {
        actor: {
          conditions: { get: jest.fn(() => ({ id: "c1", delete: del })) }
        }
      };
      await removeCondition(token, "c1");
      expect(del).toHaveBeenCalled();
    });

    it("deletes a PF2e effect item by id when it is not a condition", async () => {
      global.game.system = { id: "pf2e" };
      const del = jest.fn();
      const token = {
        actor: {
          conditions: { get: jest.fn(() => null) },
          items: { get: jest.fn(() => ({ type: "effect", delete: del })) }
        }
      };
      await removeCondition(token, "e1");
      expect(del).toHaveBeenCalled();
    });

    it("deletes a PF2e condition-type item found only on items", async () => {
      global.game.system = { id: "pf2e" };
      const del = jest.fn();
      const token = {
        actor: {
          conditions: { get: jest.fn(() => null) },
          items: { get: jest.fn(() => ({ type: "condition", delete: del })) }
        }
      };
      await removeCondition(token, "c2");
      expect(del).toHaveBeenCalled();
    });

    it("does nothing when a PF2e condition has no remove API", async () => {
      global.game.system = { id: "pf2e" };
      const token = {
        actor: {
          conditions: { get: jest.fn(() => ({ id: "c1" })) }
        }
      };
      await expect(removeCondition(token, "c1")).resolves.toBeUndefined();
    });

    it("does nothing when the effect cannot be found", async () => {
      const token = { actor: { effects: { get: jest.fn(() => undefined) } } };
      await expect(removeCondition(token, "missing")).resolves.toBeUndefined();
    });

    it("does nothing when the token has no actor", async () => {
      await expect(removeCondition({ actor: null }, "eff1")).resolves.toBeUndefined();
    });

    it("does nothing when effectId is missing", async () => {
      const token = { actor: { effects: { get: jest.fn() } } };
      await removeCondition(token, undefined);
      expect(token.actor.effects.get).not.toHaveBeenCalled();
    });

    it("ignores non-condition/effect items on PF2e", async () => {
      global.game.system = { id: "pf2e" };
      const del = jest.fn();
      const token = {
        actor: {
          conditions: { get: jest.fn(() => null) },
          items: { get: jest.fn(() => ({ type: "weapon", delete: del })) },
          effects: { get: jest.fn(() => null) }
        }
      };
      await removeCondition(token, "w1");
      expect(del).not.toHaveBeenCalled();
    });
  });

  describe("editCondition", () => {
    it("renders the effect's own sheet", () => {
      const render = jest.fn();
      const effect = { sheet: { render } };
      const token = { actor: { effects: { get: jest.fn(() => effect) } } };
      editCondition(token, "eff1");
      expect(render).toHaveBeenCalledWith(true);
    });

    it("opens a PF2e condition sheet when present", () => {
      global.game.system = { id: "pf2e" };
      const render = jest.fn();
      const token = {
        actor: {
          conditions: { get: jest.fn(() => ({ sheet: { render } })) }
        }
      };
      editCondition(token, "c1");
      expect(render).toHaveBeenCalledWith(true);
    });

    it("opens a PF2e item sheet when the condition collection misses", () => {
      global.game.system = { id: "pf2e" };
      const render = jest.fn();
      const token = {
        actor: {
          conditions: { get: jest.fn(() => null) },
          items: { get: jest.fn(() => ({ sheet: { render } })) }
        }
      };
      editCondition(token, "e1");
      expect(render).toHaveBeenCalledWith(true);
    });

    it("falls through when PF2e finds neither condition nor item sheet", () => {
      global.game.system = { id: "pf2e" };
      const render = jest.fn();
      const token = {
        actor: {
          conditions: { get: jest.fn(() => null) },
          items: { get: jest.fn(() => null) },
          effects: { get: jest.fn(() => ({ sheet: { render } })) }
        }
      };
      editCondition(token, "eff1");
      expect(render).toHaveBeenCalledWith(true);
    });

    it("does nothing when the effect cannot be found", () => {
      const token = { actor: { effects: { get: jest.fn(() => undefined) } } };
      expect(() => editCondition(token, "missing")).not.toThrow();
    });

    it("does nothing when effectId is missing", () => {
      expect(() => editCondition({ actor: {} }, undefined)).not.toThrow();
    });

    it("does nothing when the effect has no sheet", () => {
      const token = { actor: { effects: { get: jest.fn(() => ({})) } } };
      expect(() => editCondition(token, "eff1")).not.toThrow();
    });

    it("does nothing when the token has no actor", () => {
      expect(() => editCondition({ actor: null }, "eff1")).not.toThrow();
    });
  });
});
