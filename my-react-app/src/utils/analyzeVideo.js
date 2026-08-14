function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => resolve()
    s.onerror = (e) => reject(new Error('Failed to load script: ' + src + ' (' + (e && e.type ? e.type : 'error') + ')'))
    document.head.appendChild(s)
  })
}

async function tryLoadFrom(urls) {
  let lastErr = null
  for (const u of urls) {
    try {
      console.debug('Attempting to load', u)
      await loadScript(u)
      console.debug('Loaded', u)
      return u
    } catch (e) {
      console.warn('Failed to load', u, e)
      lastErr = e
    }
  }
  const msg = 'All fallback URLs failed: ' + urls.join(', ')
  const err = new Error(msg)
  err.cause = lastErr
  throw err
}

function calculateAngle(a, b, c) {
  const ax = a.x, ay = a.y
  const bx = b.x, by = b.y
  const cx = c.x, cy = c.y
  const abx = ax - bx
  const aby = ay - by
  const cbx = cx - bx
  const cby = cy - by
  const dot = abx * cbx + aby * cby
  const magAB = Math.sqrt(abx * abx + aby * aby)
  const magCB = Math.sqrt(cbx * cbx + cby * cby)
  if (magAB === 0 || magCB === 0) return 0
  let angle = Math.acos(Math.max(-1, Math.min(1, dot / (magAB * magCB)))) * (180 / Math.PI)
  return angle
}

export default async function analyzeVideo(file, onProgress = () => {}) {
  // Load TF and pose-detection from CDN if not present
  if (typeof window.tf === 'undefined') {
    await tryLoadFrom([
      'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.13.0/dist/tf.min.js',
      'https://unpkg.com/@tensorflow/tfjs@4.13.0/dist/tf.min.js'
    ])
    // load the webgl backend script so backend is registered
    await tryLoadFrom([
      'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl@4.13.0/dist/tf-backend-webgl.min.js',
      'https://unpkg.com/@tensorflow/tfjs-backend-webgl@4.13.0/dist/tf-backend-webgl.min.js'
    ])
  }
  if (typeof window.poseDetection === 'undefined') {
    await tryLoadFrom([
      'https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@0.0.8/dist/pose-detection.min.js',
      'https://unpkg.com/@tensorflow-models/pose-detection@0.0.8/dist/pose-detection.min.js',
      'https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection/dist/pose-detection.min.js'
    ])
  }
  const tf = window.tf
  const poseDetection = window.poseDetection
  if (!tf || !poseDetection) throw new Error('TensorFlow or pose-detection failed to load')
  // initialize backend
  try {
    await tf.setBackend('webgl')
    await tf.ready()
  } catch (e) {
    console.warn('tf backend init failed, falling back to default:', e)
  }

  if (typeof poseDetection.createDetector !== 'function') {
    throw new Error('pose-detection library did not expose createDetector')
  }

  let detector
  try {
    const modelOptions = {}
    if (poseDetection.movenet && poseDetection.movenet.modelType && poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING) {
      modelOptions.modelType = poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
    }
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      modelOptions
    )
  } catch (e) {
    throw new Error('Failed to create MoveNet detector: ' + (e && e.message ? e.message : String(e)))
  }
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.src = URL.createObjectURL(file)
    video.muted = true
    video.playsInline = true

    const cleanup = () => {
      try { detector && detector.dispose && detector.dispose() } catch (_) {}
      try { URL.revokeObjectURL(video.src) } catch (_) {}
    }

    video.addEventListener('loadedmetadata', () => {
      const duration = video.duration || 0
      const width = video.videoWidth
      const height = video.videoHeight

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      const warnings = []
      let rafId = null
      let lastProcess = 0
      const processInterval = 200 // ms between frames analyzed

      function step() {
        if (video.paused || video.ended) {
          cancelAnimationFrame(rafId)
          cleanup()
          resolve(warnings)
          return
        }

        const now = performance.now()
        if (now - lastProcess >= processInterval) {
          lastProcess = now
          try {
            ctx.drawImage(video, 0, 0, width, height)
            // run pose detection
            detector.estimatePoses(video).then((poses) => {
              if (poses && poses.length > 0) {
                const keypoints = poses[0].keypoints
                // MoveNet COCO order: left hip 11, left knee 13, left ankle 15
                const lHip = keypoints[11]
                const lKnee = keypoints[13]
                const lAnkle = keypoints[15]
                if (lHip && lKnee && lAnkle && lHip.score > 0.3 && lKnee.score > 0.3 && lAnkle.score > 0.3) {
                  const hip = { x: lHip.x, y: lHip.y }
                  const knee = { x: lKnee.x, y: lKnee.y }
                  const ankle = { x: lAnkle.x, y: lAnkle.y }
                  const angle = calculateAngle(hip, knee, ankle)
                  const t = Math.round(video.currentTime * 10) / 10
                  if (angle > 100 && angle < 150) {
                    warnings.push(`At ${t}s: Squat depth insufficient (knee angle ${Math.round(angle)}°)`)
                  }
                }
              }
            }).catch((e) => {
              // ignore per-frame errors
              console.warn('pose estimate error', e)
            })
          } catch (err) {
            console.warn('per-frame processing error', err)
          }
          onProgress((video.currentTime / duration) || 0)
        }
        rafId = requestAnimationFrame(step)
      }

      // play then start loop
      video.play().then(() => {
        step()
      }).catch((err) => {
        // autoplay may be blocked; try manual play trigger
        try {
          video.currentTime = 0
          video.play().then(() => step()).catch((e2) => {
            cancelAnimationFrame(rafId)
            cleanup()
            reject(new Error('Unable to play video for analysis: ' + (e2 && e2.message ? e2.message : String(e2))))
          })
        } catch (e) {
          cleanup()
          reject(new Error('Unable to start playback: ' + (e && e.message ? e.message : String(e))))
        }
      })
    })

    video.addEventListener('error', (e) => {
      const msg = (e && e.target && e.target.error && e.target.error.message) || (e && e.type) || 'Video load error'
      cleanup()
      reject(new Error('Video load error: ' + msg))
    })
  })
}
