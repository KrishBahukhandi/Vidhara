import { describe, expect, it } from "vitest";

import { normalizeChapterTitle } from "./gazette-common";

describe("normalizeChapterTitle", () => {
  it("re-joins drop-cap first letters", () => {
    expect(normalizeChapterTitle("A RREST OF PERSONS")).toBe("ARREST OF PERSONS");
    expect(normalizeChapterTitle("C OMPLAINTS TO M AGISTRATES")).toBe(
      "COMPLAINTS TO MAGISTRATES",
    );
  });

  it("keeps a genuine article intact before another drop cap", () => {
    expect(normalizeChapterTitle("T RIAL BEFORE A C OURT OF S ESSION")).toBe(
      "TRIAL BEFORE A COURT OF SESSION",
    );
  });

  it("repairs a drop-capped leading OF without eating the next word", () => {
    expect(normalizeChapterTitle("O F CONTEMPTS OF THE LAWFUL AUTHORITY OF PUBLIC SERVANTS")).toBe(
      "OF CONTEMPTS OF THE LAWFUL AUTHORITY OF PUBLIC SERVANTS",
    );
    expect(normalizeChapterTitle("O F OFFENCES RELATING TO THE A RMY , N AVY AND A IR F ORCE")).toBe(
      "OF OFFENCES RELATING TO THE ARMY, NAVY AND AIR FORCE",
    );
  });

  it("tidies PDF spacing around punctuation and hyphens", () => {
    expect(normalizeChapterTitle("O RDER FOR MAINTENANCE OF WIVES , CHILDREN AND PARENTS")).toBe(
      "ORDER FOR MAINTENANCE OF WIVES, CHILDREN AND PARENTS",
    );
    expect(normalizeChapterTitle("T RIAL OF WARRANT - CASES BY M AGISTRATES")).toBe(
      "TRIAL OF WARRANT-CASES BY MAGISTRATES",
    );
  });

  it("leaves already-clean titles untouched", () => {
    expect(normalizeChapterTitle("PRELIMINARY")).toBe("PRELIMINARY");
    expect(normalizeChapterTitle("OF PUNISHMENTS")).toBe("OF PUNISHMENTS");
  });
});
