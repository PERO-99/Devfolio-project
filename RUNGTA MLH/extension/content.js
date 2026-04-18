;(function () {
  console.log('[VERITAS X][CONTENT] CONTENT RUNNING', location.href)
  const EXTENSION_NAME = 'VERITAS X'
  const SELECTION_THRESHOLD = 20
  const VIDEO_SCAN_INTERVAL_MS = 3000
  const ALERT_COOLDOWN_MS = 15000
  const CAPTURE_OVERLAY_ID = 'vx-capture-overlay'
  const CAPTURE_HINT_ID = 'vx-capture-hint'
  const TOAST_ID = 'vx-toast'
  const PAGE_ALERT_ID = 'vx-page-alert-overlay'
  const STATUS_CHIP_ID = 'vx-status-chip'

  let lastPageScanKey = ''
  let lastSelectionKey = ''
  let captureModeActive = false
  let audioUnlocked = false
  let audioCtx = null
  let lastAlertAt = { suspicious: 0, danger: 0 }
  let videoInterval = null

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim()
  }

  function makeKey(...parts) {
    return parts.map((part) => normalizeText(part).toLowerCase()).join('::')
  }

  function sendMessage(message) {
    console.log('[VERITAS X][CONTENT] SCAN SENT', message?.type)
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response)
      })
    })
  }

  function collectText() {
    const text = normalizeText(document.body ? document.body.innerText : '')
    return text.slice(0, 2000)
  }

  function collectLinks() {
    return Array.from(document.querySelectorAll('a[href]')).slice(0, 120).map((link) => ({
      href: link.href,
      text: normalizeText(link.innerText || link.textContent || '').slice(0, 120),
    }))
  }

  function collectImages() {
    return Array.from(document.querySelectorAll('img')).slice(0, 80).map((image) => ({
      src: image.currentSrc || image.src || '',
      alt: normalizeText(image.alt || '').slice(0, 120),
      title: normalizeText(image.title || '').slice(0, 120),
    }))
  }

  function collectForms() {
    return Array.from(document.querySelectorAll('form')).slice(0, 40).map((form) => ({
      action: form.action || '',
      method: form.method || '',
      inputs: Array.from(form.querySelectorAll('input, textarea, select')).slice(0, 20).map((field) => ({
        type: field.type || field.tagName.toLowerCase(),
        name: field.name || '',
        placeholder: field.placeholder || '',
        autocomplete: field.autocomplete || '',
      })),
    }))
  }

  function collectScripts() {
    return Array.from(document.querySelectorAll('script')).slice(0, 40).map((script) => ({
      src: script.src || '',
      text: normalizeText(script.textContent || '').slice(0, 400),
    }))
  }

  function collectVideos() {
    return Array.from(document.querySelectorAll('video')).slice(0, 8).map((video) => ({
      src: video.currentSrc || video.src || '',
      poster: video.poster || '',
      title: normalizeText(video.getAttribute('aria-label') || video.getAttribute('title') || ''),
    }))
  }

  function extractPagePayload(extra = {}) {
    return {
      url: location.href,
      page_url: location.href,
      title: document.title || '',
      page_title: document.title || '',
      text: collectText(),
      page_text: collectText(),
      selected_text: normalizeText(window.getSelection ? String(window.getSelection()) : ''),
      links: collectLinks(),
      images: collectImages(),
      forms: collectForms(),
      scripts: collectScripts(),
      videos: collectVideos(),
      source: 'extension',
      user_id: 'browser-extension',
      ...extra,
    }
  }

  function createToast() {
    let node = document.getElementById(TOAST_ID)
    if (node) return node
    node = document.createElement('div')
    node.id = TOAST_ID
    node.style.cssText = [
      'position:fixed',
      'right:16px',
      'bottom:16px',
      'z-index:2147483647',
      'max-width:320px',
      'padding:12px 14px',
      'border-radius:12px',
      'background:rgba(15,23,42,0.96)',
      'color:#e2e8f0',
      'font:12px/1.4 system-ui,sans-serif',
      'box-shadow:0 12px 40px rgba(0,0,0,0.35)',
      'border:1px solid rgba(148,163,184,0.25)',
      'display:none',
    ].join(';')
    document.documentElement.appendChild(node)
    return node
  }

  function ensureStatusChip() {
    let node = document.getElementById(STATUS_CHIP_ID)
    if (node) return node
    node = document.createElement('div')
    node.id = STATUS_CHIP_ID
    node.style.cssText = [
      'position:fixed',
      'left:16px',
      'bottom:16px',
      'z-index:2147483647',
      'padding:8px 10px',
      'border-radius:999px',
      'font:11px/1.3 system-ui,sans-serif',
      'font-weight:700',
      'box-shadow:0 10px 30px rgba(0,0,0,0.35)',
      'display:none',
    ].join(';')
    document.documentElement.appendChild(node)
    return node
  }

  function setStatusChip(status, score) {
    const node = ensureStatusChip()
    const level = String(status || 'safe').toLowerCase()
    if (level === 'safe') {
      node.style.display = 'none'
      return
    }
    const style = level === 'danger'
      ? { bg: 'rgba(220,38,38,0.92)', border: '1px solid rgba(248,113,113,0.7)', color: '#ffe4e6' }
      : { bg: 'rgba(245,158,11,0.92)', border: '1px solid rgba(251,191,36,0.7)', color: '#fff7ed' }
    node.style.background = style.bg
    node.style.border = style.border
    node.style.color = style.color
    node.textContent = `${level.toUpperCase()} ${score != null ? `| Risk ${score}` : ''}`
    node.style.display = 'inline-flex'
  }

  function hidePageAlert() {
    document.getElementById(PAGE_ALERT_ID)?.remove()
  }

  function keyReasonFromResult(result) {
    const signals = Array.isArray(result?.signals) ? result.signals : []
    const joined = `${normalizeText(result?.explanation || '')} ${normalizeText(result?.summary || '')} ${signals.map((item) => normalizeText(item?.name || item?.details || '')).join(' ')}`.toLowerCase()
    if (joined.includes('otp') || joined.includes('verification')) return 'OTP phishing pattern detected'
    if (joined.includes('upi') || joined.includes('kyc') || joined.includes('paytm') || joined.includes('phonepe')) return 'UPI/KYC fraud indicators detected'
    if (joined.includes('domain') || joined.includes('phishing') || joined.includes('fake_brand')) return 'Phishing domain behavior detected'
    return 'High-risk scam behavior detected'
  }

  function showDangerOverlay(result) {
    hidePageAlert()
    const overlay = document.createElement('div')
    overlay.id = PAGE_ALERT_ID
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483646',
      'background:linear-gradient(180deg, rgba(127,29,29,0.68), rgba(10,10,10,0.62))',
      'backdrop-filter:blur(2px)',
      'display:flex',
      'align-items:flex-start',
      'justify-content:center',
      'padding-top:16px',
      'pointer-events:none',
      'opacity:0',
      'transition:opacity .28s ease',
    ].join(';')

    const card = document.createElement('div')
    card.style.cssText = [
      'pointer-events:auto',
      'max-width:560px',
      'width:calc(100% - 24px)',
      'background:rgba(15,23,42,0.96)',
      'border:1px solid rgba(248,113,113,0.6)',
      'border-radius:14px',
      'padding:12px 14px',
      'color:#fee2e2',
      'font:13px/1.4 system-ui,sans-serif',
      'box-shadow:0 20px 50px rgba(127,29,29,0.45)',
      'transform:translateY(-6px) scale(0.98)',
      'transition:transform .28s ease',
    ].join(';')
    const explanation = normalizeText(result?.explanation || result?.summary || 'High-risk content detected on this page.')
    const keyReason = keyReasonFromResult(result)
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
        <div>
          <strong style="font-size:15px;letter-spacing:.02em">⚠️ SCAM DETECTED — DO NOT TRUST THIS PAGE</strong>
          <div style="margin-top:6px;color:#fecaca">Risk Score: <strong>${result?.risk_score ?? '--'}</strong></div>
          <div style="margin-top:2px;color:#fca5a5">Key Reason: ${keyReason}</div>
          <div style="margin-top:6px;color:#fecaca">${explanation.slice(0, 220)}</div>
        </div>
        <button id="vx-dismiss-danger" style="background:#450a0a;border:1px solid #ef4444;color:#fecaca;border-radius:8px;padding:6px 10px;cursor:pointer;font-weight:700;white-space:nowrap">Continue Anyway</button>
      </div>
    `
    overlay.appendChild(card)
    document.documentElement.appendChild(overlay)

    requestAnimationFrame(() => {
      overlay.style.opacity = '1'
      card.style.transform = 'translateY(0) scale(1)'
    })

    const btn = card.querySelector('#vx-dismiss-danger')
    if (btn) {
      btn.addEventListener('click', () => hidePageAlert())
    }
  }

  function showToast(result) {
    const node = createToast()
    const status = String(result?.status || 'suspicious').toUpperCase()
    node.innerHTML = `<strong>${EXTENSION_NAME}</strong><br>${status} | Risk ${result?.risk_score ?? 0}<br>${normalizeText(result?.explanation || '').slice(0, 160)}`
    node.style.display = 'block'
    clearTimeout(node.__vxTimer)
    node.__vxTimer = setTimeout(() => {
      node.style.display = 'none'
    }, 4500)
  }

  function unlockAudio() {
    if (audioUnlocked) return
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return
    try {
      audioCtx = new AudioContextClass()
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {})
      }
      audioUnlocked = true
    } catch {
      audioUnlocked = false
    }
  }

  function canPlay(level) {
    const now = Date.now()
    if (level === 'safe') return false
    if (now - (lastAlertAt[level] || 0) < ALERT_COOLDOWN_MS) return false
    lastAlertAt[level] = now
    return true
  }

  function playTone(status) {
    const level = String(status || 'suspicious').toLowerCase()
    if (!audioUnlocked || !canPlay(level)) return

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    try {
      const ctx = audioCtx || new AudioContextClass()
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }
      const gain = ctx.createGain()
      gain.connect(ctx.destination)

      const schedule = level === 'danger'
        ? [
            { freq: 940, duration: 0.22, gain: 0.18 },
            { freq: 720, duration: 0.2, gain: 0.17 },
            { freq: 940, duration: 0.22, gain: 0.18 },
          ]
        : level === 'suspicious'
          ? [{ freq: 480, duration: 0.12, gain: 0.05 }]
          : []

      let offset = 0
      for (const tone of schedule) {
        const oscillator = ctx.createOscillator()
        oscillator.type = 'sine'
        oscillator.frequency.value = tone.freq
        oscillator.connect(gain)
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset)
        gain.gain.exponentialRampToValueAtTime(tone.gain, ctx.currentTime + offset + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + tone.duration)
        oscillator.start(ctx.currentTime + offset)
        oscillator.stop(ctx.currentTime + offset + tone.duration + 0.02)
        offset += tone.duration + 0.05
      }
    } catch {
      // Ignore audio failures.
    }
  }

  function shouldScanSelection(selectionText) {
    const normalized = normalizeText(selectionText)
    if (normalized.length < SELECTION_THRESHOLD) return false
    const key = makeKey(location.href, normalized.slice(0, 250))
    if (key === lastSelectionKey) return false
    lastSelectionKey = key
    return true
  }

  async function analyzePage(extra = {}) {
    const payload = extractPagePayload(extra)
    const key = makeKey(payload.url, payload.title, payload.text.slice(0, 1000), JSON.stringify(payload.links.slice(0, 5)))
    if (key === lastPageScanKey) {
      return null
    }
    lastPageScanKey = key

    return sendMessage({ type: 'SCAN_PAGE', payload })
  }

  async function analyzeSelection(selectionText) {
    const payload = extractPagePayload({
      selected_text: normalizeText(selectionText),
      text: normalizeText(selectionText),
      page_text: collectText(),
    })
    return sendMessage({ type: 'SCAN_SELECTION', payload })
  }

  function showSelectionResultCard(result) {
    const selection = window.getSelection && window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    if (!rect || !rect.width) return

    document.querySelectorAll('.vx-selection-card').forEach((node) => node.remove())
    const card = document.createElement('div')
    card.className = 'vx-selection-card'
    card.style.cssText = [
      'position:fixed',
      `left:${Math.max(10, Math.min(window.innerWidth - 320, rect.left + window.scrollX))}px`,
      `top:${Math.max(10, rect.bottom + 8)}px`,
      'z-index:2147483647',
      'max-width:300px',
      'padding:10px 11px',
      'border-radius:12px',
      'background:rgba(2,6,23,0.96)',
      'border:1px solid rgba(148,163,184,0.35)',
      'color:#e2e8f0',
      'box-shadow:0 14px 34px rgba(0,0,0,0.35)',
      'font:12px/1.35 system-ui,sans-serif',
    ].join(';')

    const status = String(result?.status || 'suspicious').toUpperCase()
    const color = status === 'DANGER' ? '#fca5a5' : status === 'SUSPICIOUS' ? '#fcd34d' : '#6ee7b7'
    card.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between"><strong style="color:${color}">${status}</strong><span>Risk ${result?.risk_score ?? '--'}</span></div><div style="margin-top:5px;color:#cbd5e1">${normalizeText(result?.explanation || '').slice(0, 120)}</div>`
    document.documentElement.appendChild(card)
    setTimeout(() => card.remove(), 5200)
  }

  function captureVisibleFrameFromVideo(video) {
    try {
      if (!video || !video.videoWidth || !video.videoHeight) return ''
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return ''
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      return canvas.toDataURL('image/jpeg', 0.82)
    } catch {
      return ''
    }
  }

  async function analyzeVideo() {
    const videos = Array.from(document.querySelectorAll('video')).filter((item) => item.readyState >= 2)
    if (!videos.length) return null

    for (const video of videos) {
      const frame = captureVisibleFrameFromVideo(video)
      if (!frame) continue

      const response = await sendMessage({
        type: 'SCAN_IMAGE',
        payload: {
          url: location.href,
          title: document.title || '',
          image_b64: frame.split(',')[1] || frame,
          source: 'extension-video',
          user_id: 'browser-extension',
        },
      })

      if (response?.result) {
        const status = String(response.result.status || 'safe').toLowerCase()
        markVideo(video, response.result)
        if (status === 'danger') {
          try {
            video.pause()
          } catch {
            // Ignore pause errors.
          }
        }
        handleResult(response.result, { showToast: status !== 'safe' })
      }
    }

    return null
  }

  function markVideo(video, result) {
    let badge = video.parentElement && video.parentElement.querySelector('.vx-video-badge')
    if (!badge) {
      const host = video.parentElement || video
      if (host === video && host.style.position === '') {
        host.style.position = 'relative'
      }
      badge = document.createElement('div')
      badge.className = 'vx-video-badge'
      badge.style.cssText = [
        'position:absolute',
        'right:8px',
        'top:8px',
        'z-index:99999',
        'padding:5px 8px',
        'border-radius:999px',
        'font:11px system-ui,sans-serif',
        'font-weight:700',
      ].join(';')
      host.appendChild(badge)
    }
    const status = String(result?.status || 'safe').toLowerCase()
    const style = status === 'danger'
      ? { bg: 'rgba(220,38,38,0.92)', color: '#fee2e2' }
      : status === 'suspicious'
        ? { bg: 'rgba(245,158,11,0.92)', color: '#fffbeb' }
        : { bg: 'rgba(16,185,129,0.92)', color: '#ecfdf5' }
    badge.style.background = style.bg
    badge.style.color = style.color
    badge.textContent = `${status.toUpperCase()} ${result?.risk_score ?? ''}`.trim()
  }

  async function analyzeImageFromCapture(rect) {
    const captureResponse = await sendMessage({ type: 'VX_CAPTURE_VISIBLE_TAB' })
    if (!captureResponse?.success || !captureResponse.dataUrl) {
      return { success: false, error: 'Unable to capture visible tab' }
    }

    const imageB64 = await cropCaptureToBase64(captureResponse.dataUrl, rect)
    if (!imageB64) {
      return { success: false, error: 'Unable to crop capture' }
    }

    return sendMessage({
      type: 'SCAN_IMAGE',
      payload: {
        url: location.href,
        title: document.title || '',
        image_b64: imageB64,
        source: 'extension',
        user_id: 'browser-extension',
      },
    })
  }

  function showCaptureResult(rect, result) {
    const node = document.createElement('div')
    node.style.cssText = [
      'position:fixed',
      `left:${Math.max(8, rect.x)}px`,
      `top:${Math.max(8, rect.y - 46)}px`,
      'z-index:2147483647',
      'padding:6px 8px',
      'border-radius:8px',
      'font:11px/1.3 system-ui,sans-serif',
      'font-weight:700',
      'box-shadow:0 10px 24px rgba(0,0,0,0.35)',
    ].join(';')
    const status = String(result?.status || 'safe').toLowerCase()
    if (status === 'danger') {
      node.style.background = 'rgba(220,38,38,0.92)'
      node.style.color = '#fee2e2'
    } else if (status === 'suspicious') {
      node.style.background = 'rgba(245,158,11,0.92)'
      node.style.color = '#fffbeb'
    } else {
      node.style.background = 'rgba(16,185,129,0.92)'
      node.style.color = '#ecfdf5'
    }
    node.textContent = `${status.toUpperCase()} | Risk ${result?.risk_score ?? '--'}`
    document.documentElement.appendChild(node)
    setTimeout(() => node.remove(), 4200)
  }

  async function cropCaptureToBase64(dataUrl, rect) {
    return new Promise((resolve) => {
      const image = new Image()
      image.onload = () => {
        const scale = window.devicePixelRatio || 1
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(rect.width * scale))
        canvas.height = Math.max(1, Math.round(rect.height * scale))
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve('')
          return
        }
        ctx.drawImage(
          image,
          Math.round(rect.x * scale),
          Math.round(rect.y * scale),
          Math.round(rect.width * scale),
          Math.round(rect.height * scale),
          0,
          0,
          canvas.width,
          canvas.height,
        )
        resolve(canvas.toDataURL('image/jpeg', 0.86).split(',')[1])
      }
      image.onerror = () => resolve('')
      image.src = dataUrl
    })
  }

  function removeCaptureOverlay() {
    document.getElementById(CAPTURE_OVERLAY_ID)?.remove()
    document.getElementById(CAPTURE_HINT_ID)?.remove()
  }

  function startCaptureMode() {
    if (captureModeActive) return
    captureModeActive = true

    const hint = document.createElement('div')
    hint.id = CAPTURE_HINT_ID
    hint.textContent = 'Drag to capture an area'
    hint.style.cssText = [
      'position:fixed',
      'left:50%',
      'top:16px',
      'transform:translateX(-50%)',
      'z-index:2147483647',
      'padding:10px 14px',
      'border-radius:999px',
      'background:rgba(15,23,42,0.96)',
      'color:#fff',
      'font:12px system-ui,sans-serif',
      'border:1px solid rgba(148,163,184,0.25)',
    ].join(';')
    document.documentElement.appendChild(hint)

    const overlay = document.createElement('div')
    overlay.id = CAPTURE_OVERLAY_ID
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483646',
      'cursor:crosshair',
      'background:rgba(2,6,23,0.06)',
    ].join(';')
    document.documentElement.appendChild(overlay)

    const box = document.createElement('div')
    box.style.cssText = [
      'position:fixed',
      'border:2px solid #38bdf8',
      'background:rgba(56,189,248,0.12)',
      'display:none',
      'z-index:2147483647',
    ].join(';')
    overlay.appendChild(box)

    const state = { startX: 0, startY: 0, dragging: false }

    const onDown = (event) => {
      state.dragging = true
      state.startX = event.clientX
      state.startY = event.clientY
      box.style.left = `${state.startX}px`
      box.style.top = `${state.startY}px`
      box.style.width = '0px'
      box.style.height = '0px'
      box.style.display = 'block'
      event.preventDefault()
    }

    const onMove = (event) => {
      if (!state.dragging) return
      const left = Math.min(state.startX, event.clientX)
      const top = Math.min(state.startY, event.clientY)
      const width = Math.abs(event.clientX - state.startX)
      const height = Math.abs(event.clientY - state.startY)
      box.style.left = `${left}px`
      box.style.top = `${top}px`
      box.style.width = `${width}px`
      box.style.height = `${height}px`
    }

    const onUp = async (event) => {
      if (!state.dragging) return
      state.dragging = false
      const rect = {
        x: Math.min(state.startX, event.clientX),
        y: Math.min(state.startY, event.clientY),
        width: Math.abs(event.clientX - state.startX),
        height: Math.abs(event.clientY - state.startY),
      }

      cleanup()
      if (rect.width < 24 || rect.height < 24) {
        captureModeActive = false
        return
      }

      captureModeActive = false
      const response = await analyzeImageFromCapture(rect)
      if (response?.result) {
        showCaptureResult(rect, response.result)
        handleResult(response.result, { showToast: true })
      }
    }

    const cleanup = () => {
      overlay.removeEventListener('mousedown', onDown)
      overlay.removeEventListener('mousemove', onMove)
      overlay.removeEventListener('mouseup', onUp)
      overlay.removeEventListener('mouseleave', onUp)
      removeCaptureOverlay()
    }

    overlay.addEventListener('mousedown', onDown)
    overlay.addEventListener('mousemove', onMove)
    overlay.addEventListener('mouseup', onUp)
    overlay.addEventListener('mouseleave', onUp)

    overlay.addEventListener('contextmenu', (event) => {
      event.preventDefault()
      cleanup()
      captureModeActive = false
    })
  }

  function handleResult(result, options = {}) {
    if (!result) return
    const status = String(result.status || 'suspicious').toLowerCase()
    setStatusChip(status, result?.risk_score)
    if (options.showToast) {
      showToast(result)
    }
    if (status === 'danger') {
      showDangerOverlay(result)
    } else {
      hidePageAlert()
    }
    if (status === 'danger' || status === 'suspicious') {
      playTone(status)
    }
  }

  function scheduleInitialScan() {
    const run = async () => {
      console.log('[VERITAS X][CONTENT] initial scan trigger')
      const response = await analyzePage()
      if (response?.result) {
        handleResult(response.result, { showToast: response.result.status !== 'safe' })
      }
      await analyzeVideo()
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      console.log('[VERITAS X][CONTENT] DOM ready state', document.readyState)
      setTimeout(run, 600)
    } else {
      window.addEventListener('DOMContentLoaded', () => {
        console.log('[VERITAS X][CONTENT] DOMContentLoaded')
        setTimeout(run, 600)
      }, { once: true })
    }
  }

  document.addEventListener('mouseup', () => {
    unlockAudio()
    const selection = window.getSelection ? String(window.getSelection()) : ''
    if (shouldScanSelection(selection)) {
      analyzeSelection(selection).then((response) => {
        if (response?.result) {
          showSelectionResultCard(response.result)
          handleResult(response.result, { showToast: true })
        }
      })
    }
  })

  document.addEventListener('keyup', () => {
    const selection = window.getSelection ? String(window.getSelection()) : ''
    if (shouldScanSelection(selection)) {
      analyzeSelection(selection).then((response) => {
        if (response?.result) {
          showSelectionResultCard(response.result)
          handleResult(response.result, { showToast: true })
        }
      })
    }
  })

  document.addEventListener('keydown', (event) => {
    unlockAudio()
    if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'c') {
      startCaptureMode()
    }
  })

  document.addEventListener('click', unlockAudio, { passive: true })

  function startVideoLoop() {
    if (videoInterval) return
    videoInterval = setInterval(() => {
      analyzeVideo().catch(() => {})
    }, VIDEO_SCAN_INTERVAL_MS)
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[VERITAS X][CONTENT] MESSAGE', message?.type)
    if (message?.type === 'VX_PING') {
      sendResponse({ success: true, url: location.href, title: document.title || '' })
      return false
    }

    if (message?.type === 'VX_SCAN_PAGE') {
      analyzePage()
        .then((response) => {
          if (response?.result) handleResult(response.result, { showToast: true })
          sendResponse(response || { success: false })
        })
        .catch((error) => sendResponse({ success: false, error: error?.message || 'Scan failed' }))
      return true
    }

    if (message?.type === 'SCAN_PAGE') {
      analyzePage()
        .then((response) => {
          if (response?.result) handleResult(response.result, { showToast: true })
          sendResponse(response || { success: false })
        })
        .catch((error) => sendResponse({ success: false, error: error?.message || 'Scan failed' }))
      return true
    }

    if (message?.type === 'VX_SCAN_SELECTION') {
      const selection = String(window.getSelection ? window.getSelection() : '')
      analyzeSelection(selection)
        .then((response) => {
          if (response?.result) {
            showSelectionResultCard(response.result)
            handleResult(response.result, { showToast: true })
          }
          sendResponse(response || { success: false })
        })
        .catch((error) => sendResponse({ success: false, error: error?.message || 'Selection scan failed' }))
      return true
    }

    if (message?.type === 'SCAN_SELECTION') {
      const selection = String(window.getSelection ? window.getSelection() : '')
      analyzeSelection(selection)
        .then((response) => {
          if (response?.result) {
            showSelectionResultCard(response.result)
            handleResult(response.result, { showToast: true })
          }
          sendResponse(response || { success: false })
        })
        .catch((error) => sendResponse({ success: false, error: error?.message || 'Selection scan failed' }))
      return true
    }

    if (message?.type === 'VX_SCAN_VIDEO') {
      analyzeVideo()
        .then((response) => {
          if (response?.result) handleResult(response.result, { showToast: true })
          sendResponse(response || { success: false })
        })
        .catch((error) => sendResponse({ success: false, error: error?.message || 'Video scan failed' }))
      return true
    }

    if (message?.type === 'VX_START_CAPTURE_MODE') {
      startCaptureMode()
      sendResponse({ success: true })
      return false
    }

    if (message?.type === 'VX_SCAN_RESULT') {
      handleResult(message.result, { showToast: true })
      sendResponse({ success: true })
      return false
    }

    if (message?.type === 'SCAN_RESULT') {
      handleResult(message.data, { showToast: true })
      sendResponse({ success: true })
      return false
    }

    if (message?.type === 'VX_PLAY_ALERT') {
      playTone(message.status)
      sendResponse({ success: true })
      return false
    }

    return false
  })

  scheduleInitialScan()
  startVideoLoop()
})()
