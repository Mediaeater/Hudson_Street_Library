---
name: improve-skill
description: Use when the user invokes /improve-skill with a skill path to autonomously iterate on that skill's quality through research, modification, rubric scoring, and git-tracked keep/discard decisions
disable-model-invocation: true
---

# Improve Skill — Autonomous Research Loop

Iteratively improve a Claude Code skill using the autoresearch pattern: read → research → change → score → keep or discard → log → repeat.

## Setup Phase

### 1. Resolve Target Skill

```
SKILL_DIR = resolve($ARGUMENTS)
SKILL_MD  = $SKILL_DIR/SKILL.md
```

If `SKILL.md` does not exist at the resolved path, stop and report the error.

### 2. Extract Skill Name

Parse the `name` field from SKILL.md YAML frontmatter. Use it for branch naming and logging.

### 3. Create Working Branch

```bash
git checkout -b improve-skill/$SKILL_NAME
```

If the branch already exists, check it out and read `results.tsv` to resume from where the previous session left off.

### 4. Read Full Skill Context

Read every file in the skill directory: SKILL.md, all files in references/, scripts/, examples/, assets/. Build a complete understanding of what the skill does, how it triggers, what resources it bundles, and where it falls short.

### 5. Initialize Results Log

If `$SKILL_DIR/results.tsv` does not exist, create it with header:

```
iteration	commit	score_before	score_after	delta	status	change_description
```

If it exists, read it to understand previous iterations and avoid repeating failed approaches.

### 6. Score Baseline

Score the skill against the rubric in `references/rubric.md` (7 dimensions, 0-10 each, max 70). Record as iteration 0 with status `baseline`.

## Autonomous Loop

**NEVER STOP.** Do NOT pause to ask the human if you should continue. Do NOT ask "should I keep going?" or "is this a good stopping point?" The loop runs until the human interrupts you, period.

### Step 1: Identify ONE Improvement

Pick exactly one change. Follow this priority order:

1. **Critical structural issues** — missing frontmatter fields, broken file references, empty sections
2. **Description quality** — trigger phrases missing, too vague, summarizes workflow instead of stating trigger conditions
3. **Instruction specificity** — vague instructions ("consider doing X") → concrete steps
4. **Gotchas and failure modes** — research real failure points via web search or codebase grep
5. **Progressive disclosure** — content that should move to references/, or references that should exist
6. **Script opportunities** — repeated operations that should be executable scripts
7. **Token efficiency** — reduce word count while preserving information density

**Research methods:**
- **Domain best practices**: WebSearch for current practices in the skill's domain
- **Codebase patterns**: Grep/Glob for patterns in the repository the skill should know about
- **Failure modes**: Search for common errors, edge cases, gotchas related to the skill's domain
- **Other skills**: Read other skills in `.claude/skills/` for structural patterns to adopt

### Step 2: Apply the Change

Make the single change. Keep the diff small and reviewable. One concept per iteration.

**Constraint: Only modify files inside `$SKILL_DIR`.** If an improvement requires changes outside, log it as `RECOMMENDATION:` in the TSV description but do not apply it.

### Step 3: Commit

```bash
git add $SKILL_DIR/
git commit -m "improve-skill: [brief description]"
```

Capture the short commit hash (7 chars).

### Step 4: Evaluate

Re-score the skill against the full rubric. Calculate:
- `score_before`: previous iteration's score (or baseline)
- `score_after`: score after this change
- `delta`: score_after - score_before

### Step 5: Keep or Discard

**Keep** if delta > 0, or delta == 0 AND the change improves readability/structure without losing information.

**Discard** if delta < 0:
```bash
git reset --hard HEAD~1
```

### Step 6: Log Result

Append to `$SKILL_DIR/results.tsv`:

```
{iteration}	{commit}	{score_before}	{score_after}	{delta}	{keep|discard}	{description}
```

### Step 7: Continue

Increment iteration counter. Return to Step 1.

If obvious improvements are exhausted, shift to:
- Deeper domain research via web search
- Cross-referencing other skills for structural ideas
- Testing description trigger quality by imagining user queries
- Compressing verbose sections for token efficiency
- Adding concrete examples where abstract instructions exist

## Safeguards

**Scope restriction**: Only modify files within `$SKILL_DIR`.

**Oscillation avoidance**: If the same change category has been discarded twice consecutively, skip that category and move to the next priority.

**Preserve intent**: Never change the fundamental purpose of the skill. Improvements make the skill better at what it already does.

**Respect existing quality**: If a dimension scores 8+, skip it and focus on weaker dimensions.

## Session Summary

When the human interrupts the loop, report:

1. **Iterations completed**: total count
2. **Net score change**: final score minus baseline
3. **Changes kept**: list with brief descriptions
4. **Changes discarded**: list with brief reasons
5. **Remaining opportunities**: what would improve next
6. **Branch status**: branch name and commits ahead of main

## Reference Files

- `references/rubric.md` — complete 7-dimension quality evaluation rubric with scoring criteria
