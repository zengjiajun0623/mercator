# Elytro: Go-to-Market Plan for Ethereum Agent Wallet

## Executive Summary

Elytro is an ERC-4337 smart contract wallet with social recovery, passkey auth, and modular architecture — originally built for humans, now positioned at the intersection of the **AI agent economy**. The timing is right: 250,000+ daily active on-chain agents, ERC-8004 live on mainnet with 24,000+ registered agents, and VC dollars flooding into the AI x crypto intersection. But Elytro is small (~$3.1M raised, single-digit GitHub stars) competing against Coinbase, Trust Wallet (220M users), Crossmint, and MoonPay.

**The play:** Don't compete head-on with Coinbase on agent wallets for enterprises. Instead, own the **developer-first, self-sovereign agent wallet** niche — the wallet infrastructure that developers who don't want vendor lock-in will choose.

---

## 1. Situational Analysis

### What You Have

- **ERC-4337 smart contract wallet** — audited by SlowMist, modular, open-source
- **Social recovery** — no seed phrases, trusted contacts for recovery
- **Passkey/WebAuthn auth** — biometric, no private key management
- **L2 support** — Optimism, Arbitrum (Scroll, Taiko coming)
- **Chrome extension** — live on Chrome Web Store
- **$3.1M seed** — investors include Signum Capital, GAME7, Ryan Sean Adams
- **Open-source codebase** — full transparency, multiple repos

### What You're Up Against

| Competitor | Advantage | Weakness |
|---|---|---|
| **Coinbase Agentic Wallets** | 100M+ users, x402 protocol, plug-and-play | Vendor lock-in, custodial elements |
| **Trust Wallet (TWAK)** | 220M users, 25+ chains | Just launched, unproven agent UX |
| **Crossmint** | Dual-key TEE model, compliance-focused | Enterprise-only, not self-sovereign |
| **MoonPay + Ledger** | Hardware security for agent txns | Consumer-focused, not dev infra |
| **Privy / Turnkey** | Embedded wallet SDKs | Not agent-native |

### Market Tailwinds

- **250,000 daily active on-chain agents** (400% YoY growth)
- **ERC-8004 live** — 24,500+ agents registered in 2 weeks
- **Wallet infra devs growing 6%** — only growing crypto dev category
- **40 cents of every VC crypto dollar** goes to AI-adjacent companies
- **Brian Armstrong, CZ** both publicly betting on agent wallets

### Market Risks

- Security concerns slowing adoption (agents holding keys)
- Legal uncertainty around agent-held assets
- Fragmentation across platforms and payment protocols (ACP, AP2, x402, MPP)
- Elytro's small community vs. incumbents' distribution

---

## 2. Strategic Positioning

### Don't Be "Another Wallet." Be "The Open Agent Wallet."

**Positioning statement:**
> Elytro is the self-sovereign smart wallet for AI agents — open-source, non-custodial, and ERC-4337 native. No vendor lock-in. No API keys to revoke. Your agent's wallet is a smart contract you control.

### Why This Works

1. **Developers hate lock-in.** Coinbase and Trust Wallet are walled gardens. Developers building serious agent infra want sovereignty.
2. **ERC-4337 is your moat.** Smart account features (spending limits, session keys, whitelists, multi-sig) are *exactly* what agents need for guardrails — and you already have them.
3. **Open-source wins in infra.** The wallet layer will commoditize. The winning open-source project captures the long tail of developers.

---

## 3. Target Developer Segments — Deep Analysis

### The Critical Insight: Two Worlds Colliding

The agent wallet market sits at the collision of two developer populations that **don't naturally overlap**:

- **AI/ML developers** — fluent in Python, LangChain, prompt engineering. Most have a negative view of crypto. As Circle co-founder Sean Neville noted: "The AI developer community in particular has a negative view of crypto, because of things like memecoins and Ponzi schemes." OpenClaw creator Peter Steinberger publicly refuses to even discuss crypto.
- **Web3/Solidity developers** — fluent in smart contracts, DeFi, on-chain composability. Most lack experience with LLM orchestration, agent frameworks, and reinforcement learning.

**Elytro's GTM must bridge this gap.** The winner will be whoever makes crypto wallets feel like a normal API to AI developers, and whoever makes agent orchestration feel natural to Web3 developers. Here are the specific segments, ranked by priority:

