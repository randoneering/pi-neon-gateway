# pi-extension-neon-ai-gateway

Pi extension that registers [Neon AI Gateway](https://neon.com/docs/ai-gateway/overview) as a model provider.

## About Neon AI Gateway

Neon AI Gateway is the LLM inference layer built into the Neon backend — a Postgres-native gateway that exposes open-weight and foundation models from OpenAI, Google, Meta, xAI, Moonshot, Alibaba, ZhipuAI, and others behind one credential. Per the [official overview](https://neon.com/docs/ai-gateway/overview):

> One API for open-weight and foundation models from OpenAI, Google, and more. Built into your Neon project.

Key properties:

- **One credential across all providers.** Call models like GPT-5.5, Grok 4.6, Kimi K3, and Gemini 3.6 Flash with no separate account for each.
- **Scoped to your branch.** Each Neon branch has its own gateway endpoint, so AI requests inherit the same scope as your data.
- **Keep your SDK.** Standard OpenAI Chat Completions shape — `Authorization: Bearer`, `POST /v1/chat/completions`, SSE streaming. No new client to learn.
- **No markup.** Per [pricing docs](https://neon.com/docs/ai-gateway/overview#pricing): Neon charges the same per-token rate as the model provider.
- **Prepaid credits.** 1 credit = $1 USD, $5 minimum, 12-month validity.

### Access requirements

Per [the docs](https://neon.com/docs/ai-gateway/overview#model-access):

- **Plan:** Neon Launch or Scale (free tier cannot use AI Gateway).
- **Region:** Project must live in one of: `aws-us-east-2`, `aws-us-east-1`, `aws-eu-central-1`, `aws-ap-southeast-1`.
- **Credits:** Buy prepaid credits at **Billing** in the Neon Console (minimum $5).
- **Foundation models:** GPT-5.x, Gemini 3.x, Grok, Claude, Inkling are rolled out gradually — use the **Apply for access** button on the AI Gateway page to request them. Open-weight models (Llama, Qwen, GLM, GPT-OSS, Gemma, Kimi) work as soon as credits are loaded.

### Endpoint shape

The gateway follows the OpenAI Chat Completions API. A minimal request looks like:

```bash
curl "$NEON_AI_GATEWAY_BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $NEON_AI_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-5-mini", "messages": [{"role": "user", "content": "hi"}]}'
```

Error responses are JSON with an `error.message` field. Common status codes (full table in [docs](https://neon.com/docs/ai-gateway/chat-completions#error-handling)):

| Status | Meaning |
|---|---|
| `401` | Missing or invalid `NEON_AI_GATEWAY_TOKEN` |
| `403` | Credential lacks `ai_gateway:invoke` scope or branch is not in the credential lineage |
| `413` | Request body exceeds 32 MiB |
| `429` | Account quota (`REQUEST_LIMIT_EXCEEDED`) or upstream provider rate limit — honor `Retry-After` and `X-Ratelimit-*` headers |
| `502` | Upstream workspace error — retry |

## Install

### As a git package

```bash
pi install git:github.com/mezotv/pi-neon-gateway
```

### As a local extension

Drop the package into your extensions directory:

```bash
# Global (applies to every pi session)
git clone https://github.com/mezotv/pi-neon-gateway ~/.pi/agent/extensions/neon-ai-gateway

# Project-local (only this repo)
git clone https://github.com/mezotv/pi-neon-gateway .pi/extensions/neon-ai-gateway
```

Or use the `-e` flag for a one-off test:

```bash
pi -e /path/to/pi-neon-gateway/src/index.ts
```

## Configure

Pick one:

### Option A: environment variables

```bash
export NEON_AI_GATEWAY_TOKEN="<your branch credential>"
export NEON_AI_GATEWAY_BASE_URL="https://br-your-branch.ai.c-2.us-east-2.aws.neon.tech"
pi
```

The base URL is the gateway endpoint for your branch — grab it from the Neon Console AI Gateway page.

> **The AI Gateway credential is not your Neon API key.** It's a separate, branch-scoped bearer token (`nt_live_...`) with the `ai_gateway:invoke` scope. You can't reuse a `napi_*` management key, and you can't add the scope to an existing credential — mint a new one.
>
> Three places to mint one:
>
> - **CLI**: `neon credentials create --scope ai_gateway:invoke`. Or just `neon env pull --file .env` and the credentials land in your env automatically.
> - **Console**: Branch → **Credentials** under **Branch** → **Create credential** → check `ai_gateway:invoke`.
> - **API**: `POST /api/v2/projects/{project_id}/branches/{branch_id}/credentials` with `{"scopes": ["ai_gateway:invoke"]}` (auth with your `napi_...` Neon API key).
>
> The token is shown only once.

### Option B: stored credential

Run `/neon-login` inside pi:

```
/neon-login
```

It prompts for the token and base URL, then writes an `api_key` credential with the base URL as a provider-scoped env value into `~/.pi/agent/auth.json`. Run `/reload` to pick up the change.

Inspect or remove the credential with:

```
/neon-status     # show the resolved base URL and whether a token is stored
/neon-logout     # remove the credential
```

## Use

```
/model
```

Pick any `neon/<model-id>`. The full catalog is also listed by `pi --list-models`.

## Models

34 models across:

- **OpenAI**: `gpt-5`, `gpt-5-mini`, `gpt-5-nano`, `gpt-5-1`, `gpt-5-2`, `gpt-5-3-codex`, `gpt-5-4`, `gpt-5-4-mini`, `gpt-5-4-nano`, `gpt-5-5`, `gpt-5-5-pro`, `gpt-5-6-luna`, `gpt-5-6-sol`, `gpt-5-6-terra`, `gpt-6-astra`, `gpt-oss-120b`, `gpt-oss-20b`
- **Google**: `gemini-3-1-flash-lite`, `gemini-3-1-pro`, `gemini-3-5-flash`, `gemini-3-5-flash-lite`, `gemini-3-6-flash`, `gemini-3-flash`, `gemma-3-12b`
- **Meta**: `llama-4-maverick`, `meta-llama-3-1-8b-instruct`, `meta-llama-3-3-70b-instruct`
- **xAI**: `grok-4-6`
- **Moonshot**: `kimi-k3`
- **Alibaba**: `qwen3-next-80b-a3b-instruct`, `qwen35-122b-a10b`
- **ZhipuAI**: `glm-5-2`, `glm-5-3-flash`
- **Thinking Machines**: `inkling`

The catalog is sourced from [neon.com/models.json](https://neon.com/models.json). Update `src/models.ts` when upstream adds new models.

## What the extension does on top of `openai-completions`

Neon's gateway accepts OpenAI Chat Completions requests but rejects different parameter sets depending on the upstream model. This extension:

- Strips `$schema` markers from `tools[].function.parameters` and `response_format.json_schema.schema` (Databricks-hosted models reject them)
- Removes unsupported OpenAI fields (`store`, `prompt_cache_key`, `prompt_cache_retention`)
- Per-model cleanup of `frequency_penalty`, `presence_penalty`, `seed`, `stop`, `temperature`, `top_p`, `reasoning_effort` (Claude, Gemini, Llama, Qwen, GLM, Inkling, Kimi, GPT-OSS each have different rules)
- Translates GPT-OSS harmony content arrays (`[{ type: "text" }, { type: "reasoning" }]`) into the flat `content` + `reasoning_content` shape so the OpenAI parser surfaces reasoning as a thinking block
- Unwraps Neon's nested error envelope (`{ error: { message } }`) so error messages stay readable

## Develop

```bash
npm install
npm run check     # type check
npm test          # unit tests
npm run test:smoke # exercise a real Neon call (requires credentials)
```

The smoke test exits non-zero on any stream error or empty response:

```bash
NEON_AI_GATEWAY_TOKEN=<token> NEON_AI_GATEWAY_BASE_URL=<base> npm run test:smoke gpt-5-mini
```

## Caveats

- Neon AI Gateway is in beta and requires a **paid plan (Launch or Scale) plus prepaid credits** ($5 minimum). Free-tier projects don't see the Credentials tab in the Console and can't mint `ai_gateway:invoke` credentials.
- The project must be in a supported region: `aws-us-east-2`, `aws-us-east-1`, `aws-eu-central-1`, or `aws-ap-southeast-1`.
- Foundation models (GPT-5.x, Gemini 3.x, Grok, Claude) are rolled out gradually; you'll see an **Apply for access** button on the AI Gateway page if your account hasn't been granted them yet. Open-weight models (Llama, Qwen, GLM, GPT-OSS, Gemma) work as soon as credits are loaded.
- Models that require the native OpenAI Responses endpoint are not included; the gateway exposes `/v1/chat/completions` only.
- Reasoning levels for GPT-OSS models (`low`, `medium`, `high`) are sent as `reasoning_effort`.
- `cacheRead` and `cacheWrite` costs are tracked as zero — the upstream catalog does not yet publish cache pricing.

## License

MIT. See [LICENSE](./LICENSE).

## Documentation

- [Neon AI Gateway overview](https://neon.com/docs/ai-gateway/overview)
- [Quickstart](https://neon.com/docs/ai-gateway/get-started)
- [Authentication & branch-scoped credentials](https://neon.com/docs/ai-gateway/authentication)
- [Model catalog](https://neon.com/docs/ai-gateway/models) (canonical list, mirrored at [neon.com/models.json](https://neon.com/models.json) and [models.dev/neon](https://models.dev/providers/neon))
- [Chat completions reference](https://neon.com/docs/ai-gateway/chat-completions)
- [Prepaid credits & pricing](https://neon.com/docs/ai-gateway/overview#pricing)
- [Troubleshooting](https://neon.com/docs/ai-gateway/troubleshooting)
- [Neon CLI](https://neon.com/docs/cli/credentials) (`neon credentials create --scope ai_gateway:invoke`)
- [Neon status](https://neonstatus.com) for live incidents

If the gateway or your account rejects a model the README lists, the most common cause is the per-model access gate — see [Model access](https://neon.com/docs/ai-gateway/overview#model-access) and the `enabled` field on [GET /v1/models](https://neon.com/docs/ai-gateway/models#check-what-your-account-can-call).
