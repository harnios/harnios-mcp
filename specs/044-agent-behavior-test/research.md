# Research: Agent Behavior Test Tool

## Decisions

- **Share chat execution inputs**: use the existing resolver, base context, in-process MCP client, live enabled catalog and five-step loop. This prevents model/tool drift; calling the streaming HTTP route would not permit per-call safety interception.
- **Intercept at AI SDK tool execution**: discover schemas from the real MCP client, but replace execution callbacks with a behavior-test bridge. A separate fake MCP server would duplicate live registration and collision logic.
- **Classify conservatively**: execute only known native informational tools; intercept mutators and every external proxy. External descriptions cannot safely prove lack of effects.
- **Require final JSON**: `{ response, proposed_changes }` supports deterministic consumption; malformed output fails rather than being invented. A second evaluator model is out of scope.
- **Test deterministic helpers and manual MCP flow**: no test runner exists today, so isolate validation, classification, parsing and assertions for future unit coverage and verify end-to-end with quickstart.
