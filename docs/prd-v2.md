# CCOS v2 — Product Requirements Document

**Status:** Draft for review  
**Author:** Generated 2026-05-13  
**Builds on:** `docs/prd-v1.md`, `CONTEXT.md`, `docs/adr/`

---

## Executive Summary

CCOS v1 delivers a working end-to-end content production loop: research → schedule → draft → review → export. v2 turns that loop into a full content operating system. The six major capability areas in this document are:

1. **Multi-format content creation** — one research bundle, many output formats
2. **Audience engagement tooling** — from written drafts to published conversations
3. **Content intelligence** — SEO, readability, brand consistency, fact-check signals
4. **Competitive & trend intelligence** — know what to write before your competitors do
5. **Team workflows & CMS integration** — multi-Operator, collaborative review, push-to-publish
6. **Autonomous improvement loop** — the system learns from its own output history and the Owner's action plans

Each area is described with user stories, a feature inventory, and technical notes. A phased roadmap at the end sequences delivery.

---

## Problem Statement

v1 solves the hard problem of producing content at all — research, scheduling, drafting, and approval are now automated for a single Operator. But four major gaps remain:

1. **One format, one channel.** Every approved piece exits as a Markdown file. The Operator must manually adapt it for LinkedIn, email, video script, or short-form social. This re-work is repetitive and not brand-consistent.

2. **No feedback loop from the real world.** Once a draft is exported, CCOS hears nothing. The system cannot know which topics drove engagement, which headlines worked, or when an evergreen piece needs refreshing.

3. **Single-Operator bottleneck.** Real content operations are team sports — writers, editors, subject-matter experts, and approvers. v1's single-Operator constraint means CCOS can only serve solo creators.

4. **Reactive intelligence.** The Owner reads signals and manually writes action plans. The system does not proactively surface insights, predict quality, or suggest improvements. The agent learns nothing from approved content over time.

---

## Domain language additions (extends `CONTEXT.md`)

**Format variant:**  
A version of a Draft adapted for a specific distribution channel — LinkedIn post, Twitter/X thread, email newsletter, video script, podcast outline. Derived from an Approved content piece; not a replacement.

**Content quality score:**  
A composite of SEO signal, readability grade, and brand voice alignment computed per Draft before approval.

**Persona:**  
A defined audience segment (e.g. "senior decision-maker", "early-career practitioner") the Operator can target a Draft or Format variant toward. Many Personas can be defined per Brand.

**Trend signal:**  
A web-sourced indicator that a topic is gaining or losing momentum (search volume delta, Reddit velocity, news volume). Distinct from an operational Signal (which tracks Operator behaviour).

**Content pulse:**  
The scheduled re-evaluation of Approved content to detect when it has become stale — triggered by Trend signals, not by time alone.

**Campaign:**  
A named grouping of one or more Content schedules and their Tasks sharing a common business objective. v1 has Content schedules but no grouping layer above them.

**Contributor:**  
An Operator-level role with limited permissions — can edit Drafts but cannot approve them or modify the Brand profile. Part of the multi-Operator model.

**Reviewer:**  
An Operator-level role that can approve or reject Drafts but cannot create Planning sessions or edit the Brand profile.

---

## Feature Area 1 — Multi-format Content Creation

### Problem

Approved content lives in one form. Distributing it across LinkedIn, email newsletters, YouTube descriptions, and short-form social requires the Operator to manually rewrite the same material in different voices and lengths. This is the highest-volume repetitive task in any content operation.

### Features

#### 1.1 Format variant pipeline

When a Draft is approved, the Operator can trigger automatic generation of Format variants from a predefined set:

| Format | Typical length | Key constraint |
|--------|---------------|----------------|
| LinkedIn post | 150–300 words | Professional tone, opens with a hook, no markdown headers |
| Twitter/X thread | 5–8 tweets, 280 chars each | Punchy, numbered, ends with CTA |
| Email newsletter | 400–600 words | Subject line + preview text + body + CTA button copy |
| Video script | 600–900 words | Spoken-word cadence, scene callouts, presenter cues |
| Podcast talking points | Bullet list, ~500 words | Conversational, not read aloud, timestamp markers |
| Short-form social (general) | 80–120 words | Platform-neutral, hook + insight + CTA |

