# Task 13 — Diff EanNewton's tracker against catalog.ts

## Context

Repo root is `artifacts/all-knowing/`. Read `HANDOFF-CLAUDE.md` and `docs/AWESOME-RESOURCES.md`
first. A research pass already confirmed this job is actionable — read it at the literal relative
path `../../docs/research/ingest-jobs-sources.md` from your current working directory
(`artifacts/all-knowing`); use that exact relative path, don't construct an absolute one (a wrong
absolute-path guess landing outside your working tree silently kills the whole headless run).

The EanNewton progress tracker is a public Google Sheet (URL in that research memo). It's not
machine-API-downloadable the way a repo is — you'll need to fetch it as a public CSV/HTML export
(Google Sheets support a `?output=csv` or similar export URL for publicly shared sheets; work out
the right export URL, or fetch the human-readable page and parse it, whichever actually works)
and note in your report which approach you used.

**Save any downloaded file to `./.scratch/` inside this repo (already gitignored), never
`/tmp`, `%TEMP%`, or any path outside the project.** A prior run of a similar task died after one
`curl`/`Read` call because it wrote to `/tmp` — that's outside your sandboxed working tree, so
the permission system silently auto-rejects it in headless mode and the *entire run* terminates
right there, not just that step. `.scratch/` is inside your working tree and needs no special
permission at all.

## Objective

Compare the sheet's coverage against `src/knowledge/catalog.ts`'s 89 authored facts (24 bosses,
23 graces, 24 items, 8 quests, 10 regions per the research memo — re-verify this count yourself,
it may have shifted since Task 06/12 touched nearby files) and produce a gap report: what's in
the tracker but missing from the catalog, and vice versa.

## Requirements

- Fetch and parse the sheet's actual columns — don't guess its structure, read what's really
  there.
- Normalize names between the two sources the same way `src/lib/aliases.ts` already does
  (lowercase, strip punctuation) before comparing, so "Godrick the Grafted" and "godrick" aren't
  treated as different entries.
- Produce a written report — `docs/research/eannewton-catalog-diff.md` at the outer project
  root (relative path `../../docs/research/eannewton-catalog-diff.md` from your working
  directory) — listing: facts present in the tracker but absent from `catalog.ts` (candidates to
  add), and anything in `catalog.ts` that looks inconsistent with the tracker's naming/region
  assignment (candidates to fix, not necessarily wrong — the tracker isn't authoritative either).
- **Do not auto-add entries to `catalog.ts` in this task.** This is a diff/report task, not an
  ingestion task — the gap report is the deliverable; adding facts based on it is follow-up work
  a human (or a future task) should triage, since not everything a fan tracker lists is worth
  encoding as a fact with implications.
- If the sheet turns out to be unfetchable (access restrictions, no export URL works), say so
  plainly in your report rather than fabricating a diff.

## Explicit exclusions

- No code changes to `catalog.ts`, `aliases.ts`, or any other source file — this is a research/
  report task only.
- Don't build a reusable ingestion script unless it's trivial — the point is the report, not
  infrastructure, this time.

## Acceptance criteria

- `docs/research/eannewton-catalog-diff.md` exists with a clear, structured gap list.
- Report states plainly whether the sheet was successfully fetched and how.
- Final response summarizes the top 5-10 highest-value additions the gap report surfaces (e.g.
  "the tracker has 12 field bosses not yet in catalog.ts" or similar concrete findings), for
  whoever triages this next.
