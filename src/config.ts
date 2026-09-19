/**
 * Neon AI Gateway configuration constants and helpers.
 *
 * `NEON_AI_GATEWAY_TOKEN` holds the gateway token and
 * `NEON_AI_GATEWAY_BASE_URL` holds the branch endpoint.
 */

export const NEON_AI_GATEWAY_TOKEN_ENV = "NEON_AI_GATEWAY_TOKEN";
export const NEON_AI_GATEWAY_BASE_URL_ENV = "NEON_AI_GATEWAY_BASE_URL";

/**
 * Normalize a user-supplied Neon branch base URL.
 *
 * - Trims whitespace
 * - Rejects non-http(s) schemes, embedded credentials, and query/fragment parts
 * - Strips trailing slashes and any trailing `/v1` segment so callers can
 *   append `/v1` themselves without producing `//v1`
 *
 * Throws on invalid input so bad config fails at login, not on the first request.
 */
export function normalizeNeonBaseUrl(value: string): string {
	const url = new URL(value.trim());
	if (url.protocol !== "https:" && url.protocol !== "http:") {
		throw new Error("Neon AI Gateway base URL must use http or https");
	}
	if (url.username || url.password) {
		throw new Error("Neon AI Gateway base URL must not contain credentials");
	}
	if (url.search || url.hash) {
		throw new Error("Neon AI Gateway base URL must not contain a query or fragment");
	}
	url.pathname = url.pathname.replace(/\/+$/u, "").replace(/\/v1$/u, "") || "/";
	return url.toString().replace(/\/+$/u, "");
}

export interface ResolveOptions {
	processEnv?: Record<string, string | undefined>;
	credentialEnv?: Record<string, string | undefined> | null;
}

/**
 * Resolve the effective Neon base URL, ready for a `/v1` suffix.
 *
 * Checks credentialEnv (stored credential) first, then processEnv (shell).
 * Returns undefined when neither is set.
 */
export function resolveNeonBaseUrl(options: ResolveOptions = {}): string | undefined {
	const fromCredential = options.credentialEnv?.[NEON_AI_GATEWAY_BASE_URL_ENV];
	const fromProcess = options.processEnv?.[NEON_AI_GATEWAY_BASE_URL_ENV];
	const raw = fromCredential || fromProcess;
	if (!raw) return undefined;
	const normalized = normalizeNeonBaseUrl(raw);
	return `${normalized}/v1`;
}