Each Format variant is a new Draft-like entity linked to its parent Approved content. It goes through its own review cycle (edit → approve → export) but inherits the parent's research citations and brand voice.

**Agent design:** A single `format-adapter-agent` receives the Approved content, the target Format, and the Brand profile. The Format schema specifies constraints (length, style notes, structural rules). The agent is not the draft-writer — it is a re-caster.

#### 1.2 Bulk format generation

After approving a piece, the Operator can select multiple Formats and generate all of them in a single pipeline run. The drafting pipeline fans out one `format-adapter` job per Format in parallel, then presents each for review.

#### 1.3 Content repurposing from existing approved content

The Operator can browse any past Approved content and trigger a Format variant from it, not only from newly approved pieces. This enables retroactive distribution of older content to new channels.

#### 1.4 Headline laboratory

When a Draft enters review, an additional agent produces 5 headline variants at different angles:
- **Curiosity gap** ("What most content teams get wrong about research")
- **Data-led** ("Content teams that use internal sources get 2× brand consistency")
- **Question** ("Is your content actually reaching the right audience?")
- **How-to** ("How to run a research-driven content schedule in one tool")
- **Direct** ("CCOS: the content ops tool for solo teams")

The Operator picks one before approving. The chosen headline and the unchosen variants are recorded as Signals for future analysis.

#### 1.5 Audience persona adaptation

For each approved piece or Format variant, the Operator can request a **Persona adaptation** — a re-write tuned for a specific defined Persona (e.g. "make this accessible to a beginner", "reframe this for a technical audience"). Persona adaptations are sub-drafts that share the parent's structure but differ in vocabulary level, assumed knowledge, and examples used.

### User stories

- As an Operator, I want to generate a LinkedIn post from an approved blog draft in one click, so that I can distribute the content without rewriting it.
- As an Operator, I want to generate all my Format variants at once after approving a piece, so that my distribution pipeline doesn't create a queue.
- As an Operator, I want to choose from 5 headline options before approving a draft, so that I can optimise for the tone that fits the piece best.
- As an Operator, I want to generate a beginner-level adaptation of a technical draft, so that I can reach a wider audience with the same research.

---

## Feature Area 2 — Audience Engagement Tooling

### Problem

Content is a conversation, not a broadcast. After publishing, Operators receive comments, questions, and objections — and spend significant time responding to them manually. CCOS currently ends at export; it has no role in the post-publish conversation.

### Features

#### 2.1 Comment response templates

The Operator can paste or import a batch of audience comments (from a blog CMS, LinkedIn, YouTube) and request a set of suggested response templates. The agent groups comments by theme (question, objection, praise, off-topic) and generates one draft response per group, in Brand voice.

The Operator edits and saves templates to a **Response library** — reusable brand-consistent responses that grow over time.

#### 2.2 FAQ extraction

From a set of approved Drafts (or from imported comments), an agent extracts the 10 most-asked questions about a topic and generates a FAQ document. The FAQ becomes a new Knowledge upload automatically.

#### 2.3 CTA (call-to-action) optimiser

As part of Draft review, the system offers an optional CTA analysis pass. An agent evaluates the strength of the draft's call to action against the Brand profile goals and suggests 3 alternatives. The Operator picks or ignores.

#### 2.4 Engagement score prediction

Before approval, each Draft receives a predicted **engagement score** (1–10) based on:
- Structural signals (is there a hook? does it answer the stated outline?)
- Length vs. format norms for the Brand's typical channels
- Comparison to the Brand's own highest-edit-distance Approved content (heavy editing = low initial quality; high engagement = good quality)
- Topic trend signal (is this topic trending or decaying on web sources?)

The score is advisory — it does not block approval — and feeds the Signal dashboard.

#### 2.5 Optimal publish timing

When the Operator sets the publish date on a Schedule item, the system optionally suggests a refined publish time (not just date) based on topic category and general web engagement patterns. This is a lightweight heuristic, not a machine learning model.

### User stories

- As an Operator, I want to paste 20 audience comments and get draft responses grouped by theme, so that I can reply quickly without spending an hour writing.
- As an Operator, I want to see an engagement score on each draft before I approve it, so that I can decide whether to iterate or accept.
- As an Operator, I want the system to extract a FAQ from my approved content, so that I have ready-made content that addresses my audience's most common questions.

