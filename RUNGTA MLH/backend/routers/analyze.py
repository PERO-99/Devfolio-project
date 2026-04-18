from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Request

from models.schemas import AnalysisRequest, ImageAnalysisRequest, VideoAnalysisRequest
from services.image_engine import analyze_image_payload
from services.reasoning_engine import build_final_result
from services.text_engine import analyze_text_payload
from services.video_engine import analyze_video_payload
from services.web_engine import analyze_web_payload

router = APIRouter()


async def _store_and_broadcast(request: Request, result: dict[str, Any], payload: dict[str, Any], modality: str) -> dict[str, Any]:
    store = request.app.state.store
    hub = request.app.state.hub

    detection = {
        **result,
        'modality': modality,
        'timestamp': result.get('timestamp') or datetime.now(timezone.utc).isoformat(),
        'url': payload.get('url') or payload.get('video_url') or payload.get('page_url') or payload.get('source_url') or '',
        'title': payload.get('title') or payload.get('page_title') or '',
        'source': payload.get('source') or 'backend',
        'payload': payload,
    }

    saved = store.save_detection(detection)
    await hub.broadcast({'type': 'detection', 'detection': saved})
    return saved


@router.post('/analyze')
async def analyze(payload: AnalysisRequest, request: Request) -> dict[str, Any]:
    data = payload.model_dump(exclude_none=True)
    is_web = bool(data.get('links') or data.get('images') or data.get('forms') or data.get('html') or data.get('scripts'))
    engine_result = analyze_web_payload(data) if is_web else analyze_text_payload(data)
    final_result = await build_final_result(data, engine_result, modality='web' if is_web else 'text')
    saved = await _store_and_broadcast(request, final_result, data, final_result['modality'])
    await request.app.state.hub.broadcast({'type': 'stats', 'stats': request.app.state.store.get_stats()})
    return {'success': True, 'result': saved}


@router.post('/analyze-image')
async def analyze_image(payload: ImageAnalysisRequest, request: Request) -> dict[str, Any]:
    data = payload.model_dump(exclude_none=True)
    engine_result = analyze_image_payload(data)
    final_result = await build_final_result(data, engine_result, modality='image')
    saved = await _store_and_broadcast(request, final_result, data, 'image')
    await request.app.state.hub.broadcast({'type': 'stats', 'stats': request.app.state.store.get_stats()})
    return {'success': True, 'result': saved}


@router.post('/analyze-video')
async def analyze_video(payload: VideoAnalysisRequest, request: Request) -> dict[str, Any]:
    data = payload.model_dump(exclude_none=True)
    engine_result = analyze_video_payload(data)
    final_result = await build_final_result(data, engine_result, modality='video')
    saved = await _store_and_broadcast(request, final_result, data, 'video')
    await request.app.state.hub.broadcast({'type': 'stats', 'stats': request.app.state.store.get_stats()})
    return {'success': True, 'result': saved}


@router.get('/stats')
async def stats(request: Request) -> dict[str, Any]:
    return {'success': True, 'stats': request.app.state.store.get_stats()}


@router.get('/recent')
async def recent(request: Request, limit: int = 80) -> dict[str, Any]:
    return {'success': True, 'detections': request.app.state.store.get_recent(limit=limit)}

