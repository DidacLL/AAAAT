from __future__ import annotations

from dataclasses import dataclass


VALID_DASHBOARD_VIEWS = frozenset({"welcome", "smart", "detailed", "user"})
VALID_DASHBOARD_REGIONS = frozenset({"left", "center", "right", "dialog", "hidden"})


@dataclass(frozen=True)
class ModuleDefinition:
    """Toolkit-neutral declaration for a desktop dashboard module.

    The module registry is intentionally independent from wxPython or any other
    UI toolkit. Desktop adapters may render these declarations, but domain,
    agent, and projection code should not import GUI widgets.
    """

    module_id: str
    title: str
    purpose: str
    supported_views: tuple[str, ...]
    default_visibility_by_view: dict[str, bool]
    default_region_by_view: dict[str, str]
    minimum_useful_size: tuple[int, int]
    contextual_actions: tuple[str, ...] = ()
    state_persistence_policy: str = "layout"

    @property
    def view(self) -> str:
        """Compatibility view for older projection consumers.

        ModuleDefinition is intentionally multi-view. Older projection code
        expects a single view attribute; expose the first supported view so the
        desktop projection can serialize registry metadata without crashing.
        """

        return self.supported_views[0] if self.supported_views else ""

    @property
    def region(self) -> str:
        return self.default_region_by_view.get(self.view, "center")

    @property
    def required(self) -> bool:
        return any(self.default_visibility_by_view.values())

    @property
    def optional(self) -> bool:
        return not self.required


DEFAULT_MODULES: tuple[ModuleDefinition, ...] = (
    ModuleDefinition(
        "candidature_list",
        "Candidatures",
        "Compact opportunity selector for fast identification.",
        ("smart",),
        {"smart": True},
        {"smart": "left"},
        (260, 320),
        ("search", "select"),
    ),
    ModuleDefinition(
        "selected_candidature_summary",
        "Selected candidature",
        "Operational detail for the selected company and role.",
        ("smart",),
        {"smart": True},
        {"smart": "center"},
        (420, 320),
        ("edit_inline",),
    ),
    ModuleDefinition(
        "primary_note",
        "Primary note",
        "Always-available scratch note for recruiter calls.",
        ("smart",),
        {"smart": True},
        {"smart": "right"},
        (300, 220),
        ("edit_note",),
    ),
    ModuleDefinition(
        "keyword_context",
        "Keyword context",
        "Glossary definition for the selected keyword without losing candidature context.",
        ("smart",),
        {"smart": True},
        {"smart": "right"},
        (280, 180),
        ("select_keyword",),
    ),
    ModuleDefinition(
        "artifacts",
        "Artifacts",
        "Current generated artifacts and review state.",
        ("smart", "detailed"),
        {"smart": True, "detailed": True},
        {"smart": "right", "detailed": "left"},
        (280, 180),
        ("open_artifact", "render"),
    ),
    ModuleDefinition(
        "call_card",
        "Call card",
        "Compact what-to-say, ask, verify, and avoid during active conversations.",
        ("smart",),
        {"smart": True},
        {"smart": "right"},
        (300, 220),
        ("copy_prompt",),
    ),
    ModuleDefinition(
        "company_research",
        "Company research",
        "Short company context relevant to candidature preparation.",
        ("smart",),
        {"smart": False},
        {"smart": "right"},
        (300, 180),
        ("queue_research",),
    ),
    ModuleDefinition(
        "form_answers",
        "Form answers",
        "Application-form answers and generated response drafts.",
        ("smart",),
        {"smart": False},
        {"smart": "right"},
        (300, 180),
        ("review_answers",),
    ),
    ModuleDefinition(
        "agent_suggestions",
        "Agent suggestions",
        "Human-facing review queue and generated suggestions.",
        ("smart",),
        {"smart": False},
        {"smart": "right"},
        (300, 180),
        ("review",),
    ),
    ModuleDefinition(
        "detailed_table",
        "Candidature table",
        "Dense table/grid for comparison and management.",
        ("detailed",),
        {"detailed": True},
        {"detailed": "center"},
        (620, 360),
        ("search", "filter", "sort", "select_row"),
    ),
    ModuleDefinition(
        "detailed_toolbox",
        "Toolbox",
        "Contextual actions for the selected row or general configuration.",
        ("detailed",),
        {"detailed": True},
        {"detailed": "left"},
        (260, 320),
        ("create", "generate", "archive"),
    ),
    ModuleDefinition(
        "task_queue",
        "Task queue",
        "Human-facing task status summary for review and follow-up.",
        ("detailed",),
        {"detailed": True},
        {"detailed": "right"},
        (300, 320),
        ("review_task",),
    ),
    ModuleDefinition(
        "profile_summary",
        "Profile",
        "User profile and professional facts summary.",
        ("user",),
        {"user": True},
        {"user": "center"},
        (420, 240),
        ("edit_profile",),
    ),
    ModuleDefinition(
        "career_summary",
        "Career strategy",
        "Career direction and application strategy summary.",
        ("user",),
        {"user": True},
        {"user": "center"},
        (420, 220),
        ("edit_strategy",),
    ),
    ModuleDefinition(
        "template_summary",
        "Templates",
        "CV, cover-letter, and variable/template readiness.",
        ("user",),
        {"user": True},
        {"user": "right"},
        (320, 220),
        ("edit_templates",),
    ),
    ModuleDefinition(
        "settings_summary",
        "Settings",
        "Local storage, privacy, theme, and agent/task configuration entry points.",
        ("user", "welcome"),
        {"user": True, "welcome": True},
        {"user": "right", "welcome": "center"},
        (320, 200),
        ("open_settings",),
    ),
)


def default_module_registry() -> tuple[ModuleDefinition, ...]:
    return DEFAULT_MODULES


def modules_for_view(view: str, modules: tuple[ModuleDefinition, ...] | None = None) -> tuple[ModuleDefinition, ...]:
    registry = modules or DEFAULT_MODULES
    if view not in VALID_DASHBOARD_VIEWS:
        raise ValueError(f"Unknown dashboard view: {view}")
    return tuple(module for module in registry if view in module.supported_views)


def validate_module_registry(modules: tuple[ModuleDefinition, ...] | None = None) -> None:
    registry = modules or DEFAULT_MODULES
    seen: set[str] = set()
    for module in registry:
        if not module.module_id:
            raise ValueError("Module id is required")
        if module.module_id in seen:
            raise ValueError(f"Duplicate module id: {module.module_id}")
        seen.add(module.module_id)
        if not module.supported_views:
            raise ValueError(f"Module {module.module_id} must support at least one view")
        invalid_views = set(module.supported_views) - VALID_DASHBOARD_VIEWS
        if invalid_views:
            raise ValueError(f"Module {module.module_id} has invalid views: {sorted(invalid_views)}")
        invalid_regions = set(module.default_region_by_view.values()) - VALID_DASHBOARD_REGIONS
        if invalid_regions:
            raise ValueError(f"Module {module.module_id} has invalid regions: {sorted(invalid_regions)}")
        for view in module.supported_views:
            if view not in module.default_visibility_by_view:
                raise ValueError(f"Module {module.module_id} missing default visibility for {view}")
            if view not in module.default_region_by_view:
                raise ValueError(f"Module {module.module_id} missing default region for {view}")
        width, height = module.minimum_useful_size
        if width <= 0 or height <= 0:
            raise ValueError(f"Module {module.module_id} minimum size must be positive")
