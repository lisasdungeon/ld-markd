import { jest } from "@jest/globals";
import { addCondition, removeCondition, editCondition } from "../scripts/gm-hub-actions.js";

describe("gm-hub-actions.js", () => {
  describe("addCondition", () => {
    it("toggles the given status on via the actor's native API", async () => {
      const toggleStatusEffect = jest.fn();
      const token = { actor: { toggleStatusEffect } };
      await addCondition(token, "prone");
      expect(toggleStatusEffect).toHaveBeenCalledWith("prone", { active: true });
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

    it("does nothing when the effect cannot be found", async () => {
      const token = { actor: { effects: { get: jest.fn(() => undefined) } } };
      await expect(removeCondition(token, "missing")).resolves.toBeUndefined();
    });

    it("does nothing when the token has no actor", async () => {
      await expect(removeCondition({ actor: null }, "eff1")).resolves.toBeUndefined();
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

    it("does nothing when the effect cannot be found", () => {
      const token = { actor: { effects: { get: jest.fn(() => undefined) } } };
      expect(() => editCondition(token, "missing")).not.toThrow();
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
