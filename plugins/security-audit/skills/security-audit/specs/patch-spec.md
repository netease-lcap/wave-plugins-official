# Patch spec — what the patch job leaves on disk

The suggest-patches job writes only inside `<scan dir>/patches/`, and only after a finding has passed both
gates below. Everything else about that job (finding the report, the selection menu, the scratch copy, the
reviewer and the challenger) is the job's business; this file is the product contract.

## Two gates before anything is written

1. **The finding is still current.** For a git repository `git hash-object <file>` must equal
   `findings[].revision.blobSha`; otherwise the file's `size` / `mtime` must match `revision.size` /
   `revision.mtime`. A mismatch means the code changed since the scan: that finding is **skipped** and needs
   a re-scan — a patch written against code that no longer exists is worse than none. Findings that still
   match go on.
2. **A panel of two independent agents vouched for it.** The reviewer must return `verdict: "approve"` with
   all three checks `ok: true` — a reviewer that could not run tests has stated a limitation, not given an
   approval, and `uncertain` is never upgraded into a pass. The challenger must report no path that counts,
   where a path counts unless it labelled it `set_aside`. One without the other is not a pass, and a panel
   member that did not report is not a pass either: a patch is written only when the whole panel has
   vouched for it. No pass → no patch file, just the note.

## `patches/F<n>.patch` — only for a finding the panel passed

The diff of the scratch copy against the recorded revision, captured with `git -C <scratch> diff` and written
out with the Write tool (never redirected). It must apply from the repository root with:

```
git apply <scan dir>/patches/F<n>.patch
```

The patch is never applied by the job — not in the user's tree, not in the scratch copy after capture.

## `patches/F<n>.md` — always written, for every finding that reached the drafting step

- the finding id / severity / title and its location
- what the patch changes, and which existing mechanism it reuses
- how it was verified: the exact test command and its result, whether the project's own suite covers the
  changed code (say so when it does not), the independent reviewer's verdict and reasoning, and the attack
  paths the challenger reported — each in the challenger's own words with its label, or the fact that the
  challenge did not come back
- any residual risk or behavior change
- **how to apply it** (`git apply <scan dir>/patches/F<n>.patch`) and that applying is the user's decision
- the recorded revision it was built against

When no patch was produced, the note says so in its **first line**, gives the reason, and says what the real
fix would require.

## `patches/PATCHES.md` — the one-page index, always written

The one file a reader opens first, and the only place the folder is summarized. It holds, and nothing else:

- one line saying what the folder is and that **nothing in it has been applied**;
- how to apply: `git apply <scan dir>/patches/F<n>.patch` from the repository root, one patch at a time;
- a table with one row per finding that reached the drafting step, in id order —
  `id | severity | title | outcome | why`, where `outcome` is `patched` or `no patch`, and `why` is one line:
  what the patch changes when it was written, or why not when it was not (`the code changed since the scan`,
  or the blocking reason in one line — the reviewer's, or the path the challenger found);
- on each `patched` row, the trust label: **verified by a panel of agents** — and, when no test in the
  project's own suite exercises the changed code, that the panel's confidence rests on review rather than on
  a test run, said in words, because that is the one caveat a reader must not miss.

The label a reader sees is always the panel's verdict. Never write "tested" or "untested" as the label — a
patch is not vouched for by a test run, it is vouched for by a panel that may or may not have had one.

## Reporting

The closing report names which findings got a patch and which did not (one-line reason each), the exact paths
under `patches/` including `PATCHES.md`, that **nothing has been applied**, and the command to apply one. It
says each patch was verified by a panel of agents, naming which of them rest on review rather than on a
project test run. The job does not offer to apply them.