---

## Feature Area 3 — Content Intelligence

### Problem

Quality control today is entirely manual. The Operator reads the draft and judges by feel. There is no systematic check against SEO best practices, readability norms, brand voice consistency, or factual accuracy. Editors at scale use these signals automatically — CCOS should surface them without requiring the Operator to know what to look for.

### Features

#### 3.1 Content quality score (composite)

Each Draft, when it enters review, receives a **Content quality score** composed of four sub-scores:

| Sub-score | What it measures | How computed |
|-----------|-----------------|-------------|
| **SEO signal** | Keyword usage, title length, heading structure, meta description presence | Structural heuristics; keyword match against Research bundle |
| **Readability** | Grade level, sentence complexity, paragraph length | Flesch-Kincaid + custom thresholds set in Brand profile |
| **Brand voice alignment** | Does the draft match the brand voice/tone/dos/don'ts? | Claude evaluates the draft against the Brand profile |
| **Outline fidelity** | Does the draft cover all points in the Expanded outline? | Semantic matching between outline bullets and draft sections |

The composite score (0–100) is shown in Draft review alongside per-sub-score breakdowns. Scores below threshold trigger a warning (not a block).

#### 3.2 Brand voice consistency tracker

Over time the system computes the mean brand voice alignment score across all Approved content. If a new draft scores more than 1.5 standard deviations below the rolling mean, an alert is surfaced in Draft review: "This draft may be diverging from your established voice."

The signal feeds the Owner's Signal dashboard as a `brand_drift` event type.

#### 3.3 Fact-check flagging

An agent scans the draft for specific claim types that are high-risk for factual error:
- Statistics or percentages without a source
- Named studies or research papers
- Year-specific data ("in 2024, X happened")
- Named individuals in a professional context

Each flagged claim is highlighted in Draft review with a suggested source-check prompt. The Operator can mark each flag "verified" or "rewritten". Unflagged approval (when flags exist) records a `fact_check_skipped` signal.

#### 3.4 SEO keyword optimisation

During Planning session, the Operator can optionally enter **target keywords** per Schedule item. These are carried into the Task and the drafting pipeline. The draft-writer agent is prompted to incorporate the keywords naturally. Draft review shows keyword density and suggests alternatives if a keyword is over- or under-used.

#### 3.5 Internal linking suggestions

When a Draft enters review, the system scans the Approved content library and suggests up to 5 internal links — places in the draft where an anchor text naturally bridges to a previously approved piece. The Operator accepts or ignores each suggestion.

This is implemented as a keyword overlap + semantic similarity pass (this is the first use of lightweight embeddings in CCOS — see Technical notes).

#### 3.6 Semantic deduplication alert

Before a Planning session confirms a Content schedule, the system checks whether any of the proposed Schedule items closely resembles existing Approved content (same topic, similar angle). If a near-duplicate is detected, the Operator is warned and given the option to:
- Skip the item
- Repurpose the existing piece instead (triggers Feature 1.3)
- Proceed anyway (different angle or format justifies the overlap)

### User stories

- As an Operator, I want to see a readability and brand voice score before approving a draft, so that I can catch quality problems without reading every sentence analytically.
- As an Operator, I want the system to flag unverified statistics in a draft, so that I don't accidentally publish inaccurate claims.
- As an Operator, I want internal linking suggestions when reviewing a draft, so that I can build content clusters without manually tracking every piece I've published.
- As an Operator, I want to be warned when a proposed schedule item duplicates something I've already written, so that I don't waste a drafting pipeline run on near-duplicate content.

---

## Feature Area 4 — Competitive & Trend Intelligence

### Problem

v1 research is reactive — the Operator picks a topic and the system researches it. Content teams that consistently outperform competitors are proactive — they track topic momentum and know what to publish before the competition does. CCOS should become the Operator's early-warning system.

### Features

#### 4.1 Trend signal monitor

A background job (scheduled or manually triggered) checks configured **tracked topics** against web sources and computes a **Trend signal** per topic:
- **Rising** — activity increasing week-over-week
- **Stable** — consistent activity, no significant change
- **Declining** — activity decreasing; existing content may need refreshing

