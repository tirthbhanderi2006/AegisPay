"""Repository for webhook subscriptions and delivery logs."""

from typing import Dict, List, Optional
from app.webhooks.models import WebhookDeliveryAttempt, WebhookSubscription

CREATE_WEBHOOK_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    subscription_id VARCHAR(64) PRIMARY KEY,
    merchant_id VARCHAR(128) NOT NULL,
    webhook_url TEXT NOT NULL,
    webhook_secret VARCHAR(128) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    delivery_id VARCHAR(64) PRIMARY KEY,
    subscription_id VARCHAR(64) NOT NULL,
    event_id VARCHAR(64) NOT NULL,
    status_code INTEGER NOT NULL,
    attempt_number INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""


class WebhookRepository:
    """In-memory and PostgreSQL store for webhook subscriptions and delivery logs."""

    def __init__(self) -> None:
        self._subscriptions: Dict[str, WebhookSubscription] = {}
        self._deliveries: List[WebhookDeliveryAttempt] = []

    def register_subscription(self, sub: WebhookSubscription) -> None:
        self._subscriptions[sub.subscription_id] = sub

    def list_merchant_subscriptions(self, merchant_id: str) -> List[WebhookSubscription]:
        return [s for s in self._subscriptions.values() if s.merchant_id == merchant_id and s.is_active]

    def log_delivery(self, delivery: WebhookDeliveryAttempt) -> None:
        self._deliveries.append(delivery)

    def list_deliveries(self) -> List[WebhookDeliveryAttempt]:
        return list(self._deliveries)

    def clear(self) -> None:
        self._subscriptions.clear()
        self._deliveries.clear()


# Global singleton instance
webhook_repo = WebhookRepository()
