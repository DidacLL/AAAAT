from __future__ import annotations

from dataclasses import dataclass, field


DEFAULT_CENTER_CARD_STATES: dict[str, bool] = {
    "call": True,
    "source": False,
    "now": True,
    "later": False,
    "offer": False,
}


@dataclass
class CenterCardState:
    """Explicit independent expansion state for Smart View center cards."""

    expanded: dict[str, bool] = field(default_factory=lambda: dict(DEFAULT_CENTER_CARD_STATES))

    @classmethod
    def default(cls) -> "CenterCardState":
        return cls()

    @classmethod
    def from_expanded_ids(cls, expanded_ids: set[str]) -> "CenterCardState":
        state = {card_id: card_id in expanded_ids for card_id in DEFAULT_CENTER_CARD_STATES}
        return cls(state)

    def is_expanded(self, card_id: str, default: bool = False) -> bool:
        if card_id not in self.expanded:
            self.expanded[card_id] = bool(default)
        return bool(self.expanded[card_id])

    def set_expanded(self, card_id: str, expanded: bool) -> None:
        self.expanded[card_id] = bool(expanded)

    def toggle(self, card_id: str, default: bool = False) -> bool:
        current = self.is_expanded(card_id, default)
        self.expanded[card_id] = not current
        return self.expanded[card_id]

    def collapse_all(self) -> None:
        for card_id in list(self.expanded):
            self.expanded[card_id] = False

    def expanded_ids(self) -> set[str]:
        return {card_id for card_id, expanded in self.expanded.items() if expanded}
