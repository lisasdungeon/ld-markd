import { jest } from "@jest/globals";
import { getSceneMobs } from "../scripts/gm-hub-data.js";

function makeToken({ id = "tok1", name = "Goblin", texture, actor = null } = {}) {
  return { id, actor, document: { name, texture } };
}

function makeActor({ img = "actor.webp", hasPlayerOwner = false, effects, statuses } = {}) {
  return { img, hasPlayerOwner, effects, statuses };
}

function makeEffect(overrides = {}) {
  return {
    id: "eff1",
    name: "Prone",
    img: "icons/prone.webp",
    disabled: false,
    isSuppressed: false,
    duration: undefined,
    ...overrides
  };
}

describe("gm-hub-data.js", () => {
  beforeEach(() => {
    global.game = { i18n: { localize: jest.fn((key) => key) } };
    global.CONFIG = { statusEffects: [] };
  });

  describe("getSceneMobs", () => {
    it("returns an empty array when there is no canvas", () => {
      global.canvas = undefined;
      expect(getSceneMobs()).toEqual([]);
    });

    it("returns an empty array when the canvas has no tokens layer", () => {
      global.canvas = {};
      expect(getSceneMobs()).toEqual([]);
    });

    it("excludes tokens without an actor", () => {
      global.canvas = { tokens: { placeables: [makeToken({ actor: null })] } };
      expect(getSceneMobs()).toEqual([]);
    });

    it("excludes player-owned actors", () => {
      const actor = makeActor({ hasPlayerOwner: true });
      global.canvas = { tokens: { placeables: [makeToken({ actor })] } };
      expect(getSceneMobs()).toEqual([]);
    });

    it("includes non-player-owned actors with their token name and image", () => {
      const actor = makeActor({ img: "actor.webp" });
      global.canvas = { tokens: { placeables: [makeToken({ actor, name: "Goblin", texture: { src: "token.webp" } })] } };
      const mobs = getSceneMobs();
      expect(mobs).toHaveLength(1);
      expect(mobs[0]).toMatchObject({ tokenId: "tok1", name: "Goblin", img: "token.webp" });
    });

    it("falls back to the actor image when the token has no texture", () => {
      const actor = makeActor({ img: "actor.webp" });
      global.canvas = { tokens: { placeables: [makeToken({ actor, texture: undefined })] } };
      expect(getSceneMobs()[0].img).toBe("actor.webp");
    });

    it("falls back to an empty src when neither a texture nor an actor image exist", () => {
      const actor = makeActor({ img: null });
      global.canvas = { tokens: { placeables: [makeToken({ actor, texture: undefined })] } };
      expect(getSceneMobs()[0].img).toBe("");
    });
  });

  describe("conditions", () => {
    it("returns no conditions for an actor with no effects collection", () => {
      const actor = makeActor({ effects: undefined });
      global.canvas = { tokens: { placeables: [makeToken({ actor })] } };
      expect(getSceneMobs()[0].conditions).toEqual([]);
    });

    it("excludes suppressed effects but keeps disabled ones, and maps their fields", () => {
      const visible = makeEffect({ id: "e1", name: "Visible" });
      const disabled = makeEffect({ id: "e2", name: "Disabled", disabled: true });
      const suppressed = makeEffect({ id: "e3", name: "Suppressed", isSuppressed: true });
      const actor = makeActor({ effects: { contents: [visible, disabled, suppressed] } });
      global.canvas = { tokens: { placeables: [makeToken({ actor })] } };

      const conditions = getSceneMobs()[0].conditions;
      expect(conditions.map((c) => c.id)).toEqual(["e1", "e2"]);
      expect(conditions[1].disabled).toBe(true);
    });

    it("falls back to an empty icon src when a condition has no image", () => {
      const effect = makeEffect({ img: undefined });
      const actor = makeActor({ effects: { contents: [effect] } });
      global.canvas = { tokens: { placeables: [makeToken({ actor })] } };
      expect(getSceneMobs()[0].conditions[0].img).toBe("");
    });

    it("reads a duration label when present", () => {
      const effect = makeEffect({ duration: { label: "1 Round" } });
      const actor = makeActor({ effects: { contents: [effect] } });
      global.canvas = { tokens: { placeables: [makeToken({ actor })] } };
      expect(getSceneMobs()[0].conditions[0].duration).toBe("1 Round");
    });

    it("treats a missing duration as null", () => {
      const effect = makeEffect({ duration: undefined });
      const actor = makeActor({ effects: { contents: [effect] } });
      global.canvas = { tokens: { placeables: [makeToken({ actor })] } };
      expect(getSceneMobs()[0].conditions[0].duration).toBeNull();
    });

    it("swallows an error thrown while reading effect.duration", () => {
      const effect = makeEffect();
      Object.defineProperty(effect, "duration", {
        get() {
          throw new Error("boom");
        }
      });
      const actor = makeActor({ effects: { contents: [effect] } });
      global.canvas = { tokens: { placeables: [makeToken({ actor })] } };
      expect(() => getSceneMobs()).not.toThrow();
      expect(getSceneMobs()[0].conditions[0].duration).toBeNull();
    });
  });

  describe("availableStatuses", () => {
    it("returns an empty list when the system defines no status effects", () => {
      global.CONFIG = { statusEffects: undefined };
      const actor = makeActor();
      global.canvas = { tokens: { placeables: [makeToken({ actor })] } };
      expect(getSceneMobs()[0].availableStatuses).toEqual([]);
    });

    it("skips status entries with no id", () => {
      global.CONFIG = { statusEffects: [{ name: "No Id" }] };
      const actor = makeActor();
      global.canvas = { tokens: { placeables: [makeToken({ actor })] } };
      expect(getSceneMobs()[0].availableStatuses).toEqual([]);
    });

    it("marks statuses already applied to the actor as active", () => {
      global.CONFIG = { statusEffects: [{ id: "prone", name: "Prone" }, { id: "stunned", name: "Stunned" }] };
      const actor = makeActor({ statuses: new Set(["prone"]) });
      global.canvas = { tokens: { placeables: [makeToken({ actor })] } };
      const statuses = getSceneMobs()[0].availableStatuses;
      expect(statuses).toEqual([
        { id: "prone", name: "Prone", active: true },
        { id: "stunned", name: "Stunned", active: false }
      ]);
    });

    it("treats a missing actor.statuses set as no active statuses", () => {
      global.CONFIG = { statusEffects: [{ id: "prone", name: "Prone" }] };
      const actor = makeActor({ statuses: undefined });
      global.canvas = { tokens: { placeables: [makeToken({ actor })] } };
      expect(getSceneMobs()[0].availableStatuses[0].active).toBe(false);
    });

    it("falls back from name to label to id for localization", () => {
      global.CONFIG = {
        statusEffects: [{ id: "a", name: "Named" }, { id: "b", label: "Labeled" }, { id: "c" }]
      };
      const actor = makeActor();
      global.canvas = { tokens: { placeables: [makeToken({ actor })] } };
      const statuses = getSceneMobs()[0].availableStatuses;
      expect(statuses.map((s) => s.name)).toEqual(["Named", "Labeled", "c"]);
    });
  });
});
