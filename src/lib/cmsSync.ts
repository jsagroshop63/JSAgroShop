const CHANNEL = 'js-agro-cms'

let pauseCount = 0
let coolUntil = 0

export function pauseCmsPoll() {
  pauseCount += 1
}

export function resumeCmsPoll() {
  pauseCount = Math.max(0, pauseCount - 1)
}

export function noteCloudBusy(ms = 30000) {
  coolUntil = Math.max(coolUntil, Date.now() + ms)
}

export function isCloudCooling() {
  return Date.now() < coolUntil
}

export function cloudBusyMessage() {
  const wait = Math.max(1, Math.ceil((coolUntil - Date.now()) / 1000))
  return `Cloud is busy (HTTP 503). Wait ${wait} seconds, then click Save again.`
}

export function isCmsPollPaused() {
  return pauseCount > 0 || isCloudCooling()
}

export function notifyCmsChanged() {
  try {
    new BroadcastChannel(CHANNEL).postMessage({ t: Date.now() })
  } catch {
    /* ignore */
  }
}

export function onCmsChanged(handler: () => void) {
  try {
    const channel = new BroadcastChannel(CHANNEL)
    channel.onmessage = () => handler()
    return () => channel.close()
  } catch {
    return () => {}
  }
}