Trend signals appear on a new **Trends** page and can trigger notifications. The Operator can start a Planning session directly from a Rising trend.

**Sources:** Reddit post velocity, HN submission counts, Firecrawl news search — all sources already available in v1's web-sources adapter.

#### 4.2 Competitor content monitor

The Operator can configure up to 10 **competitor URLs** (blog RSS feeds, publication pages, or specific sections). The system periodically fetches new posts from each and indexes their titles, summaries, and publish dates.

A **Competitor activity** page shows:
- Recent competitor posts by source
- Topics the competitor has covered that the Operator has not (gap analysis)
- Topics the Operator has covered that the competitor has not (differentiators)

The gap list is directly actionable: any identified gap can be added to an existing Content schedule as a new Schedule item.

#### 4.3 Content gap analysis

Against the Operator's full Approved content library, an agent maps coverage across topic clusters and identifies:
- Topics the Brand profile references but no approved content addresses
- Questions from the Response library (Feature 2.1) that have no published answer
- Trending topics (from 4.1) the Operator hasn't covered yet

Gaps are presented as suggested Schedule items ready to add to a Planning session.

#### 4.4 Content pulse (evergreen refresh)

Each approved piece accumulates a **staleness score** over time based on:
- Has the topic entered a Declining trend signal?
- Are competitor posts on the same topic significantly newer?
- Is the published date more than N months ago (Operator-configured threshold)?

When a piece crosses the staleness threshold it surfaces in a **Needs refresh** queue. The Operator can:
- Trigger a Planning session scoped to the original topic to research an update
- Generate a revised draft using the existing piece as an Internal source
- Archive the piece (removes it from Internal sources)

#### 4.5 Social media sources (deferred from v1)

Unlock Twitter/X, LinkedIn, and Instagram as Research sources, solving the authentication problem that blocked v1:

| Source | Auth approach |
|--------|--------------|
| Twitter/X | OAuth 2.0 app credentials; read-only search API |
| LinkedIn | OAuth 2.0; read-only article/post search |
| Instagram | Basic Display API; public post captions only |

These are opt-in per Planning session. Operator authenticates once via a settings page; credentials stored encrypted in the DB.

### User stories

- As an Operator, I want to see which topics are rising right now so I can start a Planning session on a trend before my competitors do.
- As an Operator, I want to know what my competitors are writing about that I haven't covered, so that I can close content gaps proactively.
- As an Operator, I want the system to tell me which of my older posts need updating, so that my content library stays fresh without manual auditing.
- As an Operator, I want to use LinkedIn and Twitter as research sources so that I capture social conversations, not just long-form web content.

---

## Feature Area 5 — Team Workflows & CMS Integration

### Problem

v1 is single-Operator by design (ADR-0005). Real content teams have writers, editors, subject-matter experts, and legal/compliance reviewers. Collaboration currently happens outside CCOS, creating a split between the tool and the actual approval process. Additionally, every export is a manual copy-paste into the CMS.

### Features

#### 5.1 Multi-Operator roles

Introduce three roles on a per-install basis:

| Role | Create Planning session | Edit Drafts | Approve Drafts | Edit Brand profile | View Signals |
|------|------------------------|-------------|----------------|-------------------|-------------|
| **Owner** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Operator** | ✓ | ✓ | ✓ | ✓ | — |
| **Contributor** | — | ✓ | — | — | — |
| **Reviewer** | — | — | ✓ | — | — |

Up to 10 users per install. Auth at the proxy layer (Caddy basic-auth is replaced by an in-app session model backed by the DB). Each user has a name, email, and hashed password.

#### 5.2 Draft comments and annotations

Any team member can add **inline comments** on a Draft during review — highlighting a passage and attaching a note. Comments are threaded. The Operator who owns the Task must resolve all open comments before approving.

Comments feed a new Signal type: `draft_comment_volume` — high comment volume on a piece is an early indicator of clarity or accuracy problems.

#### 5.3 Approval workflow configuration

The Owner can configure a required **approval chain** per Content schedule:
- **Single approver** — default v1 behaviour
- **Two-step** — Contributor edits, then Operator approves
- **Three-step** — Contributor edits, Reviewer approves draft quality, Operator gives final approval

