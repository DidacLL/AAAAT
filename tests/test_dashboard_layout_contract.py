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
    def render_dashboard(self, view="smartView", *, context_module="keywords", selected_keyword="Python", mode=Mode.FULL):
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
                mode,
                view=view,
                selected_application_id=app["id"],
                selected_keyword=selected_keyword,
                selected_context_module=context_module,
                conn=conn,
            )
        return render_dashboard_view(payload, mode, view_model=model)

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

    def test_dashboard_loads_alpine_and_htmx_for_split_responsibility(self):
        html = self.render_dashboard("smartView")
        tags = _tags(html)
        scripts = [attrs.get("src") for tag, attrs in tags if tag == "script"]

        self.assertIn("/static/alpine.min.js", scripts)
        self.assertIn("/static/htmx.min.js", scripts)
        self.assertLess(scripts.index("/static/alpine.min.js"), scripts.index("/static/htmx.min.js"))
        self.assertIn("[x-cloak]{display:none!important}", html)

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

    def test_dashboard_module_primitive_exposes_durable_structure(self):
        html = self.render_dashboard("smartView")
        tags = _tags(html)
        modules = [attrs for _, attrs in tags if attrs.get("data-module-primitive") == "dashboard-module"]

        self.assertEqual([module.get("data-dashboard-region") for module in modules], ["left", "center", "right"])
        for module in modules:
            self.assertEqual(module.get("data-module-boundary"), "bounded")
            self.assertIn(module.get("data-module-state"), {"expanded", "collapsed"})
            self.assertEqual(module.get("x-data"), "{ open: true }")
            self.assertEqual(module.get("x-bind:data-module-state"), "open ? 'expanded' : 'collapsed'")
            self.assertTrue(module.get("data-module-id"))

        self.assertGreaterEqual(html.count("data-module-header"), 3)
        self.assertGreaterEqual(html.count("data-module-title"), 3)
        self.assertGreaterEqual(html.count("data-module-actions"), 3)
        self.assertGreaterEqual(html.count("data-module-body"), 3)
        self.assertGreaterEqual(html.count('data-module-scroll="local"'), 3)
        self.assertGreaterEqual(html.count('x-show="open"'), 3)
        self.assertGreaterEqual(html.count("x-cloak"), 3)

    def test_dashboard_module_controls_are_real_buttons_with_alpine_state(self):
        html = self.render_dashboard("smartView")
        tags = _tags(html)
        toggle_buttons = [attrs for tag, attrs in tags if tag == "button" and attrs.get("data-module-control") == "toggle"]

        self.assertGreaterEqual(len(toggle_buttons), 3)
        for button in toggle_buttons[:3]:
            self.assertEqual(button.get("type"), "button")
            self.assertEqual(button.get("@click"), "open = !open")
            self.assertEqual(button.get(":aria-expanded"), "open.toString()")
            self.assertTrue(button.get("aria-controls"))

    def test_module_selector_uses_alpine_for_selected_state_and_buttons(self):
        html = self.render_dashboard("smartView", context_module="keywords", selected_keyword="Python")
        tags = _tags(html)
        selector = _first(tags, tag="div", attr="data-module-selector-id", value="smart-context-selector")
        buttons = [attrs for tag, attrs in tags if tag == "button" and attrs.get("data-module-selector-id") == "smart-context-selector"]

        self.assertEqual(selector.get("role"), "tablist")
        self.assertEqual(selector.get("x-data"), "{ selected: 'keywords' }")
        self.assertEqual(selector.get("x-bind:data-module-selector-selected"), "selected")
        self.assertEqual(selector.get("data-module-selector-selected"), "keywords")
        self.assertGreaterEqual(len(buttons), 4)
        for button in buttons:
            self.assertEqual(button.get("type"), "button")
            self.assertEqual(button.get("role"), "tab")
            self.assertIn("@click", button)
            self.assertIn(":aria-selected", button)
            self.assertIn("x-bind:data-module-selected", button)
            self.assertTrue(button.get("aria-controls"))

    def test_module_selector_uses_htmx_only_for_server_rendered_body_swaps(self):
        html = self.render_dashboard("smartView", context_module="keywords", selected_keyword="Python")
        tags = _tags(html)
        selector_buttons = [attrs for tag, attrs in tags if tag == "button" and attrs.get("data-module-selector-id") == "smart-context-selector"]

        self.assertTrue(any(button.get("hx-get", "").startswith("/dashboard/fragments/inspector") for button in selector_buttons))
        self.assertTrue(all(button.get("hx-target") == '[aria-label="Inspector"]' for button in selector_buttons))
        self.assertTrue(all(button.get("hx-swap") == "outerHTML" for button in selector_buttons))
        panel = _first(tags, tag="div", attr="data-module-selector-panel")
        self.assertEqual(panel.get("data-module-selector-id"), "smart-context-selector")
        self.assertEqual(panel.get("id"), "smart-context-panel")

    def test_expandable_panels_use_alpine_and_are_collapsed_by_default(self):
        html = "\n".join([
            self.render_dashboard("smartView", context_module="keywords"),
            self.render_dashboard("userView"),
            self.render_dashboard("detailedView"),
            self.render_dashboard("welcomeView"),
        ])
        tags = _tags(html)
        panels = [attrs for _, attrs in tags if "data-expandable-panel" in attrs]
        bodies = [attrs for _, attrs in tags if "data-panel-body" in attrs]

        self.assertGreaterEqual(len(panels), 10)
        for panel in panels:
            self.assertEqual(panel.get("data-panel-default"), "collapsed")
            self.assertEqual(panel.get("data-panel-state"), "collapsed")
            self.assertIn("open: false", panel.get("x-data", ""))
            self.assertEqual(panel.get("x-bind:data-panel-state"), "open ? 'expanded' : 'collapsed'")
            self.assertTrue(panel.get("data-panel-kind"))
        self.assertGreaterEqual(len(bodies), len(panels))
        for body in bodies[: len(panels)]:
            self.assertEqual(body.get("x-show"), "open")
            self.assertIn("x-cloak", body)

    def test_expandable_panel_controls_are_buttons_with_aria_state(self):
        html = self.render_dashboard("userView")
        tags = _tags(html)
        controls = [attrs for tag, attrs in tags if tag == "button" and attrs.get("data-panel-control") == "toggle"]

        self.assertGreaterEqual(len(controls), 5)
        for control in controls:
            self.assertEqual(control.get("type"), "button")
            self.assertEqual(control.get("@click"), "open = !open")
            self.assertEqual(control.get(":aria-expanded"), "open.toString()")
            self.assertEqual(control.get("aria-expanded"), "false")
            self.assertTrue(control.get("aria-controls"))

    def test_creation_profile_config_and_action_forms_start_inside_collapsed_panels(self):
        html = "\n".join([self.render_dashboard("smartView"), self.render_dashboard("userView"), self.render_dashboard("detailedView")])

        self.assertIn('data-panel-kind="creation"', html)
        self.assertIn('data-panel-kind="profile"', html)
        self.assertIn('data-panel-kind="configuration"', html)
        self.assertIn('data-panel-kind="action"', html)
        self.assertIn('data-write-control="raw-offer-intake-form"', html)
        self.assertIn('data-write-control="profile-variable-add"', html)
        self.assertIn('data-write-control="profile-fact-add"', html)
        self.assertIn('data-write-control="primary-note-edit-panel"', html)
        self.assertGreaterEqual(html.count('data-panel-default="collapsed"'), 8)
        self.assertNotIn("<details", html)
        self.assertNotIn("<summary", html)

    def test_read_only_and_static_demo_do_not_expose_write_or_raw_intake_controls(self):
        read_only = self.render_dashboard("userView", mode=Mode.READ_ONLY)
        static_demo = self.render_dashboard("smartView", mode=Mode.STATIC_DEMO)

        for html in (read_only, static_demo):
            self.assertNotIn("data-write-control", html)
            self.assertNotIn("raw-offer-intake", html)
            self.assertNotIn("data-raw-offer-entry", html)
            self.assertNotIn("/dashboard/actions/raw-offer-intake", html)

    def test_dashboard_modules_keep_htmx_targets_only_on_refreshable_regions(self):
        html = self.render_dashboard("smartView")
        tags = _tags(html)
        htmx_modules = [attrs for _, attrs in tags if "data-htmx-module-target" in attrs]

        self.assertGreaterEqual(len(htmx_modules), 2)
        for module in htmx_modules:
            self.assertIn(module.get("data-htmx-module-target"), html)
        self.assertIn('hx-get="/dashboard/fragments/selected-card', html)
        self.assertIn('hx-target="[data-selected-app]"', html)

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
