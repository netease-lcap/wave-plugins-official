# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `./spec.md`

**Note**: This template is filled in by the `/plan` command.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project.
-->

**Language/Version**: [e.g., Python 3.11, TypeScript 5.0, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, React, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, Redis, files or N/A]  
**Testing**: [e.g., pytest, Vitest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, Browser, WASM or NEEDS CLARIFICATION]
**Project Type**: [e.g., CLI, Web, Mobile, Library]  
**Performance Goals**: [e.g., <200ms response time, 1000 req/s or N/A]  
**Constraints**: [e.g., <100MB memory, offline-capable or N/A]  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

**REQUIRED**: All planning phases MUST align with the project constitution. All implementation tasks SHOULD be clearly defined and testable.
- All planning phases MUST be performed using the **general-purpose agent** to reduce context costs of the main agent.

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command) - USER FACING
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command)
```

**Note on quickstart.md**: This file MUST be written for the end-user. Focus on "How to use this feature".

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature.
-->

```
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/
```

**Structure Decision**: [Document the selected structure]

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., New dependency] | [current need] | [why existing tools are insufficient] |
