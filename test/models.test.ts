import { describe, expect, it } from "vitest";
import { NEON_MODELS, isKnownNeonModel } from "../src/models.js";

describe("NEON_MODELS", () => {
	it("has at least the foundation models shipped at launch", () => {
		expect(NEON_MODELS.length).toBeGreaterThanOrEqual(20);
	});

	it("uses the openai-completions API for every model", () => {
		for (const model of NEON_MODELS) {
			expect(model.api).toBe("openai-completions");
			expect(model.provider).toBe("neon");
		}
	});

	it("exposes positive context windows and max tokens", () => {
		for (const model of NEON_MODELS) {
			expect(model.contextWindow).toBeGreaterThan(0);
			expect(model.maxTokens).toBeGreaterThan(0);
		}
	});

	it("uses non-negative cost values", () => {
		for (const model of NEON_MODELS) {
			expect(model.cost.input).toBeGreaterThanOrEqual(0);
			expect(model.cost.output).toBeGreaterThanOrEqual(0);
			expect(model.cost.cacheRead).toBeGreaterThanOrEqual(0);
			expect(model.cost.cacheWrite).toBeGreaterThanOrEqual(0);
		}
	});

	it("contains the well-known launch models", () => {
		const ids = new Set(NEON_MODELS.map((m) => m.id));
		for (const id of ["gpt-5", "gpt-5-mini", "gemini-3-6-flash", "gpt-oss-120b", "llama-4-maverick", "kimi-k3"]) {
			expect(ids.has(id), `expected ${id} to be present`).toBe(true);
		}
	});

	it("has unique model ids", () => {
		const ids = NEON_MODELS.map((m) => m.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe("isKnownNeonModel", () => {
	it("returns true for known ids", () => {
		expect(isKnownNeonModel("gpt-5")).toBe(true);
		expect(isKnownNeonModel("databricks-gpt-5")).toBe(true);
	});

	it("returns false for unknown ids", () => {
		expect(isKnownNeonModel("claude-3-5-sonnet")).toBe(false);
		expect(isKnownNeonModel("")).toBe(false);
	});
});
