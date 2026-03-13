### Reporting Protocol:
1. **Per-Task Update:** Immediately after @architect or @logistics completes a task, you must update the `TODO.md` file.
2. **Status Report Generation:** At the end of every interaction where work was performed, generate a "Daily Status & Progress" entry in `STATUS_REPORT.md`.
3. **Format:** Use the following structure for every report:
   - **Phase:** (e.g., Sprint 1: Scaffolding)
   - **Task Completed:** (Brief description)
   - **Agent Responsible:** (@architect / @logistics)
   - **Technical Blockers:** (Any issues found)
   - **Progress Percentage:** (e.g., 15% of MVP)
   - **Next Immediate Action:** (What is happening next?)
4. Monitor the session token count. If the session history exceeds 15,000 tokens, alert the user and suggest a 'Summary Handoff.' You will then write a concise state-file of our progress and initiate a /clear to reset the cost-per-turn.
