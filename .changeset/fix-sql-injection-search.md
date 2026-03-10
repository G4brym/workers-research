---
"workers-research": patch
---

Fix SQL injection vulnerability in research list search endpoint by replacing string interpolation with parameterized queries using workers-qb's built-in parameter binding.
