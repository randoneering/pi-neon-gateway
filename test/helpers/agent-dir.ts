/**
 * Test helper for redirecting the agent config dir.
 *
 * `getAgentDir()` (from @earendil-works/pi-coding-agent) reads
 * `process.env.PI_CODING_AGENT_DIR` before falling back to `~/.pi/agent`.
 * We override the env var so auth.json writes go to a temp directory
 * during tests.
 */

const ENV_KEY = "PI_CODING_AGENT_DIR";

export function setAgentDir(path: string): void {
	process.env[ENV_KEY] = path;
}

export function unsetAgentDir(): void {
	delete process.env[ENV_KEY];
}
