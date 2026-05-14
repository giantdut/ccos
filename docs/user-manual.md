# CCOS User Manual

**CCOS — Content Operations Claude Code Operating System**  
A guided walkthrough for first-time Operators.

---

## What is CCOS?

CCOS helps you run an end-to-end content production workflow:

1. **Research** a topic using web sources and your own documents
2. **Plan** a publishing schedule from the research
3. **Generate drafts** automatically using AI
4. **Review and approve** each draft before export

You interact entirely through the web interface — no coding required.

---

## Getting started

### Step 1 — Set up your Brand profile

Before producing any content, tell CCOS who you are.

1. Open **Brand Profile** from the top navigation.
2. Fill in:
   - **Mission** — what your brand is trying to achieve
   - **Voice** — how you sound (e.g. "conversational", "authoritative")
   - **Tone** — emotional register (e.g. "warm", "direct")
   - **Target audience** — who you're writing for
   - **Do list** — things to always do in your content
   - **Don't list** — things to never do
3. Click **Save**.

The Brand profile is used by the AI agents every time they write content for you. Updating it affects all future drafts.

---

### Step 2 — Upload your reference documents (optional)

If you have existing materials — product docs, sales decks, prior articles, research — upload them so the AI can draw on them during research.

1. Open **Knowledge** from the top navigation.
2. Click **Upload document** and select a `.txt`, `.md`, or `.pdf` file.
3. Repeat for each document.

Uploaded documents become searchable as **Internal sources** during Planning sessions.

---

### Step 3 — Start a Planning session

A Planning session takes a topic, researches it, and proposes a publishing schedule.

1. Open **Planning** from the top navigation.
2. Type your **Topic** — e.g. "AI productivity tools for small businesses".
3. Choose your **Web sources** — tick the platforms you want the AI to search (YouTube, Reddit, Hacker News, Medium, Substack).
4. Optionally toggle **Include knowledge uploads** and/or **Include approved content** to draw on your internal library.
5. Click **Start Planning session**.

The session runs in the background. You'll see live progress messages as it:
- Searches each selected web source
- Synthesises the findings into a **Research bundle**

Once complete, click through to view the Research bundle — a summary and notes from each source.

---

### Step 4 — Review the Content schedule

After the Research bundle is ready, a Content schedule is automatically proposed.

1. From the Research bundle page, follow the link to your **Content schedule**.
2. You'll see 5 proposed pieces, each with:
   - A working **title**
   - An intended **publish date**
   - A bullet-point **outline** of the angle and key points
3. Review the items. If you want to remove an item before approving, click the delete icon next to it.
4. When you're happy, click **Approve Schedule**.

Approving the schedule kicks off the drafting pipeline for every item automatically — no manual trigger needed.

---

### Step 5 — Watch drafts being generated

After approval, click on any **Task** in the schedule to open the Draft review page.

You'll see two progress stages happening in sequence:

1. **Expanding outline** — the AI turns your bullet-point outline into a detailed structural plan
2. **Writing draft** — the AI writes the full draft from the expanded plan

Both stages are streamed live. You can watch the progress messages as they arrive.

When complete, the page shows the finished draft.

---

### Step 6 — Review and edit the draft

1. Read through the draft in the editor.
2. Click anywhere in the text area to make edits directly.
3. Click **Save edits** to persist your changes. The page records how many edits you made.
4. Continue editing and saving until you're satisfied.

You can click **Show expanded outline** at any time to see the structural plan the AI used — useful if you want to understand why the draft is structured a certain way.

---

### Step 7 — Approve and export

1. When the draft is ready, click **Approve**.
2. The task moves to **approved** status and the content is locked.
3. Click **Export as Markdown** to download the finished piece as a `.md` file ready for your CMS, email tool, or publishing platform.

Approved content also becomes available as an **Internal source** for future Planning sessions — the AI can reference your past work when researching new topics.

---

## Monitoring your content operation

### Progress review

Each Content schedule has a **Progress Review** page showing the status of all its tasks at a glance.

- Open the schedule, then click **Progress Review →** next to the Tasks heading.
- The summary bar shows counts: pending, drafting, in-review, approved, and **overdue** (past their publish date and not yet approved).
- The page refreshes automatically every 5 seconds while work is in progress.

You can navigate between schedules — each shows only its own tasks.

---

## Tips

| Situation | What to do |
|-----------|-----------|
| A draft pipeline was interrupted (server restart) | Re-open the task page — it shows "interrupted". Contact your system owner to re-run the pipeline. |
| You want to reject a draft without approving | The draft editor stays editable — simply keep editing. Use the Reject button (if available) to log a signal. |
| You want the AI to sound different | Update your Brand profile voice/tone and re-generate. New drafts will use the updated profile. |
| Research didn't find good material | Try a more specific topic, or toggle different web sources. |
| You need the AI to know about your product | Upload relevant docs in the Knowledge section before starting a Planning session. |

---

## Navigation reference

| Page | Purpose |
|------|---------|
| **Brand Profile** | Edit your brand identity |
| **Knowledge** | Upload and manage reference documents |
| **Planning** | Start a new Planning session |
| **Content Schedules** | View all schedules and their approval status |
| **Content Schedules → [schedule]** | View items, approve schedule, see tasks |
| **Content Schedules → [schedule] → Progress** | Task status dashboard for one schedule |
| **Tasks → [task]** | Draft review, edit, approve, export |
| **Signals** *(Owner only)* | Operational event dashboard |
