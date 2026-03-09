---
name: skill-creator
description: Helps the user create a new skill by generating the directory structure and SKILL.md file.
---

# Skill Creator

This skill helps you create a new skill in the current project.

To create a new skill, follow these steps:

1.  **Identify the location**: Skills can be stored in three places:
    - **Project Skills**: `.wave/skills/<skill-name>/` (shared with the team via git).
    - **Personal Skills**: `~/.wave/skills/<skill-name>/` (available across all your projects).
    - **Plugin Skills**: `<plugin-root>/skills/<skill-name>/` (where `<plugin-root>` is any directory containing `.wave-plugin/plugin.json`).
2.  **Create the skill directory**: Create a directory for the skill in one of the locations above.
3.  **Create SKILL.md**: Create a `SKILL.md` file with YAML frontmatter and Markdown content.

### SKILL.md Template

```markdown
---
name: my-skill-name
description: A brief description of what the skill does and when the AI should use it.
allowed-tools:
  - Bash(git add*)
  - Bash(git status*)
  - Bash(git commit*)
  - Read
  - Write # Optional: Restrict tools available to the AI
context: fork # Optional: Run in a separate subagent
agent: general-purpose # Optional: Specify agent type for fork context
model: gpt-4o # Optional: Override model for skill execution
disable-model-invocation: false # Optional: Set to true to prevent AI from auto-triggering
user-invocable: true # Optional: Set to false to hide from / menu
---

# My Skill Name

Instructions for the AI on how to perform this skill.
You can use placeholders like $1, $2, or $ARGUMENTS for manual invocation.
You can also execute bash commands using !`command` syntax.
```

### Supporting Files (Optional)

You can add other files in the same directory and reference them in `SKILL.md`. The AI will read them only when needed.

```
.wave/skills/my-skill-name/
├── SKILL.md
├── template.txt
└── helper.py
```

When the user asks to create a skill, you should:
1. Ask for the skill name and the desired location (Project, Personal, or Plugin).
2. If it's a Plugin skill, ask for the plugin root directory (which must contain `.wave-plugin/plugin.json`).
3. Create the directory structure.
4. Generate the `SKILL.md` based on the user's requirements.
5. Create any supporting files if needed.
