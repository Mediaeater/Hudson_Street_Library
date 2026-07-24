# Skill Quality Evaluation Rubric

Score each dimension 0-10. Total maximum: 80.

**Dimension weights.** Not all dimensions matter equally. Dimensions 1 and 8 gate whether the skill functions at all; dimensions 6-7 are polish. When two skills score the same total, the one with higher scores on gating dimensions is better.

| Priority | Dimensions | Why |
|----------|-----------|-----|
| Gating | 1 (Description), 8 (Tool Awareness) | Skill won't fire or will fail silently |
| Core | 2 (Specificity), 3 (Gotchas), 7 (Flexibility) | Determines output quality |
| Structure | 4 (Disclosure), 5 (Completeness) | Affects maintainability and token cost |
| Polish | 6 (Writing) | Nice to have, rarely the bottleneck |

## 1. Description Trigger Quality (0-10)

The `description` field determines whether the skill activates when needed. It is model-facing, not human-facing.

| Score | Criteria |
|-------|----------|
| 9-10 | Opens with a trigger condition (not a workflow summary). 3+ specific trigger scenarios describing problems/symptoms. Under 200 chars. |
| 7-8 | Good trigger phrases but missing some scenarios or slightly vague |
| 5-6 | Too generic ("Use when working with X"), or accidentally summarizes the workflow |
| 3-4 | Vague, no concrete triggers, wrong person ("You should use this") |
| 1-2 | One-line generic ("Helps with X") |
| 0 | Missing or empty |

**Red flags**: description summarizes workflow (Claude follows description instead of reading body), second person, over 200 chars, no trigger phrases.

**Valid openers**: "Use when...", "Triggers on...", "Use when a [problem]...", or any phrasing that states the trigger condition rather than describing the workflow.

## 2. Instruction Specificity (0-10)

| Score | Criteria |
|-------|----------|
| 9-10 | Every instruction is concrete and actionable. Commands copy-pasteable. Steps have clear inputs/outputs. No ambiguity about "done". |
| 7-8 | Most specific, a few use vague language ("consider", "as appropriate") |
| 5-6 | Mix of specific and vague |
| 3-4 | Mostly vague guidance ("Think about X", "Consider Y") |
| 1-2 | Almost entirely abstract |
| 0 | No instructions |

**Test**: Can each step be executed without guessing? Are conditionals explicit ("If X, do A. Otherwise, do B.")?

## 3. Gotchas and Failure Modes (0-10)

| Score | Criteria |
|-------|----------|
| 9-10 | Covers the critical failure paths with specific symptoms, causes, and fixes. Based on observed failures, not hypotheticals. At least 3 entries as a floor, not a target. |
| 7-8 | Documents some failure modes but missing symptoms or fixes for some |
| 5-6 | Has "common mistakes" but entries are generic |
| 3-4 | Mentions pitfalls in passing, no structured section |
| 1-2 | One vague warning |
| 0 | None |

**What counts**: specific error messages, non-obvious ordering dependencies, platform-specific issues, edge cases that silently produce wrong results. Three well-chosen gotchas covering critical paths beat nine hypothetical ones.

## 4. Progressive Disclosure (0-10)

| Score | Criteria |
|-------|----------|
| 9-10 | SKILL.md contains the workflow; detailed reference material lives in references/. Clear pointers from SKILL.md to reference files. No duplication between files. |
| 7-8 | Good separation but one reference file missing or slight duplication |
| 5-6 | Everything in SKILL.md but could be split |
| 3-4 | Bloated SKILL.md with no references |
| 1-2 | Single massive file |
| 0 | Minimal content, not applicable |

**Key check**: Would Claude know reference files exist without listing the directory? SKILL.md must point to them.

**No fixed word count.** A deployment skill with 15 steps across 3 environments genuinely needs more surface area than a formatting skill. Judge by whether content is in the right place, not by an arbitrary threshold.

