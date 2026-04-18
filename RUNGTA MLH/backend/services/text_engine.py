from __future__ import annotations

import re
from typing import Any

from services.scoring_engine import score_signals
from utils.helpers import (
    build_domain_signal,
    content_hash,
    extract_domain,
    normalize_text,
    split_values,
    utc_now_iso,
)
from utils.patterns import SCAM_REGEXES, TEXT_RULES


def _add_rule_signals(corpus: str) -> list[dict[str, Any]]:
    signals: list[dict[str, Any]] = []
    lowered = corpus.lower()

    for rule in TEXT_RULES:
        matched: list[str] = []
        if rule.get('terms'):
            for term in rule['terms']:
                if term in lowered:
                    matched.append(term)
        if rule.get('regex'):
            for pattern in rule['regex']:
                found = pattern.findall(lowered)
                if found:
                    if isinstance(found, list):
                        matched.extend([str(item) for item in found[:3]])
                    else:
                        matched.append(str(found))

        if matched:
            signals.append(
                {
                    'name': rule['name'],
                    'category': rule['category'],
                    'weight': rule['weight'],
                    'matched': matched[:6],
                    'details': rule['description'],
                }
            )

    if len(corpus) > 160 and sum(1 for char in corpus if char.isupper()) / max(len(corpus), 1) > 0.35:
        signals.append(
            {
                'name': 'shouting_urgency',
                'category': 'tone',
                'weight': 12,
                'matched': ['high uppercase ratio'],
                'details': 'Aggressive all-caps wording is often used in scam messaging.',
            }
        )

    if re.search(r'!{3,}', corpus):
        signals.append(
            {
                'name': 'excessive_exclamation',
                'category': 'tone',
                'weight': 8,
                'matched': ['multiple exclamation marks'],
                'details': 'Excessive punctuation increases urgency pressure.',
            }
        )

    for index, pattern in enumerate(SCAM_REGEXES):
        if pattern.search(corpus):
            signals.append(
                {
                    'name': f'regex_signal_{index + 1}',
                    'category': 'regex',
                    'weight': 12,
                    'matched': [pattern.pattern],
                    'details': 'A shared scam regex pattern matched the text content.',
                }
            )

    return signals


def _add_url_signals(url: str | None, title: str | None = None) -> list[dict[str, Any]]:
    signals: list[dict[str, Any]] = []
    if not url:
        return signals

    signals.extend(build_domain_signal(url, title=title))
    return signals


def analyze_text_payload(payload: dict[str, Any]) -> dict[str, Any]:
    pieces = [
        payload.get('title'),
        payload.get('text'),
        payload.get('page_text'),
        payload.get('selected_text'),
        payload.get('summary'),
        split_values(payload.get('headings')),
        split_values(payload.get('captions')),
        split_values(payload.get('links')),
        split_values(payload.get('images')),
        split_values(payload.get('videos')),
        split_values(payload.get('forms')),
    ]
    corpus = normalize_text(' '.join(part for part in pieces if part))
    url = payload.get('url') or payload.get('page_url') or ''
    title = payload.get('title') or payload.get('page_title') or ''

    signals = _add_rule_signals(corpus)
    signals.extend(_add_url_signals(url, title=title))

    lowered = corpus.lower()
    has_otp = any(term in lowered for term in ['otp', 'one-time password', 'one time password', 'verification code'])
    has_urgency = any(term in lowered for term in ['urgent', 'immediately', 'act now', 'last chance'])
    has_link_bait = any(term in lowered for term in ['click link', 'click now', 'tap link', 'visit link'])
    has_lottery = any(term in lowered for term in ['lottery', 'winner', 'jackpot', 'claim prize'])
    has_upi = any(term in lowered for term in ['upi', 'paytm', 'phonepe', 'gpay', 'google pay', 'bhim'])
    has_kyc = any(term in lowered for term in ['kyc update', 'bank account blocked', 'account blocked'])

    if has_otp:
        signals.append(
            {
                'name': 'otp_priority_boost',
                'category': 'critical',
                'weight': 26,
                'matched': ['otp or verification code mention'],
                'details': 'OTP/verification-code language is treated as critical scam evidence.',
            }
        )

    if has_urgency and has_link_bait:
        signals.append(
            {
                'name': 'urgency_link_combo',
                'category': 'phishing',
                'weight': 32,
                'matched': ['urgent + click-link pattern'],
                'details': 'Urgency combined with link pressure indicates likely phishing.',
            }
        )

    if has_lottery:
        signals.append(
            {
                'name': 'lottery_priority_boost',
                'category': 'critical',
                'weight': 30,
                'matched': ['lottery/jackpot claim'],
                'details': 'Lottery reward bait is treated as high-confidence scam evidence.',
            }
        )

    if has_upi and has_urgency:
        signals.append(
            {
                'name': 'upi_urgency_combo',
                'category': 'regional-fraud',
                'weight': 34,
                'matched': ['upi + urgent language'],
                'details': 'UPI requests with urgency are strongly linked to payment scams.',
            }
        )

    if has_kyc and has_link_bait:
        signals.append(
            {
                'name': 'kyc_link_combo',
                'category': 'regional-fraud',
                'weight': 34,
                'matched': ['kyc/account block + link click'],
                'details': 'KYC or account-block messaging with link-click instructions is high-risk.',
            }
        )

    domain = extract_domain(url)
    if domain and title:
        lowered_title = title.lower()
        if any(brand in lowered_title for brand in ['paypal', 'microsoft', 'google', 'apple', 'meta', 'amazon', 'bank', 'netflix', 'upi']) and domain not in lowered_title:
            signals.append(
                {
                    'name': 'brand_impersonation',
                    'category': 'domain',
                    'weight': 28,
                    'matched': [domain, title],
                    'details': 'The page title suggests a well-known brand but the domain does not match.',
                }
            )

    if payload.get('forms'):
        forms = payload.get('forms') or []
        form_text = normalize_text(forms)
        if any(word in form_text.lower() for word in ['password', 'otp', 'pin', 'bank', 'card', 'account']):
            signals.append(
                {
                    'name': 'credential_form',
                    'category': 'web',
                    'weight': 24,
                    'matched': ['credential-requesting form'],
                    'details': 'A form is requesting sensitive information.',
                }
            )

    score, confidence, status = score_signals(signals, modality='text')
    return {
        'modality': 'text',
        'url': url,
        'title': title,
        'corpus_hash': content_hash(corpus, url, title),
        'raw_text': corpus,
        'signals': signals,
        'risk_score': score,
        'confidence': confidence,
        'status': status,
        'timestamp': utc_now_iso(),
    }