---

### Segment 1: AI-First Agent Developers (PRIMARY — highest leverage)

**Who they are:**
- Python/TypeScript developers building on LangChain, LangGraph, CrewAI, AutoGPT, ElizaOS, Anthropic Agent SDK, OpenAI Agents SDK
- Typically work at AI startups, build SaaS products with agent features, or are independent builders shipping agent tools
- 57% of organizations now have AI agents in production (McKinsey 2026) — these teams need financial capabilities

**Their technical profile:**
- Strong in: Python, TypeScript, API integrations, LLM orchestration, prompt engineering
- Weak in: Solidity, gas mechanics, key management, on-chain composability
- Tools: VS Code, GitHub, pip/npm, Docker, cloud providers
- Frameworks: LangChain (dominant), CrewAI (growing), ElizaOS (Web3-native niche)

**Their core pain points:**
1. **"The money problem is unsolved."** Every framework gives you tool calling, memory, and planning — none solve payments properly. Workarounds all have tradeoffs: MPC wallets mean your agent holds funds; multisig kills autonomy; custodial APIs mean trusting a third party.
2. **Crypto is alien territory.** They don't want to learn Solidity, understand gas, or manage private keys. They want `agent.pay(recipient, amount)` and for it to just work.
3. **Security anxiety.** Giving an LLM access to real money is terrifying. They need guardrails (spending limits, whitelists, session expiry) that are enforced at the infrastructure level, not just in code.
4. **Vendor lock-in fear.** Coinbase Agentic Wallets are easy to set up but create deep dependency. If Coinbase changes pricing, revokes API keys, or adds restrictions, your agent goes offline.

**What they actually want from Elytro:**
- A 3-line SDK integration: `createWallet()`, `setLimits()`, `pay()`
- Zero crypto jargon in the docs — explain in terms of "permissions", "budgets", "sessions", not "ERC-4337", "UserOps", "bundlers"
- Python SDK (not just TypeScript) — this audience lives in Python
- LangChain/CrewAI tool that "just works" as a plugin
- Stablecoin-first (USDC/USDT) — they don't care about ETH, they want dollar-denominated payments

**Why they're the primary target:**
- Largest addressable population — millions of developers building AI apps vs. ~308 active wallet infra devs in crypto
- Lowest current penetration — most haven't integrated any wallet yet
- Highest viral coefficient — framework integrations create multiplier distribution (one LangChain PR = thousands of developers see Elytro)

**How to reach them:**
- LangChain/CrewAI plugin submissions (show up in their ecosystem docs)
- MCP server (Claude, Cursor, and other MCP-compatible tools)
- dev.to / Medium technical tutorials written in AI-developer language
- Python-first SDK on PyPI
- YouTube tutorials: "Give your LangChain agent a wallet in 5 minutes"

---

### Segment 2: Web3-Native Agent Builders (SECONDARY — fast adopters)

**Who they are:**
- Solidity/Rust developers at DeFi protocols adding autonomous features
- 68% of new DeFi protocols in Q1 2026 shipped with at least one AI agent
- Teams at protocols like Uniswap, PancakeSwap, Aave, and smaller DeFi projects
- 41% of crypto hedge funds are testing on-chain AI agents for portfolio management

**Their technical profile:**
- Strong in: Solidity, Hardhat/Foundry, on-chain composability, MEV, gas optimization
- Weak in: LLM orchestration, agent framework design, prompt engineering
- Tools: Foundry, Hardhat, Etherscan, Tenderly, The Graph
- They understand ERC-4337, session keys, and smart accounts natively

**Their core pain points:**
1. **Bots → agents is a paradigm shift.** Traditional DeFi bots follow fixed rules. AI agents evaluate multiple signals (liquidity depth, collateral health, funding rates, cross-chain conditions) and adapt dynamically. The wallet layer needs to support this flexibility.
2. **Agent security is existential.** Oracle manipulation, "fat finger" amplification (agent loops a trade 100x instead of 10x), and systemic correlated failures are real risks. They need hardware-enforced guardrails, not just code-level checks.
3. **Multi-agent coordination.** DeFi strategies increasingly involve agent teams — one agent monitors, another executes, a third manages risk. They need shared treasuries with scoped permissions per agent.
4. **Identity and reputation.** With ERC-8004 live, they want agents with verifiable track records. An agent managing a vault should have an on-chain reputation that LPs can audit.

