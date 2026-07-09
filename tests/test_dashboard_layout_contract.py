import importlib.util
import tempfile
import unittest
from html.parser import HTMLParser

from aaaat.dashboard_views import dashboard_view_model, render_dashboard_view
from aaaat.db import connect, create_application, init_db, upsert_glossary_term
from aaaat.payload import dashboard_payload
from aaaat.security import Mode
from aaaat.tasks import create_task


JINJA_AVAILABLE = importlib.util.find_spec("jinja2") is not None
FASTAPI_AVAILABLE = importlib.util.find_spec("fastapi") is not None and importlib.util.find_spec("httpx") is not None


class _TagCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


def _tags(html):
    parser = _TagCollector()
    parser.feed(html)
    return parser.tags


def _first(tags, *, tag=None, attr=None, value=None):
    for item_tag, attrs in tags:
        if tag is not None and item_tag != tag:
            continue
        if attr is not None and attr not in attrs:
            continue
        if value is not None and attrs.get(attr) != value:
            continue
        return attrs
    raise AssertionError(f"No tag found for tag={tag!r} attr={attr!r} value={value!r}")


@unittest.skipUnless(JINJA_AVAILABLE, "Jinja2 is not installed")
class DashboardLayoutContractTests(unittest.TestCase):
    def render_dashboard(self, view="smartView", *, context_module="keywords", selected_keyword="Python"):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        init_db(tmp.name)
        with connect(tmp.name) as conn:
            app = create_application(
                conn,
                company="Layout Co",
                role="Backend Platform Engineer",
                status="screening",
                priority="high",
                source="Referral",
                location="Barcelona",
                next_action="Prepare recruiter call",
                notes="Primary layout note",
                keywords=["Python", "SQLite"],
                pitch="Explain local-first platform work",
                smart_question="Which workflow is most painful today?",
                risks_to_avoid="Do not overstate ownership",
            )
            create_application(conn, company="Overflow Rows Co", role="Data Engineer", status="applied", priority="normal")
            create_task(conn, "company_research", "Research Layout Co", application_id=app["id"], priority="high")
            upsert_glossary_term(conn, "Python", "Programming language used for backend services.", "skill")
            payload = dashboard_payload(conn)
            model = dashboard_view_model(
                payload,
                Mode.FULL,
                view=view,
                selected_application_id=app["id"],
                selected_keyword=selected_keyword,
                selected_context_module=context_module,
                conn=conn,
            )
        return render_dashboard_view(payload, Mode.FULL, view_model=model)

    def test_dashboard_shell_declares_bounded_scroll_contract(self):
        html = self.render_dashboard("smartView")
        tags = _tags(html)

        body = _first(tags, tag="body")
        self.assertEqual(body.get("data-page-scroll"), "not-primary")
        self.assertEqual(body.get("data-overflow-contract"), "panel-local-scroll")
        self.assertIn("dashboard-body", body.get("class", ""))

        shell = _first(tags, tag="main", attr="data-dashboard-shell", value="bounded")
        self.assertEqual(shell.get("role"), "main")
        self.assertEqual(shell.get("data-layout-contract"), "bounded-panels")
        self.assertEqual(shell.get("data-overflow-owner"), "panels")
        self.assertIn("dashboard-shell", shell.get("class", ""))

    def test_operational_views_expose_bounded_left_center_right_regions(self):
        for view in ("smartView", "detailedView"):
            with self.subTest(view=view):
                html = self.render_dashboard(view, context_module="keywords" if view == "smartView" else "notes")
                panels = [attrs for _, attrs in _tags(html) if "data-dashboard-panel" in attrs]

                self.assertEqual([panel.get("data-dashboard-region") for panel in panels], ["left", "center", "right"])
                for panel in panels:
                    self.assertEqual(panel.get("role"), "region")
                    self.assertEqual(panel.get("data-panel-boundary"), "bounded")
                    self.assertTrue(panel.get("aria-label"))
                    self.assertIn("dashboard-panel", panel.get("class", ""))

    def test_dashboard_overflow_is_owned_by_panel_local_scroll_regions(self):
        html = self.render_dashboard("detailedView")
        tags = _tags(html)

        self.assertNotIn('data-page-scroll="primary"', html)
        self.assertIn('data-overflow-owner="panels"', html)

        expected_scroll_regions = [attrs for _, attrs in tags if attrs.get("data-panel-scroll") == "expected"]
        self.assertGreaterEqual(len(expected_scroll_regions), 3)
        for region in expected_scroll_regions[:3]:
            self.assertIn("panel-scroll", region.get("class", ""))

        self.assertTrue(any(attrs.get("data-panel-scroll") == "horizontal" for _, attrs in tags))

    def test_selected_candidature_and_keyword_context_remain_visible(self):
        html = self.render_dashboard("smartView", context_module="keywords", selected_keyword="Python")

        self.assertIn('data-dashboard-region="center"', html)
        self.assertIn('data-dashboard-region="right"', html)
        self.assertIn('data-selected-app', html)
        self.assertIn('data-smart-context-selected-candidature', html)
        self.assertIn('data-keyword-panel', html)
        self.assertIn("Layout Co", html)
        self.assertIn("Backend Platform Engineer", html)
        self.assertIn("Programming language used for backend services.", html)


@unittest.skipUnless(FASTAPI_AVAILABLE, "FastAPI/httpx test dependencies are not installed")
class DashboardLayoutRuntimeBoundaryTests(unittest.TestCase):
    def test_agent_runtime_does_not_mount_dashboard_layout_routes_or_assets(self):
        from fastapi.testclient import TestClient

        from aaaat.server_fastapi import create_agent_app

        with tempfile.TemporaryDirectory() as tmp:
            init_db(tmp)
            client = TestClient(create_agent_app(tmp))

            route_paths = {getattr(route, "path", "") for route in client.app.routes}
            self.assertFalse(any(path.startswith("/dashboard") for path in route_paths))
            self.assertFalse(any(path.startswith("/static") for path in route_paths))
            self.assertFalse(any("projection" in path for path in route_paths))
            self.assertNotIn("/", route_paths)

            self.assertEqual(client.get("/").status_code, 404)
            self.assertEqual(client.get("/static/htmx.min.js").status_code, 404)
            self.assertEqual(client.get("/api/dashboard-projection").status_code, 404)
            self.assertEqual(client.get("/dashboard/fragments/selected-card").status_code, 404)


if __name__ == "__main__":
    unittest.main()
