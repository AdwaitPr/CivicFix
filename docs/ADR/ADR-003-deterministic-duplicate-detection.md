# ADR-003: Deterministic Duplicate Detection & Human-in-the-Loop Triaging

## Status
Accepted

## Context
Civic reporting platforms regularly experience waves of duplicate submissions following storms or severe pavement deterioration. Automatically deleting or merging duplicate reports without human review leads to data loss, false positive merges, and citizen frustration.

## Decision
1. Implement a deterministic, multi-factor scoring formula:
   $$S_{\text{dup}} = 0.45 \cdot S_{\text{geo}} + 0.40 \cdot S_{\text{text}} + 0.15 \cdot S_{\text{time}}$$
2. Trigger automated flagging in `report_flags` (with status `pending`) when $S_{\text{dup}} \ge 0.450$ or when extreme spatial proximity is detected ($d \le 15\text{m}$ and $\Delta t \le 24\text{h}$).
3. Never automatically delete or merge reports. Provide an authorized moderation queue for human-in-the-loop canonical linking.
4. Provide a pre-submission duplicate preview RPC/endpoint to warn citizens before creating duplicate reports.

## Consequences
- **Positive**: Explainable, deterministic behavior; protects citizen submissions from accidental automated deletion; provides clean deduplication data.
- **Negative**: Requires moderator capacity to review pending duplicate flags.
