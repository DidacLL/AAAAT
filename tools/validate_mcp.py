"""Validate the public MCP descriptor during development and release checks."""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from aaaat.mcp_server import validate_descriptor


def main() -> int:
    validate_descriptor()
    print("ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