The Task status machine gains new states to model in-progress review: `pending-contributor`, `pending-reviewer`, `pending-operator`.

#### 5.4 CMS integrations (push-to-publish)

Replace the manual "export as .md and paste into your CMS" step with direct publishing connectors:

| CMS | Integration approach |
|-----|---------------------|
| **WordPress** | REST API; authenticate with Application Password |
| **Ghost** | Admin API; create draft post |
| **Webflow** | CMS Items API; map Draft fields to collection fields |
| **Notion** | Blocks API; create page in a designated database |
| **Ghost newsletter** | Admin API; create email-only post |
| **Generic webhook** | POST approved content JSON to a custom URL |

Each connector is configured in a **Publish destinations** settings page. The Operator selects a destination at approval time. The system pushes the content as a *draft* in the CMS (never auto-publishes). The Operator publishes from the CMS.

#### 5.5 Email notifications

When a Task's draft is ready for review, the assigned Contributor/Reviewer/Operator receives an email. Configurable per user per role. Sent via a configurable SMTP relay (env var at deploy time).

#### 5.6 Draft version history

Every save of a Draft (by any user or agent) creates a versioned snapshot. The Operator can view the diff between any two versions and restore a previous version. Edit distance is calculated against the most recent agent-produced draft (unchanged from v1) but the version history enables more granular revision attribution.

### User stories

- As an Owner, I want to add a Contributor who can write but not approve, so that I can involve a freelance writer in my content process.
- As a Reviewer, I want to leave inline comments on a draft before approval, so that I can request changes without rewriting the piece myself.
- As an Operator, I want to push an approved draft to Ghost as a draft post in one click, so that I don't copy-paste it manually.
- As a Contributor, I want to receive an email when a Task is assigned to me, so that I don't miss work queued for me.

---

## Feature Area 6 — Autonomous Improvement Loop

### Problem

The Signal dashboard gives the Owner a read-only view of operational signals. Acting on them requires writing a manual Action plan, then implementing it manually. The system has a rich history of approved content, edit distances, brand drift, and engagement scores — but it doesn't use that history to improve itself.

### Features

#### 6.1 Agent style memory

After accumulating N approved pieces (configurable threshold, default 10), a background job analyses the approved corpus to extract **style fingerprints**:
- Average sentence length in brand content
- Most common structural patterns (does the brand always open with a question? Close with a list?)
- Vocabulary profile (formal vs. colloquial; active vs. passive voice ratio)
- Topic cluster density (what the brand writes most about)

The fingerprints are stored as a **Style memory** block appended to the Brand profile. The draft-writer agent reads Style memory in addition to the explicit Brand profile. Style memory is re-computed each time a new piece is approved.

This replaces the need for the Owner to manually specify every stylistic rule — the system learns them from output the Operator has approved.

#### 6.2 Action plan suggestions

When the Owner views the Signal dashboard, the system now offers (not applies) **suggested Action plans** generated by an AI analysis pass over the signals:

> "Over the last 30 days, 4 of 7 drafts had a brand voice score below 65. The low-scoring drafts were concentrated in topics involving product comparisons. Consider adding comparison-specific writing guidelines to the Brand profile's Do/Don't list."

The Owner can:
- **Accept** — creates a pre-filled Action plan with the suggestion
- **Dismiss** — suppresses the suggestion for 30 days
- **Modify** — opens the Action plan editor with the suggestion as a starting point

The system never applies Action plans automatically. The Owner is always the author.

#### 6.3 Pipeline velocity dashboard

A new **Velocity** page (Owner-only) shows the content production pipeline as a funnel:

```
Topics started → Research bundles produced → Schedules proposed → Schedules approved
→ Tasks created → Drafts completed → Drafts approved → Content exported
```

For each stage transition, it shows:
- Count
- Median time in stage
- Drop-off rate (items that entered the stage but did not exit)

Bottlenecks are highlighted. If "Schedules approved → Tasks drafted" median time exceeds 24 hours it flags a likely server resource issue (the drafting pipeline is slow). If "Drafts completed → Drafts approved" median time exceeds 7 days it flags a review bottleneck.

#### 6.4 Brand drift detection

