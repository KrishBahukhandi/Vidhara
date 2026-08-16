import { describe, expect, it } from "vitest";

import { formatOrderRule, parseOrderRuleRef } from "./order-rule-ref";

describe("parseOrderRuleRef", () => {
  it("recognises the forms an advocate actually types", () => {
    for (const q of [
      "Order VII Rule 11",
      "order 7 rule 11",
      "O. VII R. 11",
      "o7 r11",
      "CPC Order 7 Rule 11",
      "order 39 rule 1",
    ]) {
      expect(parseOrderRuleRef(q), q).not.toBeNull();
    }
  });

  it("normalises the order number to the printed roman form", () => {
    expect(parseOrderRuleRef("order 7 rule 11")?.order).toBe("VII");
    expect(parseOrderRuleRef("Order VIII Rule 6")?.order).toBe("VIII");
    expect(parseOrderRuleRef("order 39 rule 1")?.order).toBe("XXXIX");
  });

  it("keeps a lettered rule", () => {
    expect(parseOrderRuleRef("Order 21 Rule 58A")?.rule).toBe("58A");
  });

  it("accepts an Order with no rule", () => {
    const r = parseOrderRuleRef("Order XXXIX");
    expect(r?.order).toBe("XXXIX");
    expect(r?.rule).toBeUndefined();
  });

  it("does not fire on prose that merely uses the word order", () => {
    // The whole point of the guard: "an order made under section 5" must not
    // be read as a Schedule reference and hijack an ordinary search.
    for (const q of [
      "an order made under section 5",
      "order of the Court",
      "order passed by the Magistrate",
      "punishment for cheating",
      "420 IPC",
    ]) {
      expect(parseOrderRuleRef(q), q).toBeNull();
    }
  });

  it("formats as the Schedule prints it", () => {
    expect(formatOrderRule({ order: "VII", rule: "11", raw: "" })).toBe("Order VII, Rule 11");
    expect(formatOrderRule({ order: "XXXIX", raw: "" })).toBe("Order XXXIX");
  });
});
