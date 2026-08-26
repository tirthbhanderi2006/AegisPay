from typing import Dict, Optional

from app.models.dispute import ClaimType, Network

TABLE: Dict[str, Dict[str, ClaimType]] = {
    "VISA": {
        "10.1": ClaimType.FRAUD_UNRECOGNIZED,
        "10.4": ClaimType.FRAUD_UNRECOGNIZED,
        "13.1": ClaimType.PRODUCT_NOT_RECEIVED,
        "13.2": ClaimType.PRODUCT_NOT_RECEIVED,
        "13.3": ClaimType.SERVICE_NOT_AS_DESCRIBED,
        "12.6": ClaimType.DUPLICATE_CHARGE,
        "13.6": ClaimType.PROCESSING_ERROR,
        "12.1": ClaimType.PROCESSING_ERROR,
    },
    "MASTERCARD": {
        "4837": ClaimType.FRAUD_UNRECOGNIZED,
        "4863": ClaimType.FRAUD_UNRECOGNIZED,
        "4853": ClaimType.PRODUCT_NOT_RECEIVED,
        "4842": ClaimType.DUPLICATE_CHARGE,
        "4840": ClaimType.FRAUD_UNRECOGNIZED,
        "4859": ClaimType.SERVICE_NOT_AS_DESCRIBED,
        "4860": ClaimType.PROCESSING_ERROR,
        "4871": ClaimType.PROCESSING_ERROR,
    },
    "NPCI": {
        "FRM-DUP": ClaimType.DUPLICATE_CHARGE,
        "FRM-GNR": ClaimType.PRODUCT_NOT_RECEIVED,
        "FRM-CNF": ClaimType.FRAUD_UNRECOGNIZED,
        "SRV-NAD": ClaimType.SERVICE_NOT_AS_DESCRIBED,
        "SYS-ERR": ClaimType.PROCESSING_ERROR,
    },
}


def lookup(network: Network, reason_code: str) -> Optional[ClaimType]:
    network_table = TABLE.get(network.value if isinstance(network, Network) else str(network))
    if not network_table:
        return None
    return network_table.get(str(reason_code).strip())