The system computes a rolling 30-day brand voice alignment score. If the 7-day moving average drops more than 15% below the 90-day baseline, the Owner receives a **brand drift alert** on the Signal dashboard with:
- Which drafts contributed to the decline
- Common themes across the low-scoring drafts
- A pre-built suggested Action plan referencing the offending topics

#### 6.5 Collaborative multi-agent drafting (advanced)

For long-form content (>1500 word target), replace the single draft-writer agent with a **specialist panel**:

1. **Intro agent** — writes the hook and framing section
2. **Section agents** (one per major section in the Expanded outline) — each writes one section independently
3. **Conclusion agent** — writes the closing and CTA
4. **Editorial agent** — receives all sections, stitches them, enforces brand voice consistency, removes redundancy

Each sub-agent is given only its own section of the Expanded outline and the Brand profile. The editorial agent sees everything. This produces longer, more structurally coherent drafts at the cost of higher token usage.

The Operator opts into the specialist panel at the Task level or as a Brand profile default for pieces over a target word count.

#### 6.6 Campaign intelligence

A **Campaign** layer groups Content schedules sharing a business objective (e.g. "Q3 product launch", "evergreen SEO cluster: remote work"). Campaigns gain their own analytics:
- Combined Progress review across all member schedules
- Total approved word count
- Brand voice score trend over the campaign duration
- Top-performing pieces (if engagement data is imported from a CMS)

Campaigns are created and managed by the Operator; schedules are assigned to them at creation or retrospectively.

### User stories

- As an Owner, I want the system to learn the brand's writing patterns from my approved content, so that new drafts require less manual correction over time.
- As an Owner, I want AI-suggested action plans based on my signal data, so that I can act on problems faster without spending time analysing the dashboard myself.
- As an Owner, I want to see where content is stalling in the pipeline, so that I can diagnose whether the bottleneck is the agent or the Operator's review cycle.
- As an Operator, I want to group my schedules into a Campaign, so that I can track the progress of a product launch across multiple content pieces at once.

---

## Technical Considerations

### Database migrations

v2 introduces new tables and significant schema extensions. A migration system (e.g. `better-sqlite3-migrations` or a simple in-order SQL file runner) must be added before any v2 table is created. v1 uses inline `CREATE TABLE IF NOT EXISTS` in `db.ts`; v2 requires a structured migration registry.

### Lightweight embeddings (Feature 3.5, 3.6)

Internal linking suggestions and semantic deduplication require semantic similarity — keyword matching alone produces too many false positives. Options:
- **Voyage AI embeddings** (Anthropic-recommended) — 1536-dim vectors, competitive cost
- **SQLite-vec** — stores float vectors in SQLite; no external service required
- Threshold: activate at ≥20 approved pieces (below that, keyword search suffices)

This revisits ADR-0002. A new ADR should be written before implementation.

### Social OAuth (Feature 4.5)

OAuth tokens must be encrypted at rest. Recommend storing as encrypted blobs with the key derived from a deploy-time `SECRET_KEY` env var. Tokens should be scoped read-only.

### Multi-Operator auth (Feature 5.1)

Replaces Caddy basic-auth with in-app session management. Recommended approach:
- `users` table: id, name, email, hashed_password (bcrypt), role, created_at
- Session cookie (HttpOnly, Secure, SameSite=Strict)
- Caddy still terminates TLS but no longer handles auth
- ADR required to document the auth model change

### CMS connectors (Feature 5.4)

Each connector should be an isolated module (`src/lib/connectors/wordpress.ts`, etc.) with a common interface:
```ts
interface PublishConnector {
  name: string;
  push(draft: ApprovedDraft, config: ConnectorConfig): Promise<{ url: string }>;
  testConnection(config: ConnectorConfig): Promise<boolean>;
}
```

### Specialist panel (Feature 6.5)

Parallel section-agent jobs require the job runner to support **fan-out**: one parent job spawns N child jobs and waits for all to complete before the editorial agent runs. The current in-process job runner does not have this primitive. Design required before implementation.

### Email notifications (Feature 5.5)

Use `nodemailer` with a configurable SMTP relay. Env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Email templates stored as HTML files, not inline strings.

---

## Phased Roadmap

### Phase 1 — Quality & Intelligence (foundation for everything else)
*Relatively low risk; builds on v1 without changing auth or multi-Operator model.*

