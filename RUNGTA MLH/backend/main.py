from __future__ import annotations

import asyncio
import os
import random
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from database.mongo import get_store
from routers.analyze import router as analyze_router


class WebSocketHub:
    def __init__(self) -> None:
        self._clients: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._clients.add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._clients.discard(websocket)

    async def broadcast(self, payload: dict[str, Any]) -> None:
        async with self._lock:
            clients = list(self._clients)

        stale: list[WebSocket] = []
        for client in clients:
            try:
                await client.send_json(payload)
            except Exception:
                stale.append(client)

        if stale:
            async with self._lock:
                for client in stale:
                    self._clients.discard(client)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.store = get_store()
    app.state.hub = WebSocketHub()
    app.state.demo_task = None

    await _seed_demo_detections(app)
    if os.getenv('DEMO_MODE', '1').lower() not in {'0', 'false', 'off'}:
        app.state.demo_task = asyncio.create_task(_demo_alert_loop(app))
    yield

    task = getattr(app.state, 'demo_task', None)
    if task:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(title='VERITAS X Backend', version='1.0.0', lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=False,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(analyze_router, prefix='/api', tags=['analysis'])


async def _seed_demo_detections(app: FastAPI) -> None:
    store = app.state.store
    hub = app.state.hub
    try:
        existing = store.get_recent(limit=5)
        if existing:
            return
    except Exception:
        return

    samples = [
        {
            'status': 'danger',
            'risk_score': 92,
            'confidence': 95,
            'explanation': 'UPI scam campaign detected with urgent payment language.',
            'summary': 'UPI scam campaign detected with urgent payment language.',
            'advice': 'Do not transfer funds or share OTP. Verify via official banking apps.',
            'signals': [
                {'name': 'india_upi_fraud', 'category': 'regional-fraud', 'weight': 38, 'matched': ['upi', 'collect request'], 'details': 'UPI scam indicators detected in content.'},
                {'name': 'urgency_link_combo', 'category': 'phishing', 'weight': 32, 'matched': ['urgent + click-link pattern'], 'details': 'Urgency combined with link pressure indicates likely phishing.'},
            ],
            'reasons': ['UPI fraud pattern', 'Urgency + link pressure'],
            'modality': 'web',
            'url': 'https://paytm-secure-login.xyz',
            'title': 'Verify UPI account now',
            'source': 'demo-seed',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'location': 'India',
            'type': 'UPI Scam',
        },
        {
            'status': 'suspicious',
            'risk_score': 61,
            'confidence': 79,
            'explanation': 'Potential KYC fraud messaging detected with account-block wording.',
            'summary': 'Potential KYC fraud messaging detected with account-block wording.',
            'advice': 'Avoid clicking links and verify account status through official channels.',
            'signals': [
                {'name': 'india_kyc_scam', 'category': 'regional-fraud', 'weight': 36, 'matched': ['kyc update'], 'details': 'KYC and bank account suspension fraud language detected.'},
            ],
            'reasons': ['KYC update scam pattern'],
            'modality': 'text',
            'url': 'https://sbi-verification-alert.com',
            'title': 'KYC Update Required',
            'source': 'demo-seed',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'location': 'India',
            'type': 'KYC Scam',
        },
    ]

    for sample in samples:
        try:
            saved = store.save_detection(sample)
            await hub.broadcast({'type': 'detection', 'detection': saved})
        except Exception:
            continue

    try:
        await hub.broadcast({'type': 'stats', 'stats': store.get_stats()})
    except Exception:
        pass


async def _demo_alert_loop(app: FastAPI) -> None:
    store = app.state.store
    hub = app.state.hub
    templates = [
        {
            'status': 'danger',
            'risk_score': 94,
            'confidence': 97,
            'explanation': 'Live UPI payout scam wave detected from coordinated phishing domains.',
            'summary': 'Live UPI payout scam wave detected from coordinated phishing domains.',
            'signals': [{'name': 'india_upi_fraud', 'category': 'regional-fraud', 'weight': 38, 'matched': ['upi', 'collect'], 'details': 'UPI scam indicators detected in content.'}],
            'reasons': ['UPI fraud campaign'],
            'modality': 'web',
            'url': 'https://upi-wallet-secure-check.xyz',
            'title': 'URGENT: UPI verification required',
            'type': 'UPI Scam',
            'location': 'India',
        },
        {
            'status': 'danger',
            'risk_score': 90,
            'confidence': 93,
            'explanation': 'Lottery jackpot phishing detected with OTP theft pattern.',
            'summary': 'Lottery jackpot phishing detected with OTP theft pattern.',
            'signals': [{'name': 'lottery_prize', 'category': 'financial', 'weight': 50, 'matched': ['lottery', 'winner'], 'details': 'Lottery and prize claims are common scam lure language.'}],
            'reasons': ['Lottery + OTP bait'],
            'modality': 'text',
            'url': 'https://winner-prize-alert.info',
            'title': 'Claim your lottery now',
            'type': 'Lottery Scam',
            'location': 'Delhi',
        },
        {
            'status': 'suspicious',
            'risk_score': 66,
            'confidence': 81,
            'explanation': 'Potential job-fee scam pattern detected in message content.',
            'summary': 'Potential job-fee scam pattern detected in message content.',
            'signals': [{'name': 'india_money_bait', 'category': 'financial', 'weight': 30, 'matched': ['job joining fee'], 'details': 'Money-bait language common in Indian scam campaigns.'}],
            'reasons': ['Job fee bait'],
            'modality': 'text',
            'url': 'https://hr-fast-track-careers.online',
            'title': 'Job confirmed after payment',
            'type': 'Job Scam',
            'location': 'Mumbai',
        },
    ]

    while True:
        await asyncio.sleep(random.randint(5, 10))
        template = dict(random.choice(templates))
        template['timestamp'] = datetime.now(timezone.utc).isoformat()
        template['source'] = 'demo-live'
        template['advice'] = 'Verify independently and avoid sharing credentials, OTP, or payments.'

        try:
            saved = store.save_detection(template)
            await hub.broadcast({'type': 'detection', 'detection': saved})
            await hub.broadcast({'type': 'stats', 'stats': store.get_stats()})
        except Exception:
            continue


@app.get('/health')
async def health() -> dict[str, Any]:
    return {'status': 'ok', 'service': 'veritas-x'}


@app.websocket('/ws')
async def websocket_endpoint(websocket: WebSocket) -> None:
    hub: WebSocketHub = app.state.hub
    store = app.state.store
    await hub.connect(websocket)
    try:
        await websocket.send_json({'type': 'stats', 'stats': store.get_stats()})
        await websocket.send_json({'type': 'recent', 'detections': store.get_recent(limit=20)})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await hub.disconnect(websocket)
    except Exception:
        await hub.disconnect(websocket)

