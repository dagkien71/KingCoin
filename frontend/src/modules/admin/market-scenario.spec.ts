import { describe, expect, it } from "vitest";
import {
  buildScenarioRunPlan,
  clampPct,
  previewScenarioPrices,
  type ScenarioConfig,
} from "@/modules/admin/market-scenario";

describe("market-scenario", () => {
  it("previewScenarioPrices: pump tăng, dump giảm", () => {
    const pump = previewScenarioPrices(100, {
      kind: "pump",
      pct: 5,
      durationMin: 10,
      restoreOnEnd: true,
    });
    const dump = previewScenarioPrices(100, {
      kind: "dump",
      pct: 5,
      durationMin: 10,
      restoreOnEnd: true,
    });
    expect(pump.to).toBeGreaterThan(100);
    expect(dump.to).toBeLessThan(100);
    expect(pump.to).toBeCloseTo(105, 4);
    expect(dump.to).toBeCloseTo(95, 4);
  });

  it("buildScenarioRunPlan pump: params ramp lên", () => {
    const plan = buildScenarioRunPlan(
      { kind: "pump", pct: 5, durationMin: 10, restoreOnEnd: true },
      100,
      { mode: "single" },
      "tok-1"
    );
    expect(plan.mode).toBe("single");
    if (plan.mode !== "single") return;
    const body = plan.body as {
      modelId: string;
      params: { priceStart: number; priceEnd: number };
    };
    expect(body.modelId).toBe("linear_ramp");
    expect(body.params.priceEnd).toBeGreaterThan(body.params.priceStart);
    expect(body.params.priceEnd).toBeCloseTo(105, 4);
  });

  it("buildScenarioRunPlan dump: params ramp xuống", () => {
    const plan = buildScenarioRunPlan(
      { kind: "dump", pct: 10, durationMin: 15, restoreOnEnd: false },
      200,
      { mode: "single" },
      "tok-2"
    );
    expect(plan.mode).toBe("single");
    if (plan.mode !== "single") return;
    const body = plan.body as {
      params: { priceStart: number; priceEnd: number };
    };
    expect(body.params.priceEnd).toBeLessThan(body.params.priceStart);
    expect(body.params.priceEnd).toBeCloseTo(180, 4);
  });

  it("buildScenarioRunPlan bulk pump giữ modelId và params", () => {
    const plan = buildScenarioRunPlan(
      { kind: "pump", pct: 3, durationMin: 5, restoreOnEnd: true },
      50,
      { mode: "all_alts" },
      "ignored"
    );
    expect(plan.mode).toBe("bulk");
    if (plan.mode !== "bulk") return;
    const body = plan.body as {
      modelId: string;
      params: { priceEnd: number; priceStart: number };
      allAlts?: boolean;
    };
    expect(body.modelId).toBe("linear_ramp");
    expect(body.allAlts).toBe(true);
    expect(body.params.priceEnd).toBeGreaterThan(body.params.priceStart);
  });

  it("clampPct: chỉ tối thiểu dương, không trần", () => {
    expect(clampPct(0)).toBe(0.01);
    expect(clampPct(99)).toBe(99);
    expect(clampPct(7)).toBe(7);
  });
});
