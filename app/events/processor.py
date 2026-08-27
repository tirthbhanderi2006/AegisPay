"""Deterministic event processor updating lifecycle and entity graph idempotently."""

import logging
from typing import Dict, Optional

from app.events.models import IntegrationEventPayload, IntegrationEventType
from app.events.repository import integration_event_repo
from app.entity_intelligence.entities import EntityNode, EntityType, make_entity_id
from app.entity_intelligence.graph import entity_graph
from app.entity_intelligence.relationships import EntityEdge, RelationshipType

logger = logging.getLogger(__name__)


def process_integration_event(event: IntegrationEventPayload) -> bool:
    """Ingest payment event idempotently, preserving timestamp integrity.

    Returns True if processed as new event, False if already processed.
    """
    is_new = integration_event_repo.save(event)
    if not is_new:
        logger.info("Event %s already processed. Idempotently ignoring duplicate.", event.event_id)
        return False

    ts = event.timestamp
    m_id = make_entity_id(EntityType.MERCHANT, event.merchant_id)
    t_id = make_entity_id(EntityType.TRANSACTION, event.transaction_id)

    # Ingest merchant & transaction into graph
    entity_graph.add_node(EntityNode(entity_id=m_id, entity_type=EntityType.MERCHANT, first_seen=ts, last_seen=ts))
    entity_graph.add_node(EntityNode(entity_id=t_id, entity_type=EntityType.TRANSACTION, first_seen=ts, last_seen=ts))
    e1_id = f"{t_id}:SEEN_ON_MERCHANT:{m_id}"
    entity_graph.add_edge(EntityEdge(
        edge_id=e1_id, source_id=t_id, target_id=m_id, relationship_type=RelationshipType.SEEN_ON_MERCHANT,
        first_seen=ts, last_seen=ts,
    ))

    # Link device
    if event.device_token:
        d_id = make_entity_id(EntityType.DEVICE, event.device_token)
        entity_graph.add_node(EntityNode(entity_id=d_id, entity_type=EntityType.DEVICE, first_seen=ts, last_seen=ts))
        ed_id = f"{t_id}:USES_DEVICE:{d_id}"
        entity_graph.add_edge(EntityEdge(
            edge_id=ed_id, source_id=t_id, target_id=d_id, relationship_type=RelationshipType.USES_DEVICE,
            first_seen=ts, last_seen=ts,
        ))

    # Link IP
    if event.ip_token:
        i_id = make_entity_id(EntityType.IP, event.ip_token)
        entity_graph.add_node(EntityNode(entity_id=i_id, entity_type=EntityType.IP, first_seen=ts, last_seen=ts))
        ei_id = f"{t_id}:USES_IP:{i_id}"
        entity_graph.add_edge(EntityEdge(
            edge_id=ei_id, source_id=t_id, target_id=i_id, relationship_type=RelationshipType.USES_IP,
            first_seen=ts, last_seen=ts,
        ))

    # Link Account
    if event.account_token:
        a_id = make_entity_id(EntityType.ACCOUNT, event.account_token)
        entity_graph.add_node(EntityNode(entity_id=a_id, entity_type=EntityType.ACCOUNT, first_seen=ts, last_seen=ts))
        ea_id = f"{a_id}:BELONGS_TO_ACCOUNT:{t_id}"
        entity_graph.add_edge(EntityEdge(
            edge_id=ea_id, source_id=a_id, target_id=t_id, relationship_type=RelationshipType.BELONGS_TO_ACCOUNT,
            first_seen=ts, last_seen=ts,
        ))

    # Link Payment Instrument
    if event.payment_instrument_token:
        pi_id = make_entity_id(EntityType.PAYMENT_INSTRUMENT, event.payment_instrument_token)
        entity_graph.add_node(EntityNode(entity_id=pi_id, entity_type=EntityType.PAYMENT_INSTRUMENT, first_seen=ts, last_seen=ts))
        epi_id = f"{t_id}:USES_PAYMENT_INSTRUMENT:{pi_id}"
        entity_graph.add_edge(EntityEdge(
            edge_id=epi_id, source_id=t_id, target_id=pi_id, relationship_type=RelationshipType.USES_PAYMENT_INSTRUMENT,
            first_seen=ts, last_seen=ts,
        ))

    return True
