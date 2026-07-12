import json
import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


class OptionalRuntimeBoundaryTests(unittest.TestCase):
    def run_probe(self, code: str) -> dict:
        result = subprocess.run(
            [sys.executable, "-c", code],
            cwd=ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def test_desktop_projection_builds_when_wx_imports_are_unavailable(self):
        observed = self.run_probe(
            """
import importlib.abc
import json
import sys
import tempfile

class BlockWx(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname == "wx" or fullname.startswith("wx."):
            raise ImportError("wx blocked by test")
        return None

sys.meta_path.insert(0, BlockWx())
from aaaat.db import init_db
from aaaat.security import Mode
from aaaat.ui_desktop.app import build_desktop_projection

tmp = tempfile.TemporaryDirectory()
init_db(tmp.name)
projection = build_desktop_projection(tmp.name, Mode.FULL)
print(json.dumps({"view": projection["view_state"]["current_view"]}))
"""
        )
        self.assertIn(observed["view"], {"welcome", "smart"})

    def test_agent_runtime_serves_health_when_desktop_imports_are_blocked(self):
        observed = self.run_probe(
            """
import importlib.abc
import json
import sys
import tempfile

class BlockDesktop(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname.startswith("aaaat.ui_desktop"):
            raise ImportError("desktop blocked by test")
        return None

sys.meta_path.insert(0, BlockDesktop())
from fastapi.testclient import TestClient
from aaaat.db import init_db
from aaaat.server_fastapi import create_agent_app

tmp = tempfile.TemporaryDirectory()
init_db(tmp.name)
response = TestClient(create_agent_app(tmp.name)).get("/api/health")
print(json.dumps({"status": response.status_code, "body": response.json()}))
"""
        )
        self.assertEqual(observed["status"], 200)
        self.assertEqual(observed["body"]["runtime"], "agent")


if __name__ == "__main__":
    unittest.main()
