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

export const EXERCISES = [
  { value: 'squats', label: 'Squats' },
  { value: 'pushups', label: 'Push-ups' },
  { value: 'bicep_curls', label: 'Bicep curls' },
  { value: 'bench_press', label: 'Bench press' },
  { value: 'deadlift', label: 'Deadlift' },
  { value: 'lunges', label: 'Lunges' },
  { value: 'overhead_press', label: 'Overhead press' },
  { value: 'plank', label: 'Plank' },
]

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

function getPoint(keypoints, index) {
  const point = keypoints[index]
  return point && point.score > 0.3 ? { x: point.x, y: point.y } : null
}

function getSide(keypoints, side) {
  const offset = side === 'right' ? 1 : 0
  const points = {
    shoulder: getPoint(keypoints, 5 + offset),
    elbow: getPoint(keypoints, 7 + offset),
    wrist: getPoint(keypoints, 9 + offset),
    hip: getPoint(keypoints, 11 + offset),
    knee: getPoint(keypoints, 13 + offset),
    ankle: getPoint(keypoints, 15 + offset),
  }
  const score = Object.values(points).filter(Boolean).length
  return { ...points, score }
}

function warningForExercise(exercise, side, time) {
  const { shoulder, elbow, wrist, hip, knee, ankle } = side
  const at = `${time}s:`

  if (exercise === 'squats' && hip && knee && ankle) {
    const angle = calculateAngle(hip, knee, ankle)
    if (angle > 110) return `${at} Lower your hips further until your knee angle is near 90 degrees (currently ${Math.round(angle)} degrees).`
  }

  if (exercise === 'pushups' && shoulder && elbow && wrist && hip && ankle) {
    const bodyLine = calculateAngle(shoulder, hip, ankle)
    const elbowAngle = calculateAngle(shoulder, elbow, wrist)
    if (bodyLine < 155) return `${at} Keep your head, shoulders, hips, and heels in one straight line.`
    if (elbowAngle > 165) return `${at} Lower your chest toward the floor for a full push-up repetition.`
  }

  if (exercise === 'bicep_curls' && shoulder && elbow && wrist) {
    const elbowAngle = calculateAngle(shoulder, elbow, wrist)
    if (elbowAngle > 155) return `${at} Curl the weight higher and complete the repetition with control.`
  }

  if (exercise === 'bench_press' && shoulder && elbow && wrist) {
    const elbowAngle = calculateAngle(shoulder, elbow, wrist)
    if (elbowAngle > 165) return `${at} Lower the bar toward your chest for a controlled repetition.`
  }

  if (exercise === 'deadlift' && shoulder && hip && knee && ankle) {
    const backAngle = calculateAngle(shoulder, hip, knee)
    const kneeAngle = calculateAngle(hip, knee, ankle)
    if (backAngle < 145) return `${at} Keep your back neutral and brace your core.`
    if (kneeAngle < 70) return `${at} Keep the bar close and avoid collapsing into your knees.`
  }

  if (exercise === 'lunges' && hip && knee && ankle) {
    const kneeAngle = calculateAngle(hip, knee, ankle)
    if (kneeAngle > 115) return `${at} Bend your front knee deeper while keeping it aligned over your ankle.`
  }

  if (exercise === 'overhead_press' && shoulder && elbow && wrist) {
    const elbowAngle = calculateAngle(shoulder, elbow, wrist)
    if (wrist.y > shoulder.y + 30) return `${at} Press the weight overhead while keeping your wrist stacked over your shoulder.`
    if (elbowAngle < 150) return `${at} Extend your arms fully overhead without arching your lower back.`
  }

  if (exercise === 'plank' && shoulder && hip && ankle) {
    const bodyLine = calculateAngle(shoulder, hip, ankle)
    if (bodyLine < 160) return `${at} Keep your shoulders, hips, and heels in one straight line.`
  }

  return null
}

export async function uploadVideo(file) {
  const formData = new FormData()
  formData.append('video', file)
  formData.append('exercise', 'squats')

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })
  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : null

  if (!response.ok) {
    throw new Error((payload && payload.error) || 'Upload failed')
  }

  return payload || { warnings: [] }
}

export default async function analyzeVideo(file, exercise = 'squats', onProgress = () => {}) {
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
      let checkedFrames = 0
      let rafId = null
      let lastProcess = 0
      const processInterval = 200 // ms between frames analyzed

      function step() {
        if (video.paused || video.ended) {
          cancelAnimationFrame(rafId)
          cleanup()
          resolve({ warnings: [...new Set(warnings)], checkedFrames, avgAngle: null, minAngle: null, maxAngle: null })
          return
        }

        const now = performance.now()
        if (now - lastProcess >= processInterval) {
          lastProcess = now
          try {
            checkedFrames += 1
            ctx.drawImage(video, 0, 0, width, height)
            // run pose detection
            detector.estimatePoses(video).then((poses) => {
              if (poses && poses.length > 0) {
                const keypoints = poses[0].keypoints
                const t = Math.round(video.currentTime * 10) / 10
                const sides = [getSide(keypoints, 'left'), getSide(keypoints, 'right')]
                const side = sides.sort((a, b) => b.score - a.score)[0]
                const warning = warningForExercise(exercise, side, t)
                if (warning) warnings.push(warning)
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
