from __future__ import annotations

import hashlib
import re
import unicodedata
from datetime import datetime, timezone
from typing import Any, Iterable
from urllib.parse import urlparse

from utils.patterns import BRANDS, SCAM_REGEXES, SUSPICIOUS_TLDS, URL_SHORTENERS


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_now_iso() -> str:
    return utc_now().isoformat()


def clamp(value: int | float, minimum: int, maximum: int) -> int:
    return int(max(minimum, min(maximum, round(value))))


def normalize_text(value: Any) -> str:
    if value is None:
        return ''
    if isinstance(value, (list, tuple, set)):
        return ' '.join(normalize_text(item) for item in value if item is not None)
    if isinstance(value, dict):
        return ' '.join(normalize_text(item) for item in value.values())
    text = unicodedata.normalize('NFKC', str(value))
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def split_values(value: Any) -> str:
    return normalize_text(value)


def extract_domain(url: str | None) -> str:
    if not url:
        return ''
    parsed = urlparse(url if '://' in url else f'//{url}')
    host = parsed.netloc or parsed.path
    host = host.split('@')[-1].split(':')[0].lower()
    return host


def content_hash(*parts: Any) -> str:
    payload = '||'.join(normalize_text(part).lower() for part in parts)
    return hashlib.sha256(payload.encode('utf-8')).hexdigest()


def _domain_parts(domain: str) -> list[str]:
    return [part for part in domain.split('.') if part]


def build_domain_signal(url: str, title: str | None = None) -> list[dict[str, Any]]:
    signals: list[dict[str, Any]] = []
    domain = extract_domain(url)
    if not domain:
        return signals

    parts = _domain_parts(domain)
    tld = parts[-1] if parts else ''
    subdomain_count = max(0, len(parts) - 2)

    if domain.startswith('xn--') or '.xn--' in domain:
        signals.append({'name': 'punycode_domain', 'category': 'domain', 'weight': 32, 'matched': [domain], 'details': 'The domain uses punycode encoding, a common lookalike tactic.'})

    if re.match(r'^\d{1,3}(?:\.\d{1,3}){3}$', domain):
        signals.append({'name': 'ip_domain', 'category': 'domain', 'weight': 30, 'matched': [domain], 'details': 'The address is an IP literal instead of a normal domain name.'})

    if any(shortener in domain for shortener in URL_SHORTENERS):
        signals.append({'name': 'url_shortener', 'category': 'domain', 'weight': 18, 'matched': [domain], 'details': 'The domain is a known URL shortener, which hides the destination.'})

    if tld in SUSPICIOUS_TLDS:
        signals.append({'name': 'suspicious_tld', 'category': 'domain', 'weight': 14, 'matched': [tld], 'details': 'The top-level domain is frequently associated with low-trust pages.'})

    if subdomain_count >= 3:
        signals.append({'name': 'deep_subdomain_stack', 'category': 'domain', 'weight': 16, 'matched': [domain], 'details': 'Excessive subdomain depth is often used to disguise the true host.'})

    if domain.count('-') >= 2:
        signals.append({'name': 'hyphenated_domain', 'category': 'domain', 'weight': 10, 'matched': [domain], 'details': 'The domain contains multiple hyphens, which can indicate a lookalike domain.'})

    if len(domain) >= 28:
        signals.append({'name': 'long_domain_name', 'category': 'domain', 'weight': 12, 'matched': [domain], 'details': 'Very long domains are frequently used for phishing lookalikes.'})

    suspicious_brand_tokens = {'secure', 'login', 'verify', 'alert', 'update', 'support', 'kyc', 'wallet', 'banking'}
    lowered_domain = domain.lower()
    for brand in BRANDS:
        if brand in lowered_domain and '-' in lowered_domain and any(token in lowered_domain for token in suspicious_brand_tokens):
            signals.append({'name': 'fake_brand_domain', 'category': 'domain', 'weight': 34, 'matched': [brand, domain], 'details': 'Domain combines brand name with phishing-oriented tokens.'})
            break

    if title:
        lowered_title = normalize_text(title).lower()
        if any(brand in lowered_title for brand in BRANDS) and not any(brand in domain for brand in BRANDS):
            signals.append({'name': 'title_brand_mismatch', 'category': 'domain', 'weight': 24, 'matched': [title, domain], 'details': 'The title references a major brand but the domain does not match.'})

    return signals


def to_signal_lines(signals: Iterable[dict[str, Any]]) -> list[str]:
    lines: list[str] = []
    for signal in signals:
        name = signal.get('name') or signal.get('category') or 'signal'
        detail = signal.get('details') or ''
        matched = ', '.join(signal.get('matched') or [])
        parts = [name]
        if matched:
            parts.append(f'matched: {matched}')
        if detail:
            parts.append(detail)
        lines.append(' | '.join(parts))
    return lines