## 5. Structural Completeness (0-10)

| Score | Criteria |
|-------|----------|
| 9-10 | Valid YAML frontmatter (name + description). Overview section. Clear workflow/steps. Quick reference or summary. Common mistakes section. All referenced files exist. |
| 7-8 | Has required sections, missing one recommended |
| 5-6 | Frontmatter present but missing recommended sections |
| 3-4 | Frontmatter issues. Body poorly organized. |
| 1-2 | Barely functional |
| 0 | Missing SKILL.md or invalid format |

**Required**: YAML frontmatter with `name` and `description`, purpose/overview, core instructions.
**Recommended**: quick reference table, common mistakes, when to use / when NOT to use, examples.

## 6. Writing Quality (0-10)

| Score | Criteria |
|-------|----------|
| 9-10 | Imperative form throughout. No filler. Every sentence adds information. Good use of tables. Consistent formatting. |
| 7-8 | Mostly imperative, occasional second person, minor verbosity |
| 5-6 | Mixed voice, some filler, readable but not token-efficient |
| 3-4 | Second person throughout ("You should..."), verbose |
| 1-2 | Reads like a blog post, not instructions |
| 0 | Incoherent |

**Checks**: "Do X" not "You should do X". Tables over paragraphs for structured data. No "essentially", "basically", "it's worth noting".

## 7. Flexibility vs Railroading (0-10)

| Score | Criteria |
|-------|----------|
| 9-10 | Default approach with clear criteria for when to deviate. Acknowledges context-dependent decisions. No unnecessary steps forced. |
| 7-8 | Good default path, one or two unnecessarily rigid requirements |
| 5-6 | Somewhat rigid. Steps mandatory when they should be conditional. |
| 3-4 | Very prescriptive. One path regardless of context. |
| 1-2 | So rigid it produces wrong results in common edge cases |
| 0 | No workflow present or so vague it provides no guidance |

**Balance test**: Would this skill work for both a simple and complex instance of the task?

## 8. Tool & Integration Awareness (0-10)

Skills execute inside Claude Code, which has specific tools (Bash, Read, Edit, Write, Glob, Grep, WebSearch, WebFetch, Agent, etc.). A skill that ignores tool constraints will fail silently.

| Score | Criteria |
|-------|----------|
| 9-10 | References correct tool names where actions require them. Accounts for tool constraints (e.g., Edit requires Read first, Bash for shell commands only). No phantom tools. |
| 7-8 | Mostly correct, one tool reference missing or slightly wrong |
| 5-6 | Mentions tools generically ("search for files") without naming them |
| 3-4 | Assumes tools that don't exist, or ignores tool constraints |
| 1-2 | No awareness of execution environment |
| 0 | Skill cannot execute as written |

**What counts**: naming specific tools (Grep not "grep the codebase"), noting tool prerequisites (Read before Edit), using Bash only for operations without dedicated tools, awareness of WebFetch vs WebSearch distinction.

**When N/A**: Simple skills that don't reference specific tools (e.g., a writing-style guide) can score 8+ by default — the dimension measures correctness of tool references that exist, not requiring tool references that aren't needed.

## Scoring Process

1. Read the complete skill (all files)
2. Score each dimension independently. **Cite one specific line, section, or quote as evidence per dimension** to prevent drift.
3. Sum for total score (max 80)
4. Identify lowest-scoring gating/core dimension — this is the priority for the next improvement

**Inter-rater calibration.** Re-read this rubric at least every 5 iterations. Scores trend upward without re-calibration; the evidence requirement in step 2 is the primary defense against drift.

| Total | Assessment |
|-------|------------|
| 68-80 | Excellent — focus on polish |
| 56-67 | Good — a few dimensions need work |
| 44-55 | Adequate — multiple dimensions need improvement |
| 32-43 | Below average — significant issues |
| 20-31 | Poor — fundamental problems |
| 0-19 | Needs complete rewrite |
