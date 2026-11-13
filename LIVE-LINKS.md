# Foundly — live links

| What | URL |
| --- | --- |
| **App (production)** | https://foundly-three.vercel.app |
| Repo | https://github.com/hillarytizian-boop/foundly |
| Agent team (Build) | https://foundly-three.vercel.app/workspace/build |
| Run / social publishing | https://foundly-three.vercel.app/workspace/run |
| Integrations (19 providers) | https://foundly-three.vercel.app/workspace/integrations |
| Documents | https://foundly-three.vercel.app/workspace/docs |
| Public sites | https://foundly-three.vercel.app/s/&lt;slug&gt; |

## Health endpoints

| Endpoint | Meaning |
| --- | --- |
| `GET /api/models/status` | `{configured, model, endpoint}` — never returns the key |
| `POST /api/models/status` `{"prompt":"…"}` | live model probe (60–200 s) |
| `POST /api/milo/chat` `{"message":"…"}` | Milo's real reply |
| `GET /api/integrations/status` | per-provider `configured` / `connected` |

## Environment (Vercel → Settings → Environment Variables)

| Key | Status |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | set |
| `NVIDIA_API_KEY` | **set — sensitive**, production + preview + development |
| `NVIDIA_MODEL` | set (`z-ai/glm-5.3-flash`) |
| `X_CLIENT_ID/SECRET`, `LINKEDIN_…`, `META_…`, `SLACK_…`, `GOOGLE_…` | not set → those Connect buttons show "needs credentials" |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | not set → checkout stubbed |

## Model facts worth remembering

* Endpoint: `https://integrate.api.nvidia.com/v1` (OpenAI-compatible).
* `z-ai/glm-5.3-flash` works but is slow: **60–200 s** per call, ~3–6 k tokens of hidden reasoning.
  A small `max_tokens` returns **empty content** (`finish_reason: length`) — budget ≥ 5000.
* Most model IDs listed by `/v1/models` are not provisioned on this key (404 `Function … not found`);
  `z-ai/glm-5.3-flash` is the one confirmed available.
