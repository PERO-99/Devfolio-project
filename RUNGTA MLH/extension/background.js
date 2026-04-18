const BACKEND_BASE = 'http://127.0.0.1:8010'
const LAST_RESULT_KEY = 'vx_last_result'
const TAB_RESULTS_KEY = 'vx_tab_results'
const ALERT_COOLDOWN_MS = 15000
const CONTENT_SCRIPT_PATH = 'content.js'

const alertCooldown = {
  suspicious: 0,
  danger: 0,
}

function statusWeight(result) {
  const status = String(result?.status || 'suspicious').toLowerCase()
  if (status === 'danger') return 3
  if (status === 'suspicious') return 2
  return 1
}

async function callBackend(endpoint, payload) {
  console.log('[VERITAS X][BG] API CALLED', endpoint)
  const response = await fetch(`${BACKEND_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.detail || data?.error || `Request failed (${response.status})`)
  }
  return data
}

async function persistResult(tabId, response) {
  const result = response?.result || null
  if (!result) return response

  console.log('[VERITAS X][BG] RESULT RECEIVED', result.status, result.risk_score)

  const timestamp = result.timestamp || new Date().toISOString()
  const entry = { ...result, timestamp, tabId }

  const current = await chrome.storage.local.get([TAB_RESULTS_KEY])
  const tabResults = current[TAB_RESULTS_KEY] || {}
  tabResults[String(tabId || 'global')] = entry

  await chrome.storage.local.set({
    [LAST_RESULT_KEY]: entry,
    [TAB_RESULTS_KEY]: tabResults,
  })

  if (tabId != null) {
    try {
      await chrome.action.setBadgeText({ tabId, text: result.status === 'safe' ? '' : result.status === 'danger' ? '!!' : '!' })
      await chrome.action.setBadgeBackgroundColor({ tabId, color: result.status === 'danger' ? '#dc2626' : '#f59e0b' })
    } catch {
      // Ignore badge failures on restricted tabs.
    }
  }

  if (tabId != null) {
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'VX_SCAN_RESULT', result: entry })
      await chrome.tabs.sendMessage(tabId, { type: 'SCAN_RESULT', data: entry })
    } catch {
      // Content script might not be available on special pages.
    }
  }

  try {
    await chrome.runtime.sendMessage({ type: 'VX_SCAN_RESULT', result: entry })
    await chrome.runtime.sendMessage({ type: 'SCAN_RESULT', data: entry })
  } catch {
    // Popup may be closed.
  }

  const level = String(result.status || 'suspicious').toLowerCase()
  const now = Date.now()
  if (statusWeight(result) >= 2 && now - (alertCooldown[level] || 0) >= ALERT_COOLDOWN_MS) {
    alertCooldown[level] = now
    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAQAAAAAYLlVAAAAHUlEQVR42u3BAQ0AAADCoPdPbQ43oAAAAAAAAAAA4G4JjQAAcMZ2WQAAAABJRU5ErkJggg==',
        title: 'VERITAS X Alert',
        message: `${String(result.status || 'suspicious').toUpperCase()} | Risk ${result.risk_score} | ${result.explanation || ''}`.slice(0, 250),
      })
    } catch {
      // Notification permission may not be granted.
    }
  }

  return response
}

async function captureVisibleTab(windowId) {
  return chrome.tabs.captureVisibleTab(windowId, { format: 'png' })
}

async function ensureContentScript(tabId) {
  if (!tabId) return false
  try {
    const ping = await chrome.tabs.sendMessage(tabId, { type: 'VX_PING' })
    if (ping?.success) return true
  } catch {
    // no-op: try injection
  }

  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: [CONTENT_SCRIPT_PATH] })
    const ping = await chrome.tabs.sendMessage(tabId, { type: 'VX_PING' })
    return Boolean(ping?.success)
  } catch {
    return false
  }
}

async function relayScanToTab(tabId, type) {
  const ok = await ensureContentScript(tabId)
  if (!ok) return { success: false, error: 'Content script unavailable on this page' }

  try {
    const response = await chrome.tabs.sendMessage(tabId, { type })
    return response || { success: false, error: 'No response from content script' }
  } catch (error) {
    return { success: false, error: error?.message || 'Unable to send message to tab' }
  }
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  return tabs?.[0] || null
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.get([LAST_RESULT_KEY, TAB_RESULTS_KEY])
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[VERITAS X][BG] MESSAGE', message?.type)
  const tabId = sender?.tab?.id ?? message?.tabId ?? null
  const windowId = sender?.tab?.windowId ?? null

  if (message?.type === 'VX_CAPTURE_VISIBLE_TAB') {
    captureVisibleTab(windowId)
      .then((dataUrl) => sendResponse({ success: true, dataUrl }))
      .catch((error) => sendResponse({ success: false, error: error?.message || 'Capture failed' }))
    return true
  }

  if (message?.type === 'VX_GET_LAST_RESULT') {
    chrome.storage.local.get([LAST_RESULT_KEY, TAB_RESULTS_KEY]).then((data) => {
      const tabResults = data[TAB_RESULTS_KEY] || {}
      const result = tabId != null ? tabResults[String(tabId)] || data[LAST_RESULT_KEY] || null : data[LAST_RESULT_KEY] || null
      sendResponse({ success: true, result })
    })
    return true
  }

  if (message?.type === 'VX_ANALYZE') {
    callBackend(message.endpoint, message.payload)
      .then((response) => persistResult(tabId, response))
      .then((response) => sendResponse(response))
      .catch((error) => sendResponse({ success: false, error: error?.message || 'Analysis failed' }))
    return true
  }

  if (message?.type === 'SCAN_PAGE') {
    callBackend('/api/analyze', message.payload)
      .then((response) => persistResult(tabId, response))
      .then((response) => sendResponse(response))
      .catch((error) => sendResponse({ success: false, error: error?.message || 'Analysis failed' }))
    return true
  }

  if (message?.type === 'SCAN_SELECTION') {
    callBackend('/api/analyze', message.payload)
      .then((response) => persistResult(tabId, response))
      .then((response) => sendResponse(response))
      .catch((error) => sendResponse({ success: false, error: error?.message || 'Analysis failed' }))
    return true
  }

  if (message?.type === 'SCAN_IMAGE') {
    callBackend('/api/analyze-image', message.payload)
      .then((response) => persistResult(tabId, response))
      .then((response) => sendResponse(response))
      .catch((error) => sendResponse({ success: false, error: error?.message || 'Analysis failed' }))
    return true
  }

  if (message?.type === 'VX_SCAN_ACTIVE_TAB') {
    ;(async () => {
      const active = tabId ? { id: tabId } : await getActiveTab()
      if (!active?.id) {
        sendResponse({ success: false, error: 'No active tab found' })
        return
      }

      const map = {
        page: 'VX_SCAN_PAGE',
        selection: 'VX_SCAN_SELECTION',
        capture: 'VX_START_CAPTURE_MODE',
      }
      const kind = map[String(message.action || 'page')] || 'VX_SCAN_PAGE'
      const result = await relayScanToTab(active.id, kind)
      sendResponse(result)
    })()
    return true
  }

  if (message?.type === 'VX_ENSURE_CONTENT_SCRIPT') {
    ;(async () => {
      const active = tabId ? { id: tabId } : await getActiveTab()
      if (!active?.id) {
        sendResponse({ success: false, error: 'No active tab found' })
        return
      }
      const ok = await ensureContentScript(active.id)
      sendResponse({ success: ok })
    })()
    return true
  }

  if (message?.type === 'VX_STORE_RESULT') {
    persistResult(tabId, { success: true, result: message.result }).then((response) => sendResponse(response))
    return true
  }

  if (message?.type === 'VX_CLEAR_BADGE') {
    if (tabId != null) {
      chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {})
    }
    sendResponse({ success: true })
    return false
  }

  return false
})
