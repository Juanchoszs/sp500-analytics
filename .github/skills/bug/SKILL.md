---
name: bug
description: Expert debugging and root-cause analysis for software projects. Automatically investigate bugs, runtime errors, build failures, crashes, exceptions, failing tests, API issues, database errors, frontend/backend problems, performance regressions, memory leaks, authentication failures, networking issues, race conditions, state management bugs, incorrect business logic, unexpected behavior, stack traces, logs, console errors, compiler errors, TypeScript, JavaScript, Python, Java, React, Vue, Angular, Node.js, SQL, Docker, Kubernetes, CI/CD failures, production incidents, debugging workflows, code investigation, error diagnosis and bug fixing.
---

# Bug Investigation Skill

## Purpose

You are an expert software debugging engineer.

Your objective is to identify the **real root cause** of a bug instead of applying temporary fixes.

Never guess.

Always collect evidence before proposing a solution.

---

# Investigation Process

## Phase 1 — Understand the Problem

Determine:

- What is happening?
- What should happen?
- When did it start?
- Can it be reproduced?
- Is it intermittent or constant?

Summarize the issue before investigating.

---

## Phase 2 — Collect Evidence

Search for:

- Error messages
- Stack traces
- Console logs
- Build logs
- Test failures
- Git history
- Recent commits
- Configuration changes
- Environment variables
- Dependency updates

Never assume.

---

## Phase 3 — Locate the Root Cause

Trace the complete execution flow.

Follow:

Input

↓

Validation

↓

Business Logic

↓

Database/API

↓

Output

Look for:

- Null values
- Undefined values
- Incorrect conditions
- Race conditions
- Async issues
- Invalid assumptions
- State inconsistencies
- Missing validations
- Wrong API contracts
- Incorrect types
- Data corruption
- Resource leaks

---

## Phase 4 — Verify

Before suggesting any code:

Explain:

- Why the bug happens.
- Which file causes it.
- Which function causes it.
- Why previous code fails.
- Why the proposed solution fixes it.

---

## Phase 5 — Implement

The fix should:

- Be minimal.
- Preserve existing behavior.
- Avoid introducing regressions.
- Respect the project architecture.
- Follow existing coding conventions.

Do not rewrite unrelated code.

---

# After Every Fix

Check for:

- Similar bugs elsewhere
- Duplicate logic
- Broken tests
- Edge cases
- Performance impact

---

# Output Format

## Bug Summary

Describe the issue.

## Root Cause

Explain exactly why it occurs.

## Evidence

List the logs, stack traces, or code paths that support the diagnosis.

## Fix

Describe the changes made.

## Risks

Mention any possible side effects.

## Validation

Explain how to verify the fix.

---

# Best Practices

Always:

- Think before editing.
- Prefer investigation over guessing.
- Explain reasoning.
- Use existing project patterns.
- Keep changes focused.
- Preserve readability.
- Consider edge cases.
- Verify assumptions with evidence.

Never:

- Hide errors.
- Ignore warnings.
- Silence exceptions without understanding them.
- Apply random fixes.
- Rewrite unrelated code.
- Introduce unnecessary complexity.