import { describe, expect, it } from "vitest";
import {
  formatFixedPrice,
  formatTokenPrice,
  resolveTokenPriceFractionDigits,
} from "./format-number";

describe("resolveTokenPriceFractionDigits", () => {
  it("uses 4 decimals for normal prices", () => {
    expect(resolveTokenPriceFractionDigits(0.432032213)).toBe(4);
    expect(resolveTokenPriceFractionDigits(1.23456789)).toBe(4);
    expect(resolveTokenPriceFractionDigits(0.0001)).toBe(4);
  });

  it("uses more decimals for micro prices", () => {
    expect(resolveTokenPriceFractionDigits(0.0000001)).toBe(7);
    expect(resolveTokenPriceFractionDigits(0.00005)).toBe(5);
  });
});

describe("formatTokenPrice", () => {
  it("rounds to 4 fraction digits (vi-VN comma)", () => {
    expect(formatTokenPrice(8, 0.432032213)).toBe("0,4320");
    expect(formatTokenPrice(8, 1.23456789)).toBe("1,2346");
  });

  it("keeps micro prices visible", () => {
    expect(formatTokenPrice(8, 0.0000001)).toBe("0,0000001");
  });
});

describe("formatFixedPrice", () => {
  it("matches token price rules", () => {
    expect(formatFixedPrice(4, 0.432032213)).toBe("0,4320");
    expect(formatFixedPrice(4, 0.0000001)).toBe("0,0000001");
  });
});