**What they actually want from Elytro:**
- ERC-4337 smart accounts with fine-grained permission modules
- Session keys scoped to specific contracts/functions with time + value limits
- Multi-agent treasury management (shared wallet, individual permissions)
- ERC-8004 integration for agent identity + reputation
- Solidity-level composability — they want to extend modules, not just call an SDK

**Why they're secondary (not primary):**
- Smaller population (~308 active wallet infra devs, though broader DeFi dev community is larger)
- Already have workarounds (raw EOAs, custom multisigs, MPC)
- Harder to convert — they'll evaluate deeply before switching
- But: they're fast adopters once convinced, and they build high-visibility projects

**How to reach them:**
- Ethereum Magicians forum posts, EIP discussions
- Foundry/Hardhat integration guides
- ETHGlobal hackathon bounties
- Direct outreach to protocol teams adding agent features
- Security-focused content: "How ERC-4337 session keys prevent agent fat-finger disasters"

---

### Segment 3: Indie Hackers & Hackathon Builders (TERTIARY — community seeding)

**Who they are:**
- Solo developers and 2-3 person teams building agent products
- Hackathon participants (ETHGlobal, AI hackathons, framework-specific events)
- Crypto Twitter builders shipping experiments publicly
- Students and early-career devs exploring the AI x crypto intersection

**Their technical profile:**
- Generalist — some Python, some TypeScript, some Solidity basics
- Fast prototypers, not deep infrastructure builders
- Use whatever has the best "getting started" docs and Discord support

**Their core pain points:**
1. **Speed to demo.** They have 48 hours at a hackathon. They need "wallet works in 5 minutes" or they'll use Coinbase.
2. **Cost.** Gas fees on mainnet are prohibitive for experiments. They need testnet support and gas sponsorship.
3. **Templates, not docs.** They want a fork-and-deploy template repo, not a 30-page integration guide.

**What they actually want from Elytro:**
- One-click deploy template repos on GitHub
- Testnet faucet / gas sponsorship for hackathons
- 5-minute quickstart guide
- Active Discord with fast response times
- Bounty programs ($2-5K for "best agent app using Elytro")

**Why they're tertiary:**
- Low individual revenue potential
- High churn — many projects are one-off experiments
- But: they create content, build social proof, find bugs, and some become Segment 1 or 2 developers later
- They're your grassroots evangelists

**How to reach them:**
- Hackathon sponsorships + bounties
- Twitter/X build-in-public threads
- YouTube / TikTok short-form tutorials
- Discord community with responsive support
- GitHub template gallery

---

### Segment 4: Fintech / TradFi Teams Exploring Agent Commerce (FUTURE — not yet)

**Who they are:**
- Traditional fintech companies, payment processors, and banks exploring AI agent commerce
- Visa (launched Visa CLI for agent payments), Stripe (co-authored Machine Payments Protocol), PayPal
- They're watching the space but moving slowly due to compliance requirements

**Why NOT to target them now:**
- They will choose Coinbase, Stripe, or Visa for compliance and trust reasons
- Elytro has no compliance story yet (no MSB license, no KYC/AML framework)
- They'll be relevant in 12-18 months if Elytro builds developer traction first
- Keep them aware (PR, conference talks) but don't spend sales effort here

---

### Summary: Developer Persona Priority Matrix

| Segment | Size | Urgency | Fit with Elytro | Conversion Effort | Priority |
|---|---|---|---|---|---|
| AI-first agent devs | Very large | High (building now) | Strong (need open wallet) | Medium (crypto-averse) | **#1** |
| Web3-native agent builders | Medium | High (68% adding agents) | Very strong (speak same language) | Low (already understand AA) | **#2** |
| Indie hackers / hackathon | Large | Medium | Good (need speed + free) | Low | **#3** |
| Fintech / TradFi | Large | Low (exploring) | Weak (need compliance) | Very high | **Not now** |

**The key strategic choice:** Segment 1 (AI-first developers) is the primary target because they represent the largest untapped market and the highest growth potential. But you must **speak their language** — Python SDKs, stablecoin-first, zero crypto jargon, LangChain integrations. If you market Elytro using ERC-4337 and Account Abstraction terminology, you'll only reach Segment 2.

