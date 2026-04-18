from __future__ import annotations

import re

TEXT_RULES = [
    {
        'name': 'otp_lure',
        'category': 'credential',
        'weight': 42,
        'terms': ['otp', 'one-time password', 'one time password', 'verification code', '2fa code', 'share code', 'do not share code'],
        'description': 'Requests for OTP or verification codes are high-risk credential capture signals.',
    },
    {
        'name': 'lottery_prize',
        'category': 'financial',
        'weight': 50,
        'terms': ['lottery', 'winner', 'prize', 'claim your prize', 'free gift', 'jackpot', 'reward awaits'],
        'description': 'Lottery and prize claims are common scam lure language.',
    },
    {
        'name': 'urgent_click',
        'category': 'urgency',
        'weight': 24,
        'terms': ['click now', 'click link', 'act now', 'urgent', 'immediately', 'limited time', 'last chance', 'verify now'],
        'description': 'Urgency language pushes the user into fast, low-trust decisions.',
    },
    {
        'name': 'phishing_login',
        'category': 'phishing',
        'weight': 32,
        'terms': ['login to continue', 'sign in to verify', 'confirm your account', 'account locked', 'suspended account', 'reset password now'],
        'description': 'Login and account verification pressure is often used in phishing campaigns.',
    },
    {
        'name': 'financial_fraud',
        'category': 'financial',
        'weight': 34,
        'terms': ['bank transfer', 'crypto wallet', 'investment profit', 'guaranteed return', 'refund to receive', 'send money', 'upi', 'kyc update', 'bank account blocked', 'job offer fee', 'processing fee'],
        'description': 'Financial manipulation and payment pressure are common fraud traits.',
    },
    {
        'name': 'support_impersonation',
        'category': 'impersonation',
        'weight': 26,
        'terms': ['support team', 'customer service', 'security alert', 'official notice', 'your account has been compromised'],
        'description': 'Support-style impersonation is often used to gain trust.',
    },
    {
        'name': 'credential_bait',
        'category': 'phishing',
        'weight': 28,
        'terms': ['password', 'pin', 'card number', 'cvv', 'seed phrase', 'wallet phrase'],
        'description': 'Credential and wallet seed requests are high-risk phishing signals.',
    },
    {
        'name': 'india_upi_fraud',
        'category': 'regional-fraud',
        'weight': 38,
        'terms': ['upi', 'upi id', 'collect request', 'scan qr', 'paytm', 'phonepe', 'gpay', 'google pay', 'bhim'],
        'description': 'UPI scam indicators detected in content.',
    },
    {
        'name': 'india_kyc_scam',
        'category': 'regional-fraud',
        'weight': 36,
        'terms': ['kyc update', 'bank account blocked', 'account blocked', 'reactivate account', 'pan verification', 'aadhaar update'],
        'description': 'KYC and bank account suspension fraud language detected.',
    },
    {
        'name': 'india_money_bait',
        'category': 'financial',
        'weight': 30,
        'terms': ['₹', 'rs', 'rs.', 'rupees', 'instant loan', 'lottery amount', 'salary advance', 'job joining fee'],
        'description': 'Money-bait language common in Indian scam campaigns.',
    },
]

SUSPICIOUS_TLDS = {
    'zip', 'mov', 'top', 'xyz', 'click', 'icu', 'cyou', 'cam', 'quest', 'monster', 'support', 'info', 'online'
}

URL_SHORTENERS = {
    'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'rebrand.ly', 'is.gd', 'cutt.ly'
}

BRANDS = {
    'paypal', 'google', 'microsoft', 'apple', 'amazon', 'meta', 'facebook', 'instagram', 'netflix', 'bank', 'upi', 'whatsapp', 'telegram', 'paytm', 'phonepe', 'gpay', 'sbi', 'hdfc', 'icici', 'axis'
}

SCAM_REGEXES = [
    re.compile(r'\b\d{4,8}\b'),
    re.compile(r'\b(?:verify|confirm|authenticate).{0,30}\b(?:account|identity|payment|wallet)', re.I),
    re.compile(r'\b(?:free|claim|winner|urgent|suspend|locked|expiry).{0,30}\b(?:now|today|immediately)?', re.I),
]