- [ ] 3.1 Content quality score (SEO, readability, brand voice, outline fidelity)
- [ ] 3.3 Fact-check flagging
- [ ] 3.4 SEO keyword optimisation
- [ ] 1.4 Headline laboratory
- [ ] 3.6 Semantic deduplication alert
- [ ] DB migration system

### Phase 2 — Multi-format & Repurposing
*Extends the drafting pipeline; no schema breaking changes.*

- [ ] 1.1 Format variant pipeline (LinkedIn, email, Twitter thread)
- [ ] 1.2 Bulk format generation
- [ ] 1.3 Repurposing from existing approved content
- [ ] 1.5 Audience persona adaptation
- [ ] 2.3 CTA optimiser

### Phase 3 — Trend & Competitive Intelligence
*New background jobs; no auth changes.*

- [ ] 4.1 Trend signal monitor
- [ ] 4.2 Competitor content monitor
- [ ] 4.3 Content gap analysis
- [ ] 4.4 Content pulse (evergreen refresh)

### Phase 4 — Team Workflows
*Requires in-app auth — the highest-risk phase architecturally.*

- [ ] 5.1 Multi-Operator roles (new auth model, ADR required)
- [ ] 5.2 Draft comments and annotations
- [ ] 5.3 Approval workflow configuration
- [ ] 5.5 Email notifications
- [ ] 5.6 Draft version history
- [ ] 4.5 Social media sources (OAuth)

### Phase 5 — Integrations & Autonomous Loop
*Depends on Phase 4 being stable.*

- [ ] 5.4 CMS integrations (WordPress, Ghost, Webflow, Notion, generic webhook)
- [ ] 6.1 Agent style memory
- [ ] 6.2 Action plan suggestions
- [ ] 6.3 Pipeline velocity dashboard
- [ ] 6.4 Brand drift detection
- [ ] 6.6 Campaign intelligence
- [ ] 2.1 Comment response templates
- [ ] 2.2 FAQ extraction
- [ ] 2.4 Engagement score prediction
- [ ] 3.5 Internal linking suggestions

### Phase 6 — Advanced AI Architecture
*Research phase; ship only when Phase 5 is validated.*

- [ ] 6.5 Collaborative multi-agent drafting (specialist panel)
- [ ] 2.5 Optimal publish timing (ML-backed)
- [ ] Advanced signal-to-action learning

---

## Out of Scope for v2

- **Automatic publishing** to any CMS — CCOS always pushes as a draft; the human publishes.
- **Direct ad campaign integration** (Google Ads, Meta) — content operations ≠ paid media.
- **Image generation** — CCOS produces text; image workflows are delegated to the Operator's design stack. Image prompt generation (text output only) could be a v3 consideration.
- **Real-time collaborative editing** (Google Docs-style simultaneous cursors) — comment-based async review (Feature 5.2) is sufficient for the team sizes this product serves.
- **Automatic action plan execution** — the Owner always applies Action plans manually. The system's role is to recommend, never to act.
- **Promotion to Postgres** — deferred per ADR-0009 until multi-Operator write contention is observed in production.

---

## Open Questions

1. **Engagement data import** — Features 2.4 and 6.3 benefit from real post-publish engagement data. What is the right integration model? GA4 event import, CMS API polling, or manual CSV upload?

2. **Style memory and Brand profile ownership** — Style memory (Feature 6.1) writes to the Brand profile automatically. Should the Owner be able to lock sections of the Brand profile to prevent style memory from overwriting intentional rules?

3. **Embeddings ADR** — Feature 3.5 and 3.6 require lightweight embeddings. The new ADR must decide between SQLite-vec (no external service) and Voyage AI (better quality). This decision affects latency, cost, and offline operation.

4. **Specialist panel token cost** — Feature 6.5 produces multiple Claude calls per draft. For a 2000-word piece with 5 sections, this could be 8 API calls (intro + 5 sections + conclusion + editorial). Is this cost acceptable at the price point CCOS operates at?

5. **Compliance / legal review role** — Some content operations require a legal or compliance sign-off. Is a fourth Reviewer sub-role (legal) warranted in the Phase 4 auth model, or is the three-step workflow sufficient?
