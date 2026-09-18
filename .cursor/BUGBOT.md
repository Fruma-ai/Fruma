# Bugbot — Fruma review gates

Fail a review (comment, do not merge) if:

- Demo files change without “Promote” in the PR title
- sourceValue is overwritten
- a grant is created from a cookie or approve-all
- a test is deleted to go green
- a new LLM call is added over mill files
- secrets appear in the diff
