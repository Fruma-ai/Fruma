# Cursor Automations — keep building when Owen is away

Repo files (`steward-queue.ts`, `.cursor/rules/fruma-steward.mdc`) tell every Cloud Agent what to do. **They do not start a run by themselves.** Owen does this once at [cursor.com/automations](https://cursor.com/automations) (or Agents Window → Automations). After that, agents continue without a daily prompt.

## One-time setup (Owen)

Create **three** automations against `Fruma-ai/Fruma`. Enable **open pull request**. Paste the standing prompt from `lib/fruma/agents/steward-queue.ts` (`STEWARD_PROMPT`) into each, plus the trigger-specific line below.

### 1. Weekday steward (the important one)

- **Trigger:** Scheduled. Weekdays 07:30 Europe/London (or cron `30 7 * * 1-5`).
- **Repo:** `Fruma-ai/Fruma`, branch `main`.
- **Extra line:** `Pull nextStewardPull(). If it is null, comment that you are idle and do not open an empty PR.`

This is how work continues overnight and over weekends you skip.

### 2. Issue labelled `steward`

- **Trigger:** GitHub → Issue label changed → label `steward` added.
- **Extra line:** `The issue body is the task. Stay on Test. Open a draft PR that closes the issue.`

File work from GitHub → New issue → **Steward task**.

### 3. Failed CI on steward PRs

- **Trigger:** GitHub → CI completed → failure, or Workflow run completed (this repo’s `CI` workflow).
- **Extra line:** `If the failed checks are on a Fruma steward/agent draft PR, fix tests on that branch. Do not touch Demo. If CI is red on main for an unrelated reason, comment and stop.`

## Guardrails to keep on every automation

- Single repository: `Fruma-ai/Fruma`
- Open draft PRs only when `npm test` is green and `nextStewardPull()` (or the issue) is a real Test task
- Memories on (optional) so the weekday steward remembers the last queue id it shipped
- Never enable tools that post to customer Slack until Owen asks

## What Owen still does

Merge or close draft PRs. Reply **Promote** / **Postgres** / **Stop**. Spot-check `/app/test?tab=agents`.

If Automations are not saved, launching a Cloud Agent with `STEWARD_PROMPT` still works — it just needs Owen to start that run.
