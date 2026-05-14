# CCOS — Content Operations Claude Code Operating System

A product built on top of Claude Code that helps a non-technical operator run an end-to-end content production workflow: research a topic, generate a publishing schedule, produce drafts via agent, and review/approve them for export.

## Language

### End-user workflow

**Operator**:
The non-technical business user of the CCOS. Exactly one per install (ADR-0005). Interacts via UI, never via the `claude` CLI.
_Avoid_: User, client, customer, admin.

**Brand**:
The single business identity the CCOS produces content for. There is exactly one Brand per CCOS install (see ADR-0001). The Brand's identity is captured in the **Brand profile**.
_Avoid_: Company, client, tenant, account, organization.

**Brand profile**:
The Operator-editable record of the Brand — mission, voice, tone, target audience, do/don't list, visual identity standards. Edited through a dedicated UI surface; the canonical store is the root `CLAUDE.md`, which the Brand profile UI reads from and writes to.
_Avoid_: Design system, brand kit, style guide, brand book, CLAUDE.md.

**Topic**:
The free-text subject an Operator submits to start a Planning session.
_Avoid_: Query, prompt, brief.

**Planning session**:
A run that takes a Topic, performs Research, and proposes a Content schedule for the Operator to approve.
_Avoid_: Plan, planning run, planning task.

**Research bundle**:
The collected research outputs (notes, sources, summaries) produced during a Planning session and stored in a folder the Operator can browse. Drawn from a partitioned set of **Research sources**.
_Avoid_: Notes, research folder, sources.

**Research source**:
A class of source the Operator can toggle on/off when starting a Planning session. There are two partitions:
- **Web sources**: YouTube, Reddit, Hacker News, Medium, Substack — pulled via Firecrawl.
- **Internal sources**: the Brand's own materials inside the CCOS — past **Approved content** plus **Knowledge uploads**. Searched via simple keyword/file lookup (no embeddings; see ADR-0002).
Twitter/X, LinkedIn, TikTok, Instagram are explicitly deferred from v1 (login walls / paid API requirements).
_Avoid_: Channel, integration, provider.

**Content schedule**:
A proposed sequence of **Schedule items** generated from a Research bundle. Awaits Operator approval before becoming Tasks. Many Content schedules can exist in parallel — campaigns overlap in real content operations — so every Planning session either creates a new Content schedule or extends an existing one (Operator chooses at session start).
_Avoid_: Calendar, plan, content plan, editorial calendar.

