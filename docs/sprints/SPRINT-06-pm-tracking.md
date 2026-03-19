# SPRINT-06 — Progress Tracking + Sprint Report
**Agent:** pm | **Priority:** 🟢 TRACKING | **Estimated time:** 30min
**Run:** End of each day after eng/ops agents commit

---

## Your tasks

1. **Update `eng/TODO.md`** — create if it doesn't exist:
   - ✅ Completed items
   - 🔄 In-progress items
   - ❌ Pending items
   - ⚠️ Blockers section (external credentials not yet configured)

2. **Update/create `eng/STATUS_REPORT.md`** — add today's entry:
   ```
   ## 2026-03-13 — Sprint 2: Core Feature Completion

   **Phase:** Sprint 2 — Core Feature Completion
   **Task Completed:** [list what eng/ops finished today]
   **Agent Responsible:** @eng / @ops
   **Technical Blockers:** [list any]
   **Progress Percentage:** X% of MVP
   **Next Immediate Action:** [next sprint file name]
   ```

3. **Update `prd.md`** — add/update `## Implementation Status` section at the bottom:
   - Map each PRD §1–6 requirement to: ✅ Built | 🔄 In Progress | ❌ Not Started

4. **Scope creep check** — flag anything being built NOT in prd.md §1–6

5. **Token budget alert** — if session history > 15,000 tokens, recommend Summary Handoff

6. **Update sprint statuses** — edit the Status line in each `eng/sprints/SPRINT-0*.md`:
   - Change `⬜ NOT STARTED` → `✅ DONE` / `🔄 IN PROGRESS` based on git log

## How to check git progress

```bash
git log --oneline -10
git diff --stat HEAD~1 HEAD
```

## Output

Write all reports to files. End your response with a 3-line executive summary.

