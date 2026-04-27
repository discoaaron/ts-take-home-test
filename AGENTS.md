# AI Agent Guidelines

Rules for any AI agent working in this repository.

## Rule 1 — TDD: Tests before implementation

All plans **must** follow a test-driven development workflow:

1. Write failing tests first that describe the expected behaviour of the new
   code (unit tests for operations, component tests for UI changes).
2. Commit the failing tests.
3. Implement the feature or fix until all tests pass.
4. Commit the implementation separately.

Do not write implementation code before there is at least one failing test
covering the new behaviour.

## Rule 2 — Keep documentation current after every change

After implementing a plan or fixing a bug:

1. Update the relevant file under `docs/bugs/` to mark each fixed bug with
   `**Status:** ✅ Fixed — commit <sha>` (or `⏳ Not yet addressed` if
   intentionally deferred).
2. Update `docs/plan.md` to record that the plan has been implemented,
   including the commit SHA and date.

This must happen in the same PR/commit batch as the implementation — not as a
follow-up.
