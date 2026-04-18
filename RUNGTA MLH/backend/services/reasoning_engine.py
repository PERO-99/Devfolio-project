from __future__ import annotations

from typing import Any

from ai.ollama_client import OllamaClient
from utils.helpers import to_signal_lines, utc_now_iso


def _template_explanation(result: dict[str, Any]) -> str:
    score = int(result.get('risk_score', 0))
    status = (result.get('status') or 'suspicious').upper()
    signals = result.get('signals') or []
    top_lines = to_signal_lines(signals[:5])
    if not top_lines:
        return f'{status} verdict based on weak or absent evidence.'
    return f'{status} verdict driven by: ' + '; '.join(top_lines)


async def build_final_result(payload: dict[str, Any], engine_result: dict[str, Any], modality: str) -> dict[str, Any]:
    client = OllamaClient()
    top_signals = (engine_result.get('signals') or [])[:8]
    prompt = (
        'You are VERITAS X, an offline scam detection explainer. '\
        'Write a concise 2-3 sentence explanation of why this result was flagged. '\
        'Do not change the score. Mention the most important signals only.\n\n'
        f'Modality: {modality}\n'
        f'Status: {engine_result.get("status")}\n'
        f'Risk score: {engine_result.get("risk_score")}\n'
        f'Confidence: {engine_result.get("confidence")}\n'
        f'Signals: {top_signals}\n'
        f'Payload title: {payload.get("title") or payload.get("page_title") or ""}\n'
        f'Payload url: {payload.get("url") or payload.get("page_url") or payload.get("video_url") or ""}\n'
    )

    explanation = await client.generate(prompt)
    if not explanation:
        explanation = _template_explanation(engine_result)

    signals = engine_result.get('signals') or []
    sources = []
    for signal in signals[:5]:
        sources.append(
            {
                'title': signal.get('name') or signal.get('category') or 'signal',
                'url': payload.get('url') or payload.get('page_url') or payload.get('video_url') or '',
                'detail': signal.get('details') or '',
            }
        )

    return {
        'status': engine_result.get('status') or 'suspicious',
        'risk_score': int(engine_result.get('risk_score') or 0),
        'confidence': int(engine_result.get('confidence') or 0),
        'explanation': explanation.strip(),
        'signals': signals,
        'timestamp': engine_result.get('timestamp') or utc_now_iso(),
        'summary': explanation.strip(),
        'advice': _advice_for_status(engine_result.get('status') or 'suspicious'),
        'sources': sources,
        'reasons': [signal.get('details') or signal.get('name') or '' for signal in signals[:6]],
        'modality': modality,
        'url': payload.get('url') or payload.get('page_url') or payload.get('video_url') or '',
        'title': payload.get('title') or payload.get('page_title') or '',
    }


def _advice_for_status(status: str) -> str:
    lowered = str(status).lower()
    if lowered == 'danger':
        return 'Block interaction, avoid entering credentials, and verify through an independent trusted channel.'
    if lowered == 'suspicious':
        return 'Review the content carefully and verify the sender, domain, and claims before proceeding.'
    return 'No immediate action required, but continue normal verification practices.'

