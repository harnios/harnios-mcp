# Contract: `test_agent_behavior` MCP Tool

## Input

```json
{
  "prompt": "Assess a process-change request.",
  "instructions": "Optional unsaved instruction text.",
  "instruction_paths": ["os/skills/review/SKILL.md"],
  "assertions": {
    "required_terms": ["proposta"],
    "forbidden_terms": ["ho modificato"],
    "required_patterns": ["processo"]
  }
}
```

The tool follows current MCP authentication and enabled-tool gating. `prompt` is required. Only the normal trusted base `AGENTS.md` is preloaded; path contents are retrieved by model tool calls.

## Result

MCP text content serializes `BehaviorTestReport` from [data-model.md](../data-model.md). Successful reports have a final response, non-empty proposal, one assertion result per input, and an ordered tool trace.

Every trace identifies actual vs `dry_run` and carries `application_status`. A dry-run is `simulated_success` for the model and `application_status: "not_applied"` in the report; actual read calls use `not_applicable`.

## Safe errors

`invalid_input`, `chat_unavailable`, `provider_unreachable`, `test_timeout`, `agents_bootstrap_failed`, or `invalid_test_response`. Errors exclude credentials, tokens, external URLs, stack traces and inaccessible file content.

## Invariants

1. Same model, Harnios base context, enabled schemas and bootstrap as chat.
2. All enabled native/external schemas visible to the model.
3. Only known native informational tools run; all mutating and external calls are intercepted before effects.
4. No request/report persistence.
