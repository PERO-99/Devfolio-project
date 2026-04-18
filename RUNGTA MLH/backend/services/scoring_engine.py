from __future__ import annotations

from typing import Any

from utils.helpers import clamp


def _status_from_score(score: int) -> str:
    if score < 30:
        return 'safe'
    if score < 70:
        return 'suspicious'
    return 'danger'


def score_signals(signals: list[dict[str, Any]], modality: str = 'text') -> tuple[int, int, str]:
    unique: dict[str, dict[str, Any]] = {}
    for signal in signals:
        name = signal.get('name') or signal.get('rule') or signal.get('category') or 'signal'
        current = unique.get(name)
        if not current or (signal.get('weight', 0) > current.get('weight', 0)):
            unique[name] = signal

    weighted_score = sum(int(signal.get('weight', 0)) for signal in unique.values())

    modality_boost = {
        'text': 0,
        'web': 2,
        'image': 4,
        'video': 6,
    }.get(modality, 0)

    score = clamp(weighted_score + modality_boost, 0, 100)

    signal_names = {str(signal.get('name') or '').lower() for signal in unique.values()}
    if 'otp_lure' in signal_names or 'otp_priority_boost' in signal_names:
        score = max(score, 78)
    if 'lottery_prize' in signal_names or 'lottery_priority_boost' in signal_names:
        score = max(score, 85)
    if 'urgency_link_combo' in signal_names:
        score = max(score, 76)
    if 'upi_urgency_combo' in signal_names or 'kyc_link_combo' in signal_names:
        score = max(score, 82)
    if 'fake_brand_domain' in signal_names and ('phishing_login' in signal_names or 'credential_bait' in signal_names):
        score = max(score, 80)

    evidence_count = len(unique)
    signal_strength = sum(min(25, int(signal.get('weight', 0)) // 2) for signal in unique.values())
    confidence = clamp(40 + evidence_count * 7 + signal_strength // 2, 35, 99)
    if score >= 70:
        confidence = clamp(confidence + 5, 35, 99)
    elif score < 30:
        confidence = clamp(confidence - 4, 35, 99)

    return score, confidence, _status_from_score(score)

