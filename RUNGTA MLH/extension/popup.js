const els = {
  card: document.getElementById('card'),
  pageUrl: document.getElementById('pageUrl'),
  statusPill: document.getElementById('statusPill'),
  score: document.getElementById('score'),
  confidence: document.getElementById('confidence'),
  scoreBar: document.getElementById('scoreBar'),
  explanation: document.getElementById('explanation'),
  signals: document.getElementById('signals'),
  timestamp: document.getElementById('timestamp'),
  source: document.getElementById('source'),
}

let activePageHint = ''

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

console.log('[VERITAS X][POPUP] POPUP LOADED')

function render(result) {
  if (!result) {
    els.pageUrl.textContent = activePageHint || 'No page loaded'
    els.statusPill.textContent = 'Waiting'
    els.score.textContent = '--'
    els.confidence.textContent = 'Confidence --'
    els.explanation.textContent = 'No result yet.'
    els.signals.innerHTML = ''
    els.timestamp.textContent = '--'
    els.source.textContent = 'local'
    els.statusPill.className = 'status suspicious'
    els.scoreBar.style.width = '0%'
    els.card.classList.remove('danger-glow')
    return
  }

  const status = String(result.status || 'suspicious').toLowerCase()
  els.pageUrl.textContent = normalize(result.url || result.title || 'Current page')
  els.statusPill.textContent = status.toUpperCase()
  els.statusPill.className = `status ${status}`
  els.score.textContent = String(result.risk_score ?? '--')
  const scoreVal = Number(result.risk_score || 0)
  els.scoreBar.style.width = `${Math.max(0, Math.min(100, scoreVal))}%`
  els.confidence.textContent = `Confidence ${result.confidence ?? '--'}%`
  els.explanation.textContent = normalize(result.explanation || result.summary || 'No explanation available.')
  els.timestamp.textContent = normalize(result.timestamp || '--')
  els.source.textContent = normalize(result.modality || 'local')

  const signals = Array.isArray(result.signals) ? result.signals.slice(0, 5) : []
  els.card.classList.toggle('danger-glow', status === 'danger')
  els.signals.innerHTML = signals.length
    ? signals.map((signal) => `<li>${normalize(signal.name || signal.category || 'signal')}: ${normalize((signal.matched || []).join(', ') || signal.details || '')}</li>`).join('')
    : '<li>No signals captured.</li>'
}

function setLoading(active) {
  els.card.classList.toggle('loading', Boolean(active))
}

async function getLastResult() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'VX_GET_LAST_RESULT' }, (response) => resolve(response?.result || null))
  })
}

async function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs?.[0] || null))
  })
}

async function ensureContentScript(tabId) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'VX_ENSURE_CONTENT_SCRIPT', tabId }, (response) => resolve(Boolean(response?.success)))
  })
}

async function sendToTab(message) {
  const tab = await getActiveTab()
  if (!tab?.id) return null
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, message, (response) => resolve(response || null))
  })
}

async function sendViaBackground(action) {
  const tab = await getActiveTab()
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'VX_SCAN_ACTIVE_TAB', action, tabId: tab?.id }, (response) => resolve(response || null))
  })
}

async function runAction(action, opts = {}) {
  setLoading(true)
  try {
    const tab = await getActiveTab()
    if (!tab?.id) {
      if (!opts.silentFail) els.explanation.textContent = 'No active page tab found.'
      return
    }

    activePageHint = normalize(tab.url || tab.title || activePageHint)

    let response = await sendToTab(action)
    if (!response) {
      await ensureContentScript(tab.id)
      response = await sendToTab(action)
    }

    if (!response) {
      const fallback = action.type === 'VX_SCAN_SELECTION' ? 'selection' : action.type === 'VX_START_CAPTURE_MODE' ? 'capture' : 'page'
      response = await sendViaBackground(fallback)
    }

    console.log('[VERITAS X][POPUP] RESULT RECEIVED', response)
    if (response?.result) {
      render(response.result)
      return
    }
    if (!opts.silentFail) {
      els.explanation.textContent = normalize(response?.error || 'No result returned from page scan.')
    }
  } catch (error) {
    if (!opts.silentFail) {
      els.explanation.textContent = normalize(error?.message || 'Scan failed.')
    }
  } finally {
    setLoading(false)
  }
}

document.getElementById('scanPage').addEventListener('click', async () => {
  console.log('[VERITAS X][POPUP] Scan Page clicked')
  await runAction({ type: 'VX_SCAN_PAGE' })
})

document.getElementById('scanSelection').addEventListener('click', async () => {
  console.log('[VERITAS X][POPUP] Scan Selection clicked')
  await runAction({ type: 'VX_SCAN_SELECTION' })
})

document.getElementById('captureArea').addEventListener('click', async () => {
  console.log('[VERITAS X][POPUP] Capture Area clicked')
  await runAction({ type: 'VX_START_CAPTURE_MODE' }, { silentFail: true })
  window.close()
})

document.getElementById('refreshResult').addEventListener('click', async () => {
  setLoading(true)
  try {
    const data = await getLastResult()
    render(data)
  } finally {
    setLoading(false)
  }
})

chrome.storage.local.get(['vx_last_result']).then((data) => {
  render(data.vx_last_result || null)
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return
  if (changes.vx_last_result?.newValue) {
    console.log('[VERITAS X][POPUP] RESULT RECEIVED storage event')
    render(changes.vx_last_result.newValue)
  }
})

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'VX_SCAN_RESULT' && message.result) {
    console.log('[VERITAS X][POPUP] RESULT RECEIVED runtime event')
    render(message.result)
  }
  if (message?.type === 'SCAN_RESULT' && message.data) {
    console.log('[VERITAS X][POPUP] RESULT RECEIVED runtime alias event')
    render(message.data)
  }
})

;(async () => {
  const tab = await getActiveTab()
  if (tab?.url) {
    activePageHint = normalize(tab.url)
    els.pageUrl.textContent = activePageHint
  }

  const existing = await getLastResult()
  render(existing)

  await runAction({ type: 'VX_SCAN_PAGE' }, { silentFail: true })
})()
