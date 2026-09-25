# Data Model: Agent Behavior Test Tool

| Entity | Fields and rules |
|---|---|
| `BehaviorTestRequest` | Required `prompt` (1–12,000 chars); optional inline `instructions` (≤32,000), `instruction_paths` (≤20 normalized relative paths, ≤1,024 each), and assertions. Paths are hints only: contents are never injected. |
| `AssertionRequest` | Optional `required_terms`, `forbidden_terms`, `required_patterns`; max 20 values per list; invalid patterns reject the request. |
| `AssertionResult` | `kind`, `value`, `passed`; exactly one result per requested assertion. |
| `ToolTrace` | `name`, JSON-safe `arguments`, `execution` (`real`/`dry_run`), `outcome` (`success`/`error`/`simulated_success`), `application_status` (`not_applicable`/`not_applied`), sanitized preview. |
| `ProposedChange` | Required `summary`, `rationale`, `suggested_change`; never applied. |
| `BehaviorTestReport` | `status` (`completed`/`failed`/`invalid_test_response`), valid final `response`, non-empty `proposed_changes` when completed, assertions, ordered trace, resolved model, duration and safe error. |

Lifecycle: `validated → bootstrapped → running → completed | invalid_test_response | failed → discarded`. All values are in-memory only.
