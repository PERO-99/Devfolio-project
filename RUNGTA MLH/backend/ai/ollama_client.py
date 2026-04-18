from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any


class OllamaClient:
    def __init__(self) -> None:
        self.host = os.getenv('OLLAMA_HOST', 'http://localhost:11434').rstrip('/')
        self.model = os.getenv('OLLAMA_MODEL', 'llama3.1:8b')
        self.timeout = float(os.getenv('OLLAMA_TIMEOUT', '6'))

    async def generate(self, prompt: str) -> str:
        return self._generate_sync(prompt)

    def _generate_sync(self, prompt: str) -> str:
        body = json.dumps(
            {
                'model': self.model,
                'prompt': prompt,
                'stream': False,
            }
        ).encode('utf-8')

        request = urllib.request.Request(
            f'{self.host}/api/generate',
            data=body,
            headers={'Content-Type': 'application/json'},
            method='POST',
        )

        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                data = json.loads(response.read().decode('utf-8'))
                return str(data.get('response') or '').strip()
        except (urllib.error.URLError, TimeoutError, ValueError, OSError):
            return ''

