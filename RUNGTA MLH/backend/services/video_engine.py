from __future__ import annotations

from collections import Counter
from typing import Any

from services.image_engine import analyze_image_payload
from services.scoring_engine import score_signals
from services.text_engine import analyze_text_payload
from utils.helpers import content_hash, normalize_text, utc_now_iso


def analyze_video_payload(payload: dict[str, Any]) -> dict[str, Any]:
    frames = payload.get('frames') or []
    signals: list[dict[str, Any]] = []
    frame_text_chunks: list[str] = []
    frame_hash_seed: list[str] = []

    for index, frame in enumerate(frames[:12]):
        frame_payload = {
            'image_b64': frame,
            'url': payload.get('url') or payload.get('video_url') or '',
            'title': payload.get('title') or payload.get('page_title') or '',
            'ocr_text': payload.get('ocr_texts', [])[index] if index < len(payload.get('ocr_texts') or []) else '',
            'source': 'video-frame',
        }
        frame_result = analyze_image_payload(frame_payload)
        signals.extend(frame_result['signals'])
        frame_text_chunks.append(frame_result.get('raw_text') or '')
        frame_hash_seed.append(frame[:256])

    if not frames:
        fallback_text = normalize_text(' '.join(part for part in [payload.get('video_url'), payload.get('title'), payload.get('transcript')] if part))
        fallback_result = analyze_text_payload(
            {
                'url': payload.get('url') or payload.get('video_url') or '',
                'title': payload.get('title') or payload.get('page_title') or '',
                'text': fallback_text,
                'source': 'video',
            }
        )
        signals.extend(fallback_result['signals'])
        frame_text_chunks.append(fallback_result.get('raw_text') or '')

    counts = Counter(signal['name'] for signal in signals)
    for name, count in counts.items():
        if count > 1:
            signals.append(
                {
                    'name': f'{name}_repeat',
                    'category': 'temporal',
                    'weight': min(15, 4 * (count - 1)),
                    'matched': [name, f'{count} frames'],
                    'details': 'The same risky signal repeats across multiple frames.',
                }
            )

    if frames and len(frames) >= 3:
        signals.append(
            {
                'name': 'multi_frame_evidence',
                'category': 'temporal',
                'weight': 8,
                'matched': [f'{len(frames)} frames sampled'],
                'details': 'Multiple frames were sampled to verify repeated evidence.',
            }
        )

    score, confidence, status = score_signals(signals, modality='video')
    corpus = normalize_text(' '.join(frame_text_chunks))
    return {
        'modality': 'video',
        'url': payload.get('url') or payload.get('video_url') or '',
        'title': payload.get('title') or payload.get('page_title') or '',
        'corpus_hash': content_hash(corpus, payload.get('url') or '', payload.get('title') or '', ''.join(frame_hash_seed)),
        'raw_text': corpus,
        'signals': signals,
        'risk_score': score,
        'confidence': confidence,
        'status': status,
        'timestamp': utc_now_iso(),
    }