---

## 4. GTM Playbook: 90-Day Sprint

### Phase 1: Ship the Agent SDK (Weeks 1-3)

**Goal:** Make it trivial for any AI agent to use an Elytro wallet.

**Deliverables:**

1. **`elytro-agent-sdk`** — TypeScript/Python SDK with:
   - `createAgentWallet()` — deploys a smart account for an agent
   - `setSpendingLimits(token, amount, period)` — guardrails
   - `addSessionKey(agentPublicKey, permissions, expiry)` — scoped access
   - `executeTransaction(to, value, data)` — agent tx execution
   - `getBalance()`, `getTransactionHistory()` — observability

2. **Framework integrations** (pick 2-3 to ship first):
   - **LangChain/LangGraph tool** — `ElytroWalletTool` that agents can call
   - **CrewAI integration** — agent wallet as a CrewAI tool
   - **MCP server** — so any MCP-compatible agent (Claude, etc.) can use Elytro

3. **ERC-8004 integration** — register agent identity on-chain via Elytro
   - This is a massive unlock: agent wallet + agent identity in one flow

**Why first:** Without a developer-friendly SDK, nothing else matters. Coinbase's Agentic Wallets won because they made it "minutes to integrate." You need the same.

### Phase 2: Developer Acquisition (Weeks 2-6)

**Goal:** 500 developers using the SDK, 50 active agent wallets on testnet.

**Tactics:**

1. **"Agent Wallet in 5 Minutes" tutorial** — blog post + YouTube video showing:
   - Create agent wallet → fund it → agent autonomously swaps on Uniswap
   - Compare lines of code vs. Coinbase (highlight: no API key, no vendor dependency)

2. **Hackathon blitz** — sponsor or attend 3-4 hackathons in 90 days:
   - ETHGlobal events, AI agent hackathons, framework-specific hackathons
   - Offer bounties: "Best agent app using Elytro" ($2-5K prizes)

3. **Open-source integrations as PRs:**
   - Submit PRs to LangChain, CrewAI, ElizaOS adding Elytro as a wallet option
   - This puts you in their docs and ecosystem for free

4. **Twitter/X developer content (3-5 posts/week):**
   - Technical threads: "How ERC-4337 session keys make agent wallets safe"
   - Comparison threads: "Self-sovereign vs. custodial agent wallets"
   - Build-in-public: share SDK development progress
   - Engage with agent ecosystem accounts (@langaboratory, @craboratory, @ai16zdao)

5. **Discord/Telegram community:**
   - Create a dedicated `#agent-builders` channel
   - Offer direct support to early integrators (white-glove onboarding)

### Phase 3: Narrative & Ecosystem (Weeks 4-8)

**Goal:** Establish Elytro as the "open alternative" in the agent wallet narrative.

**Tactics:**

1. **Publish "The Case for Self-Sovereign Agent Wallets"** — a manifesto-style blog post:
   - Why agents shouldn't depend on Coinbase for financial access
   - Why open-source wallet infra is critical for the machine economy
   - Position Elytro as infrastructure, not a product

2. **ERC-8004 thought leadership:**
   - Write about how ERC-8004 + ERC-4337 creates the full agent identity + wallet stack
   - Engage in Ethereum Magicians forum discussions
   - Propose extensions or improvements to the standard

3. **Partnership announcements** (even small ones create signal):
   - Integrate with 1-2 DeFi protocols for agent-native strategies
   - Partner with an AI agent framework for official wallet support
   - Collaborate with an L2 (Optimism or Arbitrum) on agent wallet grants

4. **Conference talks:**
   - Submit to ETHGlobal, Token2049, agent-focused side events
   - Topic: "Building the Financial Layer for Autonomous Agents"

### Phase 4: Growth Loops (Weeks 6-12)

**Goal:** Self-sustaining developer growth. 2,000+ SDK installs, 200+ active agent wallets.

**Tactics:**

1. **Template gallery** — pre-built agent wallet templates:
   - "DeFi trading agent with spending limits"
   - "Multi-agent team with shared treasury"
   - "Agent-to-agent payment via x402/ACP"
   - Each template is a GitHub repo that devs can fork and deploy in minutes

2. **Agent wallet explorer** — public dashboard showing:
   - Number of Elytro agent wallets deployed
   - Transaction volume through agent wallets
   - This creates social proof and a growth narrative

