# Skill Quality Evaluation Rubric

Score each dimension 0-10. Total maximum: 70.

## 1. Description Trigger Quality (0-10)

The `description` field determines whether the skill activates when needed. It is model-facing, not human-facing.

| Score | Criteria |
|-------|----------|
| 9-10 | Starts with "Use when", includes 3+ specific trigger scenarios, describes problem/symptoms not workflow, under 200 chars |
| 7-8 | Good trigger phrases but missing some scenarios or slightly vague |
| 5-6 | Too generic ("Use when working with X"), or accidentally summarizes the workflow |
| 3-4 | Vague, no concrete triggers, wrong person ("You should use this") |
| 1-2 | One-line generic ("Helps with X") |
| 0 | Missing or empty |

**Red flags**: description summarizes workflow (Claude follows description instead of reading body), second person, over 200 chars, no trigger phrases.

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
| 9-10 | 3+ real failure modes with specific symptoms, causes, and fixes. Based on observed failures, not hypotheticals. |
| 7-8 | Documents some failure modes but missing symptoms or fixes for some |
| 5-6 | Has "common mistakes" but entries are generic |
| 3-4 | Mentions pitfalls in passing, no structured section |
| 1-2 | One vague warning |
| 0 | None |

**What counts**: specific error messages, non-obvious ordering dependencies, platform-specific issues, edge cases that silently produce wrong results.

## 4. Progressive Disclosure (0-10)

| Score | Criteria |
|-------|----------|
| 9-10 | SKILL.md under 2000 words. Detailed material in references/. Clear pointers from SKILL.md to reference files. No duplication. |
| 7-8 | Good separation but SKILL.md slightly long or one reference file missing |
| 5-6 | Everything in SKILL.md but could be split |
| 3-4 | Bloated SKILL.md (5000+ words) with no references |
| 1-2 | Single massive file |
| 0 | Minimal content, not applicable |

**Key check**: Would Claude know reference files exist without listing the directory? SKILL.md must point to them.

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

## Scoring Process

1. Read the complete skill (all files)
2. Score each dimension independently with specific evidence
3. Sum for total score
4. Identify lowest-scoring dimension — this is the priority for the next improvement

| Total | Assessment |
|-------|------------|
| 60-70 | Excellent — focus on polish |
| 50-59 | Good — a few dimensions need work |
| 40-49 | Adequate — multiple dimensions need improvement |
| 30-39 | Below average — significant issues |
| 20-29 | Poor — fundamental problems |
| 0-19 | Needs complete rewrite |
