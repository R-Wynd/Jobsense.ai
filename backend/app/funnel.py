"""Application funnel — turns per-job application_status counts into a Sankey graph.

Single status field limitation: a job stores only its *current* stage / outcome,
not the full path it took. So we reconstruct flows along a canonical funnel tree
using "cumulative reach": a node's inflow = jobs sitting at that node + all jobs
that advanced beyond it.

Canonical tree (parent → children):

    Applied
      ├─ Awaiting          (status: applied — in pipeline, no response yet)
      ├─ Rejected          (status: rejected)
      ├─ Ghosted           (status: ghosted)
      ├─ Withdrew          (status: withdrew — candidate declined / withdrew)
      └─ Round 1           (status: round_1)
         ├─ No Advance     (status: no_advance — interviewed, did not progress)
         └─ Round 2        (status: round_2)
            └─ Round 3      (status: round_3 — "Round N")
               ├─ Pending   (status: pending — awaiting decision)
               └─ Offer     (status: offer)
                  ├─ Offer Accepted  (status: offer_accepted)
                  └─ Offer Declined  (status: offer_declined)

`not_applied` is excluded from the funnel (the candidate hasn't applied yet).
"""

from typing import Optional

# Canonical application statuses (order = pipeline order; drives UI dropdowns too).
FUNNEL_STATUSES = [
    "not_applied",
    "skipped",        # decided NOT to apply — sits outside the funnel
    "applied",
    "round_1",
    "round_2",
    "round_3",
    "no_advance",
    "pending",
    "offer",
    "offer_accepted",
    "offer_declined",
    "rejected",
    "ghosted",
    "withdrew",
]

# No status aliases (skipped is now its own first-class status).
STATUS_ALIASES: dict = {}

# Regex pattern (used by the PATCH schema) covering every accepted status.
STATUS_PATTERN = "^(" + "|".join(FUNNEL_STATUSES + list(STATUS_ALIASES)) + ")$"


def normalize_counts(raw: dict) -> dict:
    """Fold aliases and ensure every known status has an int count."""
    counts = {s: 0 for s in FUNNEL_STATUSES}
    for status, n in (raw or {}).items():
        key = STATUS_ALIASES.get(status, status)
        if key in counts:
            counts[key] += int(n or 0)
    return counts


def build_funnel(raw_counts: dict) -> dict:
    """Return {nodes, links, sankeymatic, counts, totals} from status counts."""
    c = normalize_counts(raw_counts)

    reach_offer = c["offer"] + c["offer_accepted"] + c["offer_declined"]
    reach_r3 = c["round_3"] + c["pending"] + reach_offer
    reach_r2 = c["round_2"] + reach_r3
    reach_r1 = c["round_1"] + c["no_advance"] + reach_r2

    edges = [
        ("Applied", "Awaiting", c["applied"]),
        ("Applied", "Rejected", c["rejected"]),
        ("Applied", "Ghosted", c["ghosted"]),
        ("Applied", "Withdrew", c["withdrew"]),
        ("Applied", "Round 1", reach_r1),
        ("Round 1", "No Advance", c["no_advance"]),
        ("Round 1", "Round 2", reach_r2),
        ("Round 2", "Round 3", reach_r3),
        ("Round 3", "Pending", c["pending"]),
        ("Round 3", "Offer", reach_offer),
        ("Offer", "Offer Accepted", c["offer_accepted"]),
        ("Offer", "Offer Declined", c["offer_declined"]),
    ]
    # Only keep positive flows — zero-value links break Sankey layout.
    links = [{"source": s, "target": t, "value": v} for s, t, v in edges if v > 0]

    # Unique node list, preserving first-seen order across links.
    seen, nodes = set(), []
    for link in links:
        for name in (link["source"], link["target"]):
            if name not in seen:
                seen.add(name)
                nodes.append({"name": name})

    sankeymatic = "\n".join(
        f'{l["source"]} [{l["value"]}] {l["target"]}' for l in links
    )

    applied_total = (
        c["applied"] + c["rejected"] + c["ghosted"] + c["withdrew"] + reach_r1
    )
    totals = {
        "applied_total": applied_total,
        "not_applied": c["not_applied"],
        "in_progress": c["applied"] + reach_r1 - c["no_advance"]
        - c["offer_accepted"] - c["offer_declined"],
        "interviews": reach_r1,
        "offers": reach_offer,
        "rejected": c["rejected"],
        "ghosted": c["ghosted"],
        "skipped": c["skipped"],
    }

    return {
        "nodes": nodes,
        "links": links,
        "sankeymatic": sankeymatic,
        "counts": c,
        "totals": totals,
    }
