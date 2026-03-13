---
"workers-research": patch
---

Add safeJsonParse utility to prevent 500 errors from malformed database JSON columns. Replaced bare JSON.parse() calls in route handlers with a safe wrapper that returns a fallback value instead of throwing on invalid JSON.
