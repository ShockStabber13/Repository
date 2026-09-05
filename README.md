<p align="center">
  <a href="https://hackerai.co/">
    <img src="public/icon-512x512.png" width="150" alt="HackerAI Logo">
  </a>
</p>

<h1 align="center">HackerAI</h1>

<h2 align="center">Your AI-Powered Penetration Testing Assistant</h2>

<div align="center">

[![License](https://img.shields.io/badge/License-Apache%202.0%20with%20Commercial%20Restrictions-red.svg)](LICENSE)
[![Website](https://img.shields.io/badge/Website-hackerai.co-2d3748.svg)](https://hackerai.co)

</div>

## Getting started

### Prerequisites

You'll need the following accounts:

**Required:**

- [Featherless](https://featherless.ai/) - AI model provider in this local fork
- [OpenAI](https://platform.openai.com/) - Content moderation
- [Convex](https://www.convex.dev/) - Database and backend
- [WorkOS](https://workos.com/) - Authentication and user management
- [Trigger.dev](https://trigger.dev/) - Required durable runtime for agent tasks

**Optional:**

- [E2B](https://e2b.dev/) - Isolated cloud execution; local sandbox does not require it
- [Amazon S3](https://aws.amazon.com/s3/) - File storage (alternative to Convex storage)
- [Perplexity](https://perplexity.ai/) - Web search functionality
- [Jina AI](https://jina.ai/reader) - Web URL content retrieval
- [Redis](https://redis.io/) - Stream resumption
- [Upstash Redis](https://upstash.com/) - Rate limiting
- [PostHog](https://posthog.com/) - Analytics
- [Stripe](https://stripe.com/) - Payment processing

### Clone the repo

```bash
git clone https://github.com/hackerai-tech/hackerai.git
```

### Navigate to the project directory

```bash
cd hackerai
```

### Install dependencies

```bash
pnpm install
```

### Run the setup script

```bash
pnpm run setup
```

This local fork no longer asks for OpenRouter or XAI credentials. After the app starts, configure the Featherless API key and model at `/featherless-settings`. E2B may be left blank for local-only sandbox use.

### Start the development server

For the upstream cloud-backed setup:

```bash
pnpm run dev
```

For this fork's local Convex + Windows workflow, use the repository-root launcher:

```powershell
.\Start-HackerAI.ps1
```

It builds the local sandbox CLI before starting Next.js and local Convex.

Or run them separately in two terminals:

```bash
pnpm run dev:next
pnpm run dev:convex
```

### Run the Trigger.dev worker

Agent mode runs the agent loop on a [Trigger.dev](https://trigger.dev/) task.
To use the agent locally:

1. Create a project at https://cloud.trigger.dev and copy your **dev** secret
   key (`tr_dev_…`) into `.env.local` as `TRIGGER_SECRET_KEY`.
2. In the Trigger.dev dashboard → your project → **Environment Variables**,
   add the env vars the task needs to run (these live on the worker, not on
   Vercel): `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_SERVICE_ROLE_KEY`,
   `HACKERAI_AI_PROVIDER=featherless`, `FEATHERLESS_API_KEY`,
   `FEATHERLESS_MODEL_ID`, `OPENAI_API_KEY`, and any optional keys you use
   (`E2B_API_KEY`, `PERPLEXITY_API_KEY`, `JINA_API_KEY`, S3, etc.).
3. For the local Windows worker in this fork, start a third PowerShell window:

   ```powershell
   .\Start-HackerAI-Trigger.ps1
   ```

   The launcher reuses the key/model stored by `/featherless-settings`.

   This starts the default Trigger.dev worker used by local Agent requests.
   To start an explicitly routed Trigger.dev branch instead, set a stable
   branch name with
   `TRIGGER_DEV_BRANCH=my-local-agent pnpm dev:trigger`. Only use that override
   when the request path is configured to target the same Trigger.dev branch.