3. **Grants program** ($50-100K from treasury):
   - Fund 10-20 teams building agent apps on Elytro
   - Focus on novel use cases: agent DAOs, agent insurance, agent marketplaces

4. **Referral/integration incentives:**
   - Gas credits for first 1,000 agent wallets
   - Revenue share for frameworks that integrate Elytro as default wallet

---

## 5. Key Metrics to Track

| Metric | Week 4 | Week 8 | Week 12 |
|---|---|---|---|
| SDK npm/pip installs | 200 | 1,000 | 2,500 |
| Agent wallets deployed (testnet) | 50 | 200 | 500 |
| Agent wallets deployed (mainnet) | 10 | 50 | 200 |
| GitHub stars (agent SDK repo) | 100 | 500 | 1,500 |
| Framework integrations shipped | 2 | 4 | 6 |
| Developer Discord members | 100 | 400 | 1,000 |
| Twitter/X followers growth | +500 | +2,000 | +5,000 |
| Hackathon submissions using Elytro | 10 | 30 | 80 |

---

## 6. Budget Allocation (90-Day Estimate)

| Category | Amount | Notes |
|---|---|---|
| **Engineering** (SDK + integrations) | $80-120K | 2-3 engineers focused on agent SDK |
| **Hackathon sponsorships + bounties** | $20-40K | 3-4 events, $2-5K prizes each |
| **Content + marketing** | $10-20K | Technical writer, video production |
| **Developer grants** | $50-100K | 10-20 small grants for builders |
| **Gas credits / incentives** | $10-20K | Subsidize early agent wallet deployments |
| **Events + travel** | $10-15K | Conference talks, side events |
| **Total** | **$180-315K** | Fits within seed runway |

---

## 7. What NOT to Do

1. **Don't target consumers.** You won't out-market Coinbase or Trust Wallet for retail users. Agents are your wedge.
2. **Don't build your own payment protocol.** Integrate with x402, ACP, and AP2 instead. Be the wallet layer, not the payment layer.
3. **Don't spread across 20 chains.** Stay focused on Ethereum + Optimism + Arbitrum. Depth > breadth.
4. **Don't gate features behind a token.** The open-source, no-token model builds more trust with developers.
5. **Don't wait for the product to be "perfect."** Ship the SDK with core features, iterate based on developer feedback.

---

## 8. 30-Day Quick Wins (Start Tomorrow)

1. **[ ] Ship a minimal agent SDK** on npm with `createAgentWallet()` + `executeTransaction()` + `setSpendingLimits()` — even if incomplete, get it out for feedback
2. **[ ] Write the "Agent Wallet in 5 Minutes" tutorial** and post it on your blog + dev.to + Mirror
3. **[ ] Submit a LangChain PR** adding Elytro as a wallet tool — this alone could drive hundreds of developers to your repo
4. **[ ] Post a Twitter/X thread** titled "Why your AI agent shouldn't use a custodial wallet" — ride the narrative wave
5. **[ ] Reach out to 5 agent framework teams** (LangChain, CrewAI, ElizaOS, AutoGPT, Claude Agent SDK) for integration partnerships
6. **[ ] Register for the next 2 ETHGlobal hackathons** as a sponsor
7. **[ ] Create a `#agent-builders` Discord channel** and personally invite 20 developers from CT who are building agents
8. **[ ] Add ERC-8004 agent registration** to your wallet creation flow — first wallet to do this wins massive narrative points

---

## 9. The Big Bet

The agent wallet market will consolidate around 2-3 winners within 18 months. Coinbase will win enterprises. The open-source winner hasn't been decided yet.

Elytro's path to winning is:
1. **Best developer experience** for giving agents wallets
2. **ERC-4337 native** with real guardrails (not bolted-on)
3. **Self-sovereign** — no API keys, no vendor dependency, no custody
4. **ERC-8004 integrated** — wallet + identity in one flow
5. **Community-driven** — open-source with active contributors

If you execute the 90-day sprint above, you'll know by Week 12 whether developers want this. If SDK installs are growing and agents are deploying wallets, raise an A round on that traction. If not, pivot the positioning before the window closes.

**The window is open. Ship the SDK. Get it in developers' hands. Iterate fast.**
