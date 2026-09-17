/**
 * Pi extension entry point: register Neon AI Gateway as a model provider.
 *
 * Authentication is configured two ways:
 *
 * 1. Environment variables: `NEON_AI_GATEWAY_TOKEN` and `NEON_AI_GATEWAY_BASE_URL`
 *    are interpolated by pi when resolving the provider config. This works
 *    out of the box for shell-driven setups and CI.
 *
 * 2. Stored credential via the `/neon-login` command (see `./auth.ts`). It
 *    writes an api_key credential with a `NEON_AI_GATEWAY_BASE_URL` env
 *    override into `auth.json`, matching the format that pi's resolver
 *    understands for provider-scoped env values.
 *
 * Use `/model` to pick a model, then run pi normally.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerNeonAuthCommands } from "./auth.js";
import { NEON_AI_GATEWAY_BASE_URL_ENV, NEON_AI_GATEWAY_TOKEN_ENV } from "./config.js";
import { NEON_MODELS } from "./models.js";
import { streamNeon } from "./stream.js";

export default function (pi: ExtensionAPI): void {
	pi.registerProvider("neon", {
		name: "Neon AI Gateway",
		baseUrl: `\${${NEON_AI_GATEWAY_BASE_URL_ENV}}/v1`,
		apiKey: `$${NEON_AI_GATEWAY_TOKEN_ENV}`,
		authHeader: true,
		api: "openai-completions",
		models: NEON_MODELS,
		streamSimple: streamNeon,
	});

	registerNeonAuthCommands(pi);
}
