from __future__ import annotations

import base64
import binascii
import io
from typing import Any

from services.scoring_engine import score_signals
from services.text_engine import analyze_text_payload
from utils.helpers import content_hash, normalize_text, utc_now_iso


def _decode_image(image_b64: str) -> bytes:
    cleaned = image_b64.split(',')[-1]
    try:
        return base64.b64decode(cleaned, validate=False)
    except binascii.Error:
        return b''


def _extract_ocr_text(image_bytes: bytes) -> str:
    try:
        from PIL import Image  # type: ignore
    except Exception:
        return ''

    try:
        image = Image.open(io.BytesIO(image_bytes))
    except Exception:
        return ''

    ocr_text = ''
    try:
        import pytesseract  # type: ignore

        ocr_text = pytesseract.image_to_string(image) or ''
    except Exception:
        ocr_text = ''

    return normalize_text(ocr_text)


def analyze_image_payload(payload: dict[str, Any]) -> dict[str, Any]:
    image_b64 = payload.get('image_b64') or payload.get('image') or ''
    image_bytes = _decode_image(image_b64) if image_b64 else b''
    ocr_text = normalize_text(payload.get('ocr_text') or '')
    extracted_text = _extract_ocr_text(image_bytes) if image_bytes else ''
    combined_text = normalize_text(' '.join(part for part in [ocr_text, extracted_text, payload.get('caption'), payload.get('alt_text'), payload.get('title')] if part))

    text_result = analyze_text_payload(
        {
            'url': payload.get('url') or payload.get('page_url') or '',
            'title': payload.get('title') or payload.get('page_title') or '',
            'text': combined_text,
            'selected_text': payload.get('selected_text') or '',
            'source': 'image',
        }
    )

    signals = list(text_result['signals'])
    if image_bytes:
        signals.append(
            {
                'name': 'image_decoded',
                'category': 'media',
                'weight': 4,
                'matched': ['base64 image decoded'],
                'details': 'Image content was successfully decoded for inspection.',
            }
        )

    if combined_text and any(term in combined_text.lower() for term in ['otp', 'login', 'password', 'verify', 'gift', 'lottery', 'wallet', 'bank']):
        signals.append(
            {
                'name': 'ocr_fraud_text',
                'category': 'ocr',
                'weight': 18,
                'matched': ['ocr fraud language'],
                'details': 'OCR text contains high-risk language commonly used in scams.',
            }
        )

    score, confidence, status = score_signals(signals, modality='image')
    return {
        'modality': 'image',
        'url': payload.get('url') or payload.get('page_url') or '',
        'title': payload.get('title') or payload.get('page_title') or '',
        'corpus_hash': content_hash(combined_text, payload.get('url') or '', payload.get('title') or '', image_b64[:512]),
        'raw_text': combined_text,
        'signals': signals,
        'risk_score': score,
        'confidence': confidence,
        'status': status,
        'timestamp': utc_now_iso(),
    }

