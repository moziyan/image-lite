# ImageLite AI Agent Development Guide

## 1. Mission

You are a coding agent working on ImageLite.

Your job is to implement the requested task while preserving the existing architecture and product constraints.

Do not redesign the entire application unless explicitly requested.

## 2. Source of Truth

Read in this order:

1. `PRODUCT.md`
2. `ARCHITECTURE.md`
3. `DEVELOPMENT.md`
4. `TASKS.md`
5. Existing source code
6. Existing tests
7. Current git diff/status

If code and documentation disagree:

- prefer the currently implemented public behavior only when it is intentional and tested
- otherwise update the documentation and implementation consistently
- never silently introduce a third interpretation

## 3. Task Discipline

Only implement the current task.

Do not:

- add unrelated features
- perform broad refactors
- replace the UI library
- replace the architecture
- introduce a backend
- add dependencies without justification

If a prerequisite is missing:

1. identify it
2. implement the smallest prerequisite
3. continue only if it does not expand scope materially

## 4. Before Editing

Inspect:

- package.json
- source tree
- relevant components/services
- tests
- git status
- current task in TASKS.md

Then state a short implementation plan internally or in the agent report.

## 5. Coding Rules

- TypeScript strict
- Prefer explicit types for public APIs
- Avoid `any`
- Prefer pure functions for calculations
- Keep components focused
- Extract reusable logic into composables/services
- Keep binary processing outside UI components
- Keep encoder implementations behind interfaces
- Use discriminated unions for Worker messages
- Centralize limits/configuration

## 6. Vue Rules

Components:

- display state
- emit intent
- avoid image-processing implementation

Composable:

- coordinate reactive UI behavior

Store:

- application state

Service:

- business capability

## 7. Image Processing Rules

- Validate before processing.
- Resize before final encoding.
- Do not upscale by default.
- Do not apply lossy quality semantics to PNG.
- Release ImageBitmap resources.
- Revoke Object URLs.
- Avoid retaining redundant large buffers.
- Do not process an entire large batch concurrently.

## 8. Worker Rules

Any operation that can block the UI for a meaningful amount of time belongs in a Worker.

Worker:

- accepts typed requests
- returns typed responses
- reports progress
- supports cancellation
- does not manipulate Vue state

## 9. Dependencies

Before adding a dependency:

1. Check whether the browser/platform already provides the capability.
2. Check whether the feature belongs in an existing layer.
3. Explain why the dependency is needed.
4. Prefer small, maintained dependencies.
5. Do not add dependencies merely for convenience.

## 10. Testing Requirements

Every non-trivial feature needs tests.

At minimum:

- pure logic -> unit test
- service behavior -> integration/unit test
- user flow -> E2E test when practical

Do not remove failing tests to make a task pass.

## 11. Validation Commands

Use the project's actual scripts. Prefer having these scripts:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

If a script is unavailable, either use the closest configured command or add the script if that is part of the current setup task.

## 12. Definition of Done

A task is done only when:

- requested behavior works
- TypeScript passes
- lint passes
- relevant tests pass
- build passes
- no obvious resource leak was introduced
- documentation is updated if architecture/public behavior changed

## 13. Reporting

After each task, report:

```text
## Completed
- ...

## Files changed
- ...

## Tests
- typecheck: PASS/FAIL
- lint: PASS/FAIL
- unit/integration: PASS/FAIL
- build: PASS/FAIL

## Notes
- ...

## Next task
- ...
```

## 14. When Blocked

Do not invent APIs or pretend a capability exists.

If blocked:

- identify the exact blocker
- inspect available package/browser APIs
- propose the smallest resolution
- stop before introducing speculative architecture

## 15. UI Quality

The application should feel like a finished utility, not a developer demo.

Check:

- empty states
- loading states
- errors
- disabled states
- mobile layout
- keyboard operation
- long file names
- large numbers
- slow processing
- cancellation

## 16. Performance Quality

Never optimize by guesswork when profiling is available.

First:

- reproduce
- measure
- identify bottleneck
- optimize
- measure again

## 17. Privacy Quality

Never introduce a network request containing image bytes unless the product specification is explicitly changed.

Do not put user image data into:

- analytics
- logs
- URL query strings
- localStorage

## 18. Git Hygiene

Use focused commits where requested.

Commit prefixes:

- `feat:`
- `fix:`
- `refactor:`
- `test:`
- `docs:`
- `perf:`
- `chore:`

Do not rewrite unrelated user changes.
