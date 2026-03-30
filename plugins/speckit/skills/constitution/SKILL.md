---
name: constitution
description: Create or update the project constitution to define core principles and non-negotiable rules for the project.
disable-model-invocation: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

You are creating or updating the project constitution at !`node -e "console.log(require('fs').existsSync('.specify/memory/constitution.md') ? require('path').resolve('.specify/memory/constitution.md') : '.specify/memory/constitution.md')"`. This document defines the core principles, technical standards, and non-negotiable rules for the project.

Follow this execution flow:

1. **Load or Initialize**:
   - Load the constitution from !`node -e "console.log(require('fs').existsSync('.specify/memory/constitution.md') ? require('path').resolve('.specify/memory/constitution.md') : '${WAVE_SKILL_DIR}/../../memory/constitution.md')"`.
   - Identify placeholders like `[PROJECT_NAME]`, `[PRINCIPLE_NAME]`, etc.

2. **Collect Principles**:
   - Use user input to define or update core principles.
   - If no principles are provided, suggest common ones (e.g., "Type Safety", "Test Coverage", "Documentation Minimalism").
   - Each principle should have a **Name**, a **Description** (the rule), and a **Rationale** (the why).

3. **Draft Content**:
   - Replace placeholders with concrete values.
   - Ensure principles are declarative and testable (use MUST/SHOULD).
   - Keep the structure simple: Header, Principles, and a basic Governance section.

4. **Sync Templates (Optional but Recommended)**:
   - Briefly check if updated principles affect `${WAVE_SKILL_DIR}/../../templates/` (spec, plan, or tasks).
   - If a principle mandates a new section (e.g., "Security Analysis"), ensure templates reflect this.

5. **Finalize**:
   - Update the version and dates (ISO format YYYY-MM-DD).
   - Write the completed constitution to !`node -e "console.log(require('fs').existsSync('.specify/memory/constitution.md') ? require('path').resolve('.specify/memory/constitution.md') : '.specify/memory/constitution.md')"`.
   - Provide a summary of changes and a suggested commit message.

## Principles Guidelines

- **Declarative**: State what MUST or SHOULD be done.
- **Testable**: A reviewer should be able to verify if a principle is followed.
- **Concise**: Focus on high-impact rules that prevent common project-specific issues.
- **Adaptive**: Principles should be relevant to the project's specific context and goals.
