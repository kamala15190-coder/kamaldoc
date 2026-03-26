import { Capacitor, registerPlugin } from '@capacitor/core'
import { Device } from '@capacitor/device'

/**
 * DocumentScannerHelper — centralized platform & feature detection
 * for document scanning and gallery multi-select capabilities.
 *
 * Determines the best available capture method per platform:
 * - Android: ML Kit Document Scanner (manual mode) → Capacitor Camera fallback
 * - iOS: VNDocumentCameraViewController → Capacitor Camera fallback
 * - Web: HTML5 file input with capture attribute
 */

// Register the native DocumentScanner plugin ONCE at module level.
// On platforms where the native plugin does not exist, calls will throw
// a "not implemented" error which is caught in the scanner functions.
const DocumentScanner = registerPlugin('DocumentScanner')

let _platformCache = null

/**
 * Detect the current platform and its capabilities (cached).
 * Returns: { platform, hasNativeScanner, hasMultiSelectGallery, iosVersion, androidSdk }
 */
export async function detectCapabilities() {
  if (_platformCache) return _platformCache

  const isNative = Capacitor.isNativePlatform()
  const platform = Capacitor.getPlatform() // 'android' | 'ios' | 'web'

  let iosVersion = 0
  let androidSdk = 0

  if (isNative) {
    try {
      const info = await Device.getInfo()
      if (platform === 'ios') {
        iosVersion = parseFloat(info.osVersion) || 0
      } else if (platform === 'android') {
        androidSdk = parseInt(info.osVersion, 10) || 0
      }
    } catch (err) {
      console.warn('[DocumentScannerHelper] Device.getInfo() failed:', err)
    }
  }

  let hasNativeScanner = false
  let hasMultiSelectGallery = false

  if (platform === 'android') {
    // ML Kit Document Scanner: check via Capacitor bridge if native plugin is registered
    hasNativeScanner = checkAndroidMLKit()
    // ACTION_GET_CONTENT with allowMultiple works on all Android versions
    hasMultiSelectGallery = true
  } else if (platform === 'ios') {
    // VNDocumentCameraViewController available on iOS 13+ but we target 16+ for best experience
    hasNativeScanner = iosVersion >= 13
    // PHPickerViewController available on iOS 14+
    hasMultiSelectGallery = iosVersion >= 14
  } else {
    // Web: no native scanner, multi-select via <input multiple>
    hasNativeScanner = false
    hasMultiSelectGallery = true
  }

  _platformCache = {
    platform,
    isNative,
    hasNativeScanner,
    hasMultiSelectGallery,
    iosVersion,
    androidSdk,
  }

  return _platformCache
}

/**
 * Check if Google ML Kit Document Scanner is available on this Android device.
 * Uses Capacitor.isPluginAvailable() which checks the native bridge registry
 * — no duplicate registerPlugin call needed.
 */
function checkAndroidMLKit() {
  try {
    return Capacitor.isPluginAvailable('DocumentScanner')
  } catch {
    return false
  }
}

/**
 * Check if an error represents a user cancellation (not a real failure).
 */
function isCancelError(err) {
  const msg = (err?.message || err?.toString() || '').toLowerCase()
  return msg.includes('cancel') || msg.includes('abgebrochen') || msg.includes('user denied')
}

/**
 * Open the document scanner in the best available mode.
 * Returns: { pages: string[] } — array of data URL strings, or null on cancel/error.
 *
 * Android: ML Kit manual mode → Capacitor Camera fallback (only if ML Kit unavailable)
 * iOS: VNDocumentCameraViewController → Capacitor Camera fallback
 * Web: null (caller should use HTML file input with capture)
 */
export async function openNativeScanner() {
  const caps = await detectCapabilities()

  if (!caps.isNative) return null

  if (caps.platform === 'android') {
    return await openAndroidScanner()
  }

  if (caps.platform === 'ios') {
    return await openIOSScanner()
  }

  return null
}

/**
 * Android: try ML Kit Document Scanner (manual mode), fallback to Capacitor Camera
 * ONLY if ML Kit is genuinely unavailable (not on user cancel).
 * Uses the module-level DocumentScanner instance (single registerPlugin call).
 */
async function openAndroidScanner() {
  // Try ML Kit first
  try {
    const result = await DocumentScanner.scan()
    if (result?.pages?.length) {
      return { pages: Array.isArray(result.pages) ? [...result.pages] : [result.pages] }
    }
    // ML Kit opened but returned no pages — user cancelled inside scanner
    return null
  } catch (err) {
    console.warn('[DocumentScannerHelper] ML Kit scanner error:', err)
    // User pressed back / cancelled — do NOT fall back to camera
    if (isCancelError(err)) {
      return null
    }
  }

  // ML Kit genuinely unavailable — fallback to Capacitor Camera
  return await openCapacitorCamera()
}

/**
 * iOS: try VNDocumentCameraViewController plugin, fallback to Capacitor Camera
 * ONLY if scanner is genuinely unavailable (not on user cancel).
 * Uses the module-level DocumentScanner instance (single registerPlugin call).
 */
async function openIOSScanner() {
  try {
    const result = await DocumentScanner.scan()
    if (result?.pages?.length) {
      return { pages: Array.isArray(result.pages) ? [...result.pages] : [result.pages] }
    }
    return null
  } catch (err) {
    console.warn('[DocumentScannerHelper] iOS scanner error:', err)
    if (isCancelError(err)) {
      return null
    }
  }

  // Fallback: Capacitor Camera
  return await openCapacitorCamera()
}

/**
 * Fallback: open Capacitor Camera for a single photo.
 * Returns { pages: [dataUrl] } or null.
 */
async function openCapacitorCamera() {
  try {
    const { Camera: CapCamera, CameraResultType, CameraSource } = await import('@capacitor/camera')
    const photo = await CapCamera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      quality: 92,
    })
    if (photo?.dataUrl) {
      return { pages: [photo.dataUrl] }
    }
  } catch (err) {
    console.error('[DocumentScannerHelper] Capacitor Camera failed:', err)
  }
  return null
}

/**
 * Open native gallery with multi-select support.
 * Returns: { images: string[] } — array of data URL strings, or null.
 *
 * On native platforms uses Capacitor Camera pickImages when available.
 * On web, returns null (caller should use <input type="file" multiple>).
 */
export async function openNativeGallery() {
  const caps = await detectCapabilities()

  if (!caps.isNative) return null

  try {
    const { Camera: CapCamera, CameraResultType } = await import('@capacitor/camera')
    // Capacitor Camera v6+ has pickImages for multi-select
    if (typeof CapCamera.pickImages === 'function') {
      const result = await CapCamera.pickImages({
        quality: 92,
        limit: 0, // no limit
      })
      if (result?.photos?.length) {
        const dataUrls = []
        for (const photo of result.photos) {
          if (photo.webPath) {
            // Convert webPath to dataUrl
            try {
              const response = await fetch(photo.webPath)
              const blob = await response.blob()
              const dataUrl = await new Promise((resolve) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result)
                reader.readAsDataURL(blob)
              })
              dataUrls.push(dataUrl)
            } catch {
              console.warn('[DocumentScannerHelper] Failed to convert photo webPath')
            }
          }
        }
        if (dataUrls.length) return { images: dataUrls }
      }
    }
  } catch (err) {
    console.warn('[DocumentScannerHelper] pickImages failed:', err)
  }

  return null
}

/**
 * Reset cached capabilities (useful for testing).
 */
export function resetCapabilitiesCache() {
  _platformCache = null
}