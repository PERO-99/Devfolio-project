from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class AnalysisRequest(BaseModel):
    url: Optional[str] = ''
    page_url: Optional[str] = ''
    title: Optional[str] = ''
    page_title: Optional[str] = ''
    text: Optional[str] = ''
    page_text: Optional[str] = ''
    selected_text: Optional[str] = ''
    summary: Optional[str] = ''
    headings: List[Any] = Field(default_factory=list)
    captions: List[Any] = Field(default_factory=list)
    links: List[Any] = Field(default_factory=list)
    images: List[Any] = Field(default_factory=list)
    videos: List[Any] = Field(default_factory=list)
    forms: List[Any] = Field(default_factory=list)
    scripts: List[Any] = Field(default_factory=list)
    meta: List[Any] = Field(default_factory=list)
    html: Optional[str] = ''
    user_id: Optional[str] = ''
    mode: Optional[str] = ''
    source: Optional[str] = 'frontend'


class ImageAnalysisRequest(BaseModel):
    url: Optional[str] = ''
    page_url: Optional[str] = ''
    title: Optional[str] = ''
    page_title: Optional[str] = ''
    image_b64: Optional[str] = ''
    image: Optional[str] = ''
    ocr_text: Optional[str] = ''
    caption: Optional[str] = ''
    alt_text: Optional[str] = ''
    selected_text: Optional[str] = ''
    user_id: Optional[str] = ''
    mode: Optional[str] = ''
    source: Optional[str] = 'frontend'


class VideoAnalysisRequest(BaseModel):
    url: Optional[str] = ''
    video_url: Optional[str] = ''
    title: Optional[str] = ''
    page_title: Optional[str] = ''
    frames: List[str] = Field(default_factory=list)
    ocr_texts: List[str] = Field(default_factory=list)
    transcript: Optional[str] = ''
    user_id: Optional[str] = ''
    mode: Optional[str] = ''
    source: Optional[str] = 'frontend'


class Signal(BaseModel):
    name: str
    category: str
    weight: int
    matched: List[str] = Field(default_factory=list)
    details: Optional[str] = ''


class AnalysisResult(BaseModel):
    status: str
    risk_score: int
    confidence: int
    explanation: str
    signals: List[Signal] = Field(default_factory=list)
    timestamp: str
    summary: Optional[str] = ''
    advice: Optional[str] = ''
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    reasons: List[str] = Field(default_factory=list)
    modality: Optional[str] = ''
    url: Optional[str] = ''
    title: Optional[str] = ''