**Schedule item**:
One entry in a Content schedule, containing a working title, intended publish date, and an outline (a short bulleted description of the piece's angle and key points). Becomes a Task once the Content schedule is approved.
_Avoid_: Slot, entry, plan item.

**Outline**:
The bulleted angle/coverage attached to a Schedule item. Carried forward into the Task so the Draft writer agent has the approved angle locked in.
_Avoid_: Brief, summary, plan.

**Task**:
A unit of content production derived from an approved Content schedule. One Task = one piece of content to be drafted.
_Avoid_: Item, work item, ticket, story.

**Expanded outline**:
The intermediate artefact produced between the Task's **Outline** (inherited from the approved Schedule item) and the **Draft**. An agent expands the bulleted Outline into a structural plan with sections, sub-points, and source references. Not Operator-gated — it's an internal handoff between two agents, but persisted so it's inspectable when a Draft goes wrong.
_Avoid_: Detailed outline, brief, plan.

**Draft**:
The agent-produced content tied to a single Task, written from the Task's **Expanded outline**. May go through Operator edits before approval.
_Avoid_: Output, content, article.

**Draft review**:
The per-Task surface where the Operator edits a Draft and approves or rejects it.
_Avoid_: Review, approval, editing.

**Approved content**:
A Draft the Operator has marked approved. The Operator exports it; the CCOS does not publish. Approved content is automatically available as an Internal source for future Planning sessions.
_Avoid_: Published content, final content.

**Knowledge upload**:
A document the Operator uploads into the CCOS's internal library (product docs, sales decks, prior articles, competitor research). Indexed and made available as an Internal source.
_Avoid_: Asset, attachment, reference doc.

**Progress review**:
The retrospective dashboard showing Task status *within a single Content schedule* — what's drafted, approved, overdue, slipped. Scoped per-Schedule (the Operator switches between Schedules); not aggregated across Schedules in v1.
_Avoid_: Review, dashboard, reports.

### Owner meta-loop

**Signal**:
An observed operational event the system captures automatically during the Operator's workflow — e.g. a high Schedule-item rejection rate, large Draft edit distance, repeated Operator overrides of a Brand-profile rule. Signals are stored and aggregated; the system does *not* act on them directly.
_Avoid_: Event, metric, telemetry.

**Signal dashboard**:
The Owner-facing surface that aggregates and surfaces **Signals**. The dashboard is the Owner's read-only view; it is the input to authoring **Action plans**.
_Avoid_: Analytics, reports.

**Action plan**:
A plan the Owner authors — manually — in response to **Signals** surfaced on the **Signal dashboard**. Captures a proposed change to the CCOS itself (feature improvements, Brand profile rule tweaks, skill changes). Not part of the Operator's content workflow. The system does not author or apply Action plans automatically.
_Avoid_: Roadmap, plan, todo.

**Owner**:
The builder/maintainer of the CCOS — distinct from the Operator. Consumes **Signals** and authors **Action plans**.
_Avoid_: Developer, admin, user.

## Relationships

- A CCOS install has exactly one **Brand** and exactly one **Operator** (see ADR-0005).
- Every **Draft** is written in the voice of the install's **Brand**, as defined by the **Brand profile**.
- The **Brand profile** UI is the only Operator-facing surface that edits the Brand's identity; it persists into the root `CLAUDE.md`.
- An **Operator** runs many **Planning sessions** over time.
- A **Planning session** produces one **Research bundle** and either creates a new **Content schedule** or extends an existing one — chosen by the Operator at session start.
- The system supports many **Content schedules** in parallel.
- A **Content schedule** contains one or more **Schedule items**; each Schedule item carries a title, date, and **Outline**.
- A **Content schedule**, once approved, turns each **Schedule item** into a **Task**. The Task inherits the **Outline**.
- A **Task** is produced in two agent steps: an outline-expander agent turns the Outline into an **Expanded outline**, then a draft-writer agent turns the Expanded outline into a **Draft**. There is no Operator approval gate between the two steps.
- A **Task** has one **Draft** at a time; the **Draft** goes through **Draft review** and may become **Approved content**.
- **Progress review** aggregates **Task** status across a **Content schedule**.
- The system emits **Signals** as a side-effect of the Operator's workflow (rejections, edits, overrides).
- The **Owner** reads **Signals** on the **Signal dashboard** and authors **Action plans** manually in response. The system never applies an Action plan automatically.

## Example dialogue

> **Builder:** "When the **Operator** kicks off a **Planning session** with a **Topic**, does the system go straight to producing a **Content schedule**?"
> **Domain expert:** "No — first it builds a **Research bundle** the **Operator** can browse. The **Content schedule** is proposed *from* that bundle and the **Operator** approves it before any **Tasks** are created."
> **Builder:** "And once a **Task** is drafted, the **Operator** approves it in **Draft review** — but the **Progress review** is a separate place?"
> **Domain expert:** "Right. **Draft review** is per-Task — edit one Draft. **Progress review** is the across-Task dashboard."

## Flagged ambiguities

- "Review" originally meant two different things. Resolved: **Draft review** is per-Task editing/approval; **Progress review** is the across-Task retrospective dashboard.
- "Plan" originally collided across two domains. Resolved: end-user planning produces a **Content schedule**; **Action plan** belongs to the Owner's meta-loop and never refers to content.
- "User" was ambiguous between Operator and Owner. Resolved: **Operator** = the end user of the product; **Owner** = the builder/maintainer.
- "Design system" was overloaded between frontend component library and marketing brand kit. Resolved: we use **Brand profile** for the marketing meaning, and the term "design system" is kept out of the glossary entirely.

## Open questions

- Where does Operator authentication live? (UI implies some login layer.)
_All foundational open questions resolved. See ADRs 0001–0009 for the architectural spine._
