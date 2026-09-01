#!/usr/bin/env python3
"""Print one Tembro agent turn as a readable diary: reasoning, Live calls, outcome.

Reads the production D1 events through wrangler (read-only). Developer tool,
never part of the product.

    tools/tembro_turn_log.py            # the most recent turn
    tools/tembro_turn_log.py <requestId> # a specific turn
    tools/tembro_turn_log.py --list      # the last 10 turns with their ids
"""

from __future__ import annotations

import json
import subprocess
import sys
import textwrap
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parent.parent / "server"


def query(sql: str) -> list[dict]:
    proc = subprocess.run(
        ["npx", "wrangler", "d1", "execute", "tembro", "--remote", "--json", "--command", sql],
        cwd=SERVER_DIR,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        sys.exit(f"wrangler failed:\n{proc.stderr.strip()}")
    return json.loads(proc.stdout)[0]["results"]


def load(row: dict) -> dict:
    row["payload"] = json.loads(row["payload"])
    return row


def list_turns() -> None:
    rows = query(
        "SELECT id, created_at, user_id, payload FROM events "
        "WHERE kind = 'agent.started' ORDER BY id DESC LIMIT 10"
    )
    for row in map(load, rows):
        p = row["payload"]
        print(f"{row['created_at']}  {p['requestId']}  user {row['user_id'][:8]}  "
              f"skill {p.get('skill') or '-'}  cost {p.get('creditCost')}")


def show_turn(request_id: str | None) -> None:
    where = f"json_extract(payload,'$.requestId') = '{request_id}'" if request_id else "1=1"
    started = query(
        f"SELECT id, created_at, user_id, payload FROM events "
        f"WHERE kind = 'agent.started' AND {where} ORDER BY id DESC LIMIT 1"
    )
    if not started:
        sys.exit("no such turn")
    start = load(started[0])
    request_id = start["payload"]["requestId"]
    user_id = start["user_id"]

    ended = query(
        f"SELECT id FROM events WHERE kind IN ('agent.completed','agent.failed') "
        f"AND json_extract(payload,'$.requestId') = '{request_id}' ORDER BY id ASC LIMIT 1"
    )
    # Live calls are client events without a requestId: take everything the
    # same user logged between this turn's start and its end (or now).
    upper = f"AND id <= {ended[0]['id']}" if ended else ""
    rows = query(
        f"SELECT id, kind, created_at, payload FROM events "
        f"WHERE user_id = '{user_id}' AND id >= {start['id']} {upper} ORDER BY id ASC"
    )

    print(f"# Turn {request_id}")
    print(f"started {start['created_at']} UTC  skill {start['payload'].get('skill') or '-'}  "
          f"credits {start['payload'].get('creditCost')}\n")
    step = 1
    for row in map(load, rows):
        p, kind, t = row["payload"], row["kind"], row["created_at"][11:19]
        if kind == "agent.thinking":
            step = p.get("step", step)
            print(f"\n## step {step} — {t}")
            print(textwrap.indent(p["thinking"].strip(), "    "))
        elif kind == "action.executed":
            args = json.dumps(p.get("arguments", {}), ensure_ascii=False)
            print(f"  → {t} {p.get('tool')} {args[:300]}")
        elif kind == "agent.usage":
            u = p["usage"]
            print(f"  · tokens in {u['inputTokens']} (cached {u['cachedInputTokens']}) "
                  f"out {u['outputTokens']} (reasoning {u['reasoningTokens']})")
        elif kind == "agent.completed":
            print(f"\n# completed {t} — {p.get('steps')} steps, usage {json.dumps(p.get('usage'))}")
        elif kind == "agent.failed":
            print(f"\n# FAILED {t} at step {p.get('step')}: {p.get('message')}")
    if not ended:
        print("\n# still running")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] == "--list":
        list_turns()
    else:
        show_turn(args[0] if args else None)
