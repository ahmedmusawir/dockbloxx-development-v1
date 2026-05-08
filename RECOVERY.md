# Recovery State

Last action: ESLint configured with strict ruleset (`.eslintrc.json` extends `next/core-web-vitals` + `next/typescript`). Baseline lint run captured: 133 errors + 51 warnings across the codebase. No source files modified, no deps added. Triage report delivered to Tony.
Pending: Tony deciding which lint warnings to address now vs defer. One real bug flagged for awareness — `DealerCouponClientBlock.tsx:42` rules-of-hooks violation (pre-existing, not from our dealer fix).
Next step: Awaiting Tony's call on next move (lint cleanup task, dealer-fix manual test, commit, or new direction).
