from __future__ import annotations

from typing import Any

from services.scoring_engine import score_signals
from services.text_engine import analyze_text_payload
from utils.helpers import content_hash, normalize_text, split_values, utc_now_iso


def analyze_web_payload(payload: dict[str, Any]) -> dict[str, Any]:
    page_text = normalize_text(' '.join(part for part in [payload.get('title'), payload.get('page_title'), payload.get('text'), payload.get('page_text'), payload.get('selected_text'), split_values(payload.get('links')), split_values(payload.get('images')), split_values(payload.get('forms')), split_values(payload.get('scripts')), split_values(payload.get('meta'))] if part))
    base_result = analyze_text_payload(
        {
            'url': payload.get('url') or payload.get('page_url') or '',
            'title': payload.get('title') or payload.get('page_title') or '',
            'text': page_text,
            'selected_text': payload.get('selected_text') or '',
            'headings': payload.get('headings') or [],
            'captions': payload.get('captions') or [],
            'links': payload.get('links') or [],
            'images': payload.get('images') or [],
            'videos': payload.get('videos') or [],
            'forms': payload.get('forms') or [],
            'source': 'web',
        }
    )

    signals = list(base_result['signals'])
    links = payload.get('links') or []
    forms = payload.get('forms') or []
    scripts = payload.get('scripts') or []
    images = payload.get('images') or []

    if forms:
        form_text = normalize_text(forms).lower()
        if 'password' in form_text or 'otp' in form_text or 'pin' in form_text:
            signals.append(
                {
                    'name': 'credential_capture_form',
                    'category': 'web',
                    'weight': 28,
                    'matched': ['password/otp form'],
                    'details': 'The page includes a credential or OTP collection form.',
                }
            )

    if scripts:
        script_text = normalize_text(scripts).lower()
        if any(term in script_text for term in ['window.location', 'location.href', 'settimeout', 'meta refresh', 'atob(', 'eval(']):
            signals.append(
                {
                    'name': 'script_redirect_or_obfuscation',
                    'category': 'web',
                    'weight': 22,
                    'matched': ['redirect/obfuscation script'],
                    'details': 'The page snapshot suggests redirect or script obfuscation behavior.',
                }
            )

    if links:
        link_text = normalize_text(links).lower()
        external_count = sum(1 for item in links if 'http' in normalize_text(item).lower())
        if external_count > max(3, len(links) // 2):
            signals.append(
                {
                    'name': 'many_external_links',
                    'category': 'web',
                    'weight': 14,
                    'matched': [f'{external_count} external links'],
                    'details': 'The page contains many outbound links relative to its size.',
                }
            )
        if 'login' in link_text and 'verify' in link_text:
            signals.append(
                {
                    'name': 'login_verify_combo',
                    'category': 'web',
                    'weight': 16,
                    'matched': ['login + verify wording'],
                    'details': 'The link set contains high-risk authentication and verification phrasing.',
                }
            )

    if images:
        image_text = normalize_text(images).lower()
        if any(term in image_text for term in ['qr', 'payment', 'scan me', 'invoice', 'wallet', 'otp']):
            signals.append(
                {
                    'name': 'image_bait_terms',
                    'category': 'web',
                    'weight': 14,
                    'matched': ['image alt/caption bait terms'],
                    'details': 'Image metadata or captions contain scam-relevant bait phrases.',
                }
            )

    score, confidence, status = score_signals(signals, modality='web')
    return {
        'modality': 'web',
        'url': payload.get('url') or payload.get('page_url') or '',
        'title': payload.get('title') or payload.get('page_title') or '',
        'corpus_hash': content_hash(page_text, payload.get('url') or '', payload.get('title') or ''),
        'raw_text': page_text,
        'signals': signals,
        'risk_score': score,
        'confidence': confidence,
        'status': status,
        'timestamp': utc_now_iso(),
    }

