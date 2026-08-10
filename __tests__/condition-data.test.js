import { jest } from "@jest/globals";
import { listDisplayConditions, listAvailableStatuses, isPf2e } from "../scripts/condition-data.js";

function makeEffect(overrides = {}) {
  return {
    id: "eff1",
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

describe("condition-data.js", () => {
  beforeEach(() => {
    global.game = {
      system: { id: "dnd5e" },
      i18n: { localize: jest.fn((key) => key) },
      user: { isGM: true }
    };
    global.CONFIG = { statusEffects: [] };
    global.fromUuidSync = jest.fn();
  });

  describe("isPf2e", () => {
    it("is true only when the active system id is pf2e", () => {
      expect(isPf2e()).toBe(false);
      global.game.system = { id: "pf2e" };
      expect(isPf2e()).toBe(true);
    });
  });

  describe("listDisplayConditions — core Active Effects", () => {
    it("returns empty for a null actor", () => {
      expect(listDisplayConditions(null)).toEqual([]);
    });

    it("maps active effects and skips suppressed/disabled when activeOnly", () => {
      const actor = {
        effects: {
          contents: [
            makeEffect({ id: "a", name: "Visible" }),
            makeEffect({ id: "b", name: "Disabled", disabled: true }),
            makeEffect({ id: "c", name: "Suppressed", isSuppressed: true })
          ]
        }
      };
      const rows = listDisplayConditions(actor, { activeOnly: true });
      expect(rows.map((r) => r.name)).toEqual(["Visible"]);
      expect(rows[0].kind).toBe("active-effect");
    });

    it("keeps disabled effects when activeOnly is false", () => {
      const actor = {
        effects: {
          contents: [
            makeEffect({ id: "a", name: "On" }),
            makeEffect({ id: "b", name: "Off", disabled: true })
          ]
        }
      };
      expect(listDisplayConditions(actor, { activeOnly: false }).map((r) => r.name)).toEqual(["On", "Off"]);
    });

    it("uses allApplicableEffects when present", () => {
      const actor = {
        allApplicableEffects: function* () {
          yield makeEffect({ name: "FromItems" });
        }
      };
      expect(listDisplayConditions(actor).map((r) => r.name)).toEqual(["FromItems"]);
    });

    it("reads duration and applied-by from core effects", () => {
      global.fromUuidSync = jest.fn(() => ({ name: "Sword" }));
      const actor = {
        effects: {
          contents: [
            makeEffect({
              duration: { label: "1 Round" },
              origin: "Item.x",
              description: "<p>Hi</p>"
            })
          ]
        }
      };
      const row = listDisplayConditions(actor)[0];
      expect(row.duration).toBe("1 Round");
      expect(row.appliedBy).toBe("Sword");
      expect(row.description).toBe("<p>Hi</p>");
    });

    it("omits indefinite duration labels", () => {
      const actor = {
        effects: { contents: [makeEffect({ duration: { label: "None", remaining: Infinity } })] }
      };
      expect(listDisplayConditions(actor)[0].duration).toBeNull();
    });
  });

  describe("listDisplayConditions — PF2e conditions", () => {
    beforeEach(() => {
      global.game.system = { id: "pf2e" };
    });

    it("reads active conditions from actor.conditions.active", () => {
      const actor = {
        conditions: {
          active: [
            {
              id: "c1",
              name: "Blinded",
              img: "systems/pf2e/icons/conditions/blinded.webp",
              active: true,
              slug: "blinded"
            }
          ]
        },
        itemTypes: { effect: [] }
      };
      const rows = listDisplayConditions(actor);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id: "c1",
        name: "Blinded",
        kind: "pf2e-condition"
      });
    });

    it("skips inactive conditions when activeOnly", () => {
      const actor = {
        conditions: {
          active: [],
          [Symbol.iterator]: function* () {
            yield { id: "c1", name: "Blinded", active: false, img: "" };
          }
        },
        itemTypes: { effect: [] }
      };
      // Prefer active list when present (empty); also test iterator path without active array
      const actor2 = {
        conditions: {
          [Symbol.iterator]: function* () {
            yield { id: "c1", name: "Blinded", active: false, img: "" };
            yield { id: "c2", name: "Prone", active: true, img: "" };
          }
        },
        itemTypes: { effect: [] }
      };
      delete actor2.conditions.active;
      expect(listDisplayConditions(actor2, { activeOnly: true }).map((r) => r.name)).toEqual(["Prone"]);
    });

    it("includes PF2e effect items that show a token icon", () => {
      const actor = {
        conditions: { active: [] },
        itemTypes: {
          effect: [
            {
              id: "e1",
              name: "Shield",
              img: "icons/shield.webp",
              system: { tokenIcon: { show: true }, description: { value: "Raise a shield." } }
            }
          ]
        }
      };
      const rows = listDisplayConditions(actor);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ id: "e1", name: "Shield", kind: "pf2e-effect" });
      expect(rows[0].description).toBe("Raise a shield.");
    });

    it("hides unidentified effect items from non-GMs", () => {
      global.game.user = { isGM: false };
      const actor = {
        conditions: { active: [] },
        itemTypes: {
          effect: [{ id: "e1", name: "Secret", isIdentified: false, system: { tokenIcon: { show: true } } }]
        }
      };
      expect(listDisplayConditions(actor)).toEqual([]);
    });

    it("uses itemTypes.condition when conditions collection is missing", () => {
      const actor = {
        itemTypes: {
          condition: [{ id: "c1", name: "Frightened 1", active: true, img: "", value: 1 }],
          effect: []
        }
      };
      expect(listDisplayConditions(actor).map((r) => r.name)).toEqual(["Frightened 1"]);
    });

    it("formats remainingDuration into a short badge", () => {
      const actor = {
        conditions: {
          active: [
            {
              id: "c1",
              name: "Sickened",
              active: true,
              img: "",
              remainingDuration: { expired: false, remaining: 120 }
            }
          ]
        },
        itemTypes: { effect: [] }
      };
      expect(listDisplayConditions(actor)[0].duration).toBe("2m");
    });

    it("reads appliedBy / breakdown for PF2e conditions", () => {
      const actor = {
        conditions: {
          active: [
            {
              id: "c1",
              name: "Grabbed",
              active: true,
              img: "",
              appliedBy: { name: "Wolf" }
            }
          ]
        },
        itemTypes: { effect: [] }
      };
      expect(listDisplayConditions(actor)[0].appliedBy).toBe("Wolf");
    });
  });

  describe("listAvailableStatuses", () => {
    it("marks statuses active from actor.statuses on non-PF2e", () => {
      global.CONFIG = { statusEffects: [{ id: "prone", name: "Prone" }] };
      const actor = { statuses: new Set(["prone"]) };
      expect(listAvailableStatuses(actor)).toEqual([{ id: "prone", name: "Prone", active: true }]);
    });

    it("uses hasCondition on PF2e", () => {
      global.game.system = { id: "pf2e" };
      global.CONFIG = { statusEffects: [{ id: "blinded", name: "Blinded" }] };
      const actor = { hasCondition: jest.fn((id) => id === "blinded") };
      expect(listAvailableStatuses(actor)[0].active).toBe(true);
      expect(actor.hasCondition).toHaveBeenCalledWith("blinded");
    });

    it("falls back to conditions.hasType on PF2e when hasCondition is missing", () => {
      global.game.system = { id: "pf2e" };
      global.CONFIG = { statusEffects: [{ id: "prone", name: "Prone" }] };
      const actor = { conditions: { hasType: jest.fn(() => true) } };
      expect(listAvailableStatuses(actor)[0].active).toBe(true);
    });

    it("treats a null actor as no active statuses", () => {
      global.CONFIG = { statusEffects: [{ id: "prone", name: "Prone" }] };
      expect(listAvailableStatuses(null)[0].active).toBe(false);
    });
  });

  describe("edge coverage", () => {
    it("uses appliedEffects when allApplicableEffects is absent", () => {
      const actor = { appliedEffects: [makeEffect({ name: "Applied" })] };
      expect(listDisplayConditions(actor).map((r) => r.name)).toEqual(["Applied"]);
    });

    it("iterates a Collection-like conditions object via Symbol.iterator", () => {
      global.game.system = { id: "pf2e" };
      const list = [{ id: "c1", name: "Prone", active: true, img: "" }];
      const actor = {
        conditions: {
          [Symbol.iterator]: function* () {
            yield* list;
          }
        },
        itemTypes: { effect: [] }
      };
      expect(listDisplayConditions(actor).map((r) => r.name)).toEqual(["Prone"]);
    });

    it("formats multi-day and multi-hour remaining durations", () => {
      global.game.system = { id: "pf2e" };
      const actor = {
        conditions: {
          active: [
            { id: "d", name: "Long", active: true, img: "", remainingDuration: { expired: false, remaining: 90000 } },
            { id: "h", name: "Hours", active: true, img: "", remainingDuration: { expired: false, remaining: 7200 } },
            { id: "s", name: "Secs", active: true, img: "", remainingDuration: { expired: false, remaining: 15 } }
          ]
        },
        itemTypes: { effect: [] }
      };
      const rows = listDisplayConditions(actor);
      expect(rows.map((r) => r.duration)).toEqual(["2d", "2h", "15s"]);
    });

    it("formats system.duration unit/value when remainingDuration is absent", () => {
      global.game.system = { id: "pf2e" };
      const actor = {
        conditions: {
          active: [
            {
              id: "c1",
              name: "Timed",
              active: true,
              img: "",
              system: { duration: { unit: "rounds", value: 3 } }
            }
          ]
        },
        itemTypes: { effect: [] }
      };
      expect(listDisplayConditions(actor)[0].duration).toBe("3 rounds");
    });

    it("prefers breakdown over appliedBy for PF2e applied-by text", () => {
      global.game.system = { id: "pf2e" };
      const actor = {
        conditions: {
          active: [{ id: "c1", name: "Grabbed", active: true, img: "", breakdown: "From: Wolf", appliedBy: { name: "X" } }]
        },
        itemTypes: { effect: [] }
      };
      expect(listDisplayConditions(actor)[0].appliedBy).toBe("From: Wolf");
    });

    it("swallows duration/description errors on PF2e items", () => {
      global.game.system = { id: "pf2e" };
      const actor = {
        conditions: {
          active: [
            {
              id: "c1",
              name: "Bad",
              active: true,
              img: "",
              get remainingDuration() {
                throw new Error("nope");
              },
              get system() {
                throw new Error("nope");
              },
              get breakdown() {
                throw new Error("nope");
              },
              get appliedBy() {
                throw new Error("nope");
              }
            }
          ]
        },
        itemTypes: { effect: [] }
      };
      const row = listDisplayConditions(actor)[0];
      expect(row.duration).toBeNull();
      expect(row.description).toBe("");
      expect(row.appliedBy).toBeNull();
    });

    it("swallows core duration and origin resolution errors", () => {
      global.fromUuidSync = jest.fn(() => {
        throw new Error("bad");
      });
      const boom = makeEffect({ origin: "Item.x" });
      Object.defineProperty(boom, "duration", {
        get() {
          throw new Error("boom");
        }
      });
      const actor = { effects: { contents: [boom] } };
      const row = listDisplayConditions(actor)[0];
      expect(row.duration).toBeNull();
      expect(row.appliedBy).toBeNull();
    });

    it("skips token-icon effects with show:false and non-string descriptions", () => {
      global.game.system = { id: "pf2e" };
      const actor = {
        conditions: { active: [] },
        itemTypes: {
          effect: [
            { id: "e1", name: "HiddenIcon", system: { tokenIcon: { show: false } } },
            {
              id: "e2",
              name: "OddDesc",
              system: { tokenIcon: { show: true }, description: { value: 123 } }
            }
          ]
        }
      };
      const rows = listDisplayConditions(actor);
      expect(rows.map((r) => r.id)).toEqual(["e2"]);
      expect(rows[0].description).toBe("");
    });

    it("dedupes condition ids already seen", () => {
      global.game.system = { id: "pf2e" };
      const actor = {
        conditions: {
          active: [
            { id: "c1", name: "A", active: true, img: "" },
            { id: "c1", name: "A-dup", active: true, img: "" }
          ]
        },
        itemTypes: { effect: [] }
      };
      expect(listDisplayConditions(actor)).toHaveLength(1);
    });

    it("returns empty when PF2e actor has no usable condition sources", () => {
      global.game.system = { id: "pf2e" };
      const actor = { conditions: { active: 0 }, itemTypes: {} };
      expect(listDisplayConditions(actor)).toEqual([]);
    });

    it("skips core origin when fromUuidSync returns null", () => {
      global.fromUuidSync = jest.fn(() => null);
      const actor = {
        effects: { contents: [makeEffect({ origin: "Item.missing" })] }
      };
      expect(listDisplayConditions(actor)[0].appliedBy).toBeNull();
    });

    it("uses seconds Infinity and n/a duration labels as null", () => {
      const actor = {
        effects: {
          contents: [
            makeEffect({ id: "a", duration: { label: "x", seconds: Infinity } }),
            makeEffect({ id: "b", duration: { label: "n/a" } })
          ]
        }
      };
      expect(listDisplayConditions(actor).every((r) => r.duration === null)).toBe(true);
    });

    it("iterates actor.effects when contents is missing", () => {
      const effect = makeEffect({ name: "Iter" });
      const actor = {
        effects: {
          [Symbol.iterator]: function* () {
            yield effect;
          }
        }
      };
      expect(listDisplayConditions(actor).map((r) => r.name)).toEqual(["Iter"]);
    });

    it("falls back through PF2e name/slug/id and skips effects without ids", () => {
      global.game.system = { id: "pf2e" };
      const actor = {
        conditions: {
          active: [
            { id: "c1", slug: "prone", active: true, img: undefined },
            { id: "c2", active: true, img: "" }
          ]
        },
        itemTypes: {
          effect: [
            { system: { tokenIcon: { show: true } } },
            { id: "e1", system: { tokenIcon: { show: true } } }
          ]
        }
      };
      const rows = listDisplayConditions(actor);
      expect(rows.find((r) => r.id === "c1").name).toBe("prone");
      expect(rows.find((r) => r.id === "c2").name).toBe("c2");
      expect(rows.find((r) => r.id === "e1").name).toBe("e1");
    });

    it("falls back to statuses on PF2e when hasCondition and hasType are absent", () => {
      global.game.system = { id: "pf2e" };
      global.CONFIG = { statusEffects: [{ id: "prone", name: "Prone" }] };
      const actor = { statuses: new Set(["prone"]) };
      expect(listAvailableStatuses(actor)[0].active).toBe(true);
    });

    it("returns null duration when unit is set but value is null", () => {
      global.game.system = { id: "pf2e" };
      const actor = {
        conditions: {
          active: [
            {
              id: "c1",
              name: "X",
              active: true,
              img: "",
              system: { duration: { unit: "rounds", value: null } }
            }
          ]
        },
        itemTypes: { effect: [] }
      };
      expect(listDisplayConditions(actor)[0].duration).toBeNull();
    });
  });
});



