/**
 * Neon AI Gateway auth commands: /neon-login, /neon-logout, /neon-status.
 *
 * pi's built-in login only handles OAuth providers. Neon auth is a static
 * token plus a branch base URL, so these commands write an api_key
 * credential plus env overrides straight to auth.json, in the shape pi's
 * resolver reads.
 *
 * Env vars work too. Set NEON_AI_GATEWAY_TOKEN and NEON_AI_GATEWAY_BASE_URL
 * before starting pi and skip these commands.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, chmod } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import {
	NEON_AI_GATEWAY_BASE_URL_ENV,
	NEON_AI_GATEWAY_TOKEN_ENV,
	normalizeNeonBaseUrl,
} from "./config.js";

const PROVIDER_ID = "neon";

interface AuthFileShape {
	[key: string]: unknown;
}

function getAuthPath(): string {
	return join(getAgentDir(), "auth.json");
}

function readAuthFile(): AuthFileShape {
	const path = getAuthPath();
	if (!existsSync(path)) return {};
	let raw: string;
	try {
		raw = readFileSync(path, "utf-8");
	} catch (error) {
		throw new Error(`Failed to read ${path}: ${(error as Error).message}`);
	}
	if (!raw.trim()) return {};
	try {
		const parsed = JSON.parse(raw);
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
			throw new Error("auth.json root must be an object");
		}
		return parsed as AuthFileShape;
	} catch (error) {
		throw new Error(`Failed to parse ${path}: ${(error as Error).message}`);
	}
}

async function writeAuthFile(data: AuthFileShape): Promise<void> {
	const path = getAuthPath();
	await mkdir(dirname(path), { recursive: true });
	const json = `${JSON.stringify(data, null, 2)}\n`;
	writeFileSync(path, json, { encoding: "utf-8", mode: 0o600 });
	await chmod(path, 0o600).catch(() => undefined);
}

export function registerNeonAuthCommands(pi: ExtensionAPI): void {
	pi.registerCommand("neon-login", {
		description: "Configure Neon AI Gateway token and branch base URL",
		handler: async (_args, ctx) => {
			const token = await ctx.ui.input("Enter Neon AI Gateway token");
			if (!token) {
				ctx.ui.notify("Neon login cancelled: no token provided", "warning");
				return;
			}
			const baseUrlInput = await ctx.ui.input(
				"Enter Neon AI Gateway base URL",
				"https://br-example-api.ai.c-2.us-east-2.aws.neon.tech",
			);
			if (!baseUrlInput) {
				ctx.ui.notify("Neon login cancelled: no base URL provided", "warning");
				return;
			}
			let baseUrl: string;
			try {
				baseUrl = normalizeNeonBaseUrl(baseUrlInput);
			} catch (error) {
				ctx.ui.notify(`Invalid base URL: ${(error as Error).message}`, "error");
				return;
			}

			const file = readAuthFile();
			const existing = file[PROVIDER_ID];
			const credential: Record<string, unknown> = {
				type: "api_key",
				key: token,
				env: { [NEON_AI_GATEWAY_BASE_URL_ENV]: baseUrl },
			};
			if (typeof existing === "object" && existing !== null) {
				const priorEnv = (existing as Record<string, unknown>).env;
				if (priorEnv && typeof priorEnv === "object") {
					credential.env = { ...(priorEnv as Record<string, string>), [NEON_AI_GATEWAY_BASE_URL_ENV]: baseUrl };
				}
			}
			file[PROVIDER_ID] = credential;
			await writeAuthFile(file);

			ctx.ui.notify(
				`Neon AI Gateway configured. Base URL: ${baseUrl}. Use /reload to pick up the credential.`,
				"info",
			);
		},
	});

	pi.registerCommand("neon-logout", {
		description: "Remove the stored Neon AI Gateway credential",
		handler: async (_args, ctx) => {
			const file = readAuthFile();
			if (!(PROVIDER_ID in file)) {
				ctx.ui.notify("No Neon AI Gateway credential stored.", "info");
				return;
			}
			delete file[PROVIDER_ID];
			await writeAuthFile(file);
			ctx.ui.notify("Neon AI Gateway credential removed. Use /reload to pick up the change.", "info");
		},
	});

	pi.registerCommand("neon-status", {
		description: "Show the resolved Neon AI Gateway base URL and credential status",
		handler: async (_args, ctx) => {
			const file = readAuthFile();
			const stored = file[PROVIDER_ID];
			const storedBaseUrl =
				stored && typeof stored === "object"
					? (stored as Record<string, unknown>).env &&
						typeof (stored as Record<string, unknown>).env === "object"
						? ((stored as Record<string, unknown>).env as Record<string, string>)[NEON_AI_GATEWAY_BASE_URL_ENV]
						: undefined
					: undefined;
			const fromEnv = process.env[NEON_AI_GATEWAY_BASE_URL_ENV];
			const hasToken =
				!!process.env[NEON_AI_GATEWAY_TOKEN_ENV] ||
				!!(stored && typeof stored === "object" && (stored as Record<string, unknown>).key);
			const resolvedBaseUrl = storedBaseUrl ?? fromEnv;
			ctx.ui.notify(
				[
					`Neon AI Gateway status:`,
					`  Token: ${hasToken ? "configured" : "missing"}`,
					`  Base URL: ${resolvedBaseUrl ?? "(not set)"}`,
					`  Source: ${storedBaseUrl ? "auth.json" : fromEnv ? "environment" : "(none)"}`,
				].join("\n"),
				hasToken && resolvedBaseUrl ? "info" : "warning",
			);
		},
	});
}
