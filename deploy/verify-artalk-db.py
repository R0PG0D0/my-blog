#!/usr/bin/env python3
import sqlite3
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 2:
        print(f"Usage: {Path(sys.argv[0]).name} /path/to/artalk.db", file=sys.stderr)
        return 2

    database = Path(sys.argv[1])
    connection = sqlite3.connect(f"file:{database}?mode=ro", uri=True)

    integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
    print(f"integrity={integrity}")

    tables = {
        row[0]
        for row in connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        )
    }
    for table in ("sites", "pages", "comments", "users"):
        if table in tables:
            count = connection.execute(f'SELECT count(1) FROM "{table}"').fetchone()[0]
            print(f"{table}={count}")

    return 0 if integrity == "ok" else 1


if __name__ == "__main__":
    raise SystemExit(main())
