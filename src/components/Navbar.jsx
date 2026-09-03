import { useRef, useState } from 'react'
import Button from './Button.jsx'
import logo from '../assets/logofullform.png'
import analyzeVideo, { EXERCISES } from '../utils/analyzeVideo'
import AnalysisModal from './AnalysisModal'
import { useEffect } from 'react'

export default function Navbar() {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [analysisData, setAnalysisData] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [selectedExercise, setSelectedExercise] = useState('squats')
  const [exerciseChooserOpen, setExerciseChooserOpen] = useState(false)

  useEffect(() => {
    window.addEventListener('open-upload', handleOpenCamera)
    return () => {
      window.removeEventListener('open-upload', handleOpenCamera)
      if (videoUrl) try { URL.revokeObjectURL(videoUrl) } catch (_) {}
    }
  }, [videoUrl])

  function handleOpenCamera() {
    setExerciseChooserOpen(true)
  }

  function handleExerciseSelected(exercise) {
    setSelectedExercise(exercise)
    setExerciseChooserOpen(false)
    if (fileInputRef.current) fileInputRef.current.click()
  }

  async function handleFileChange(e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await analyzeVideo(file, selectedExercise)
      console.log('analyzeVideo result', result)
      // Backwards-compat: analyzer may return an array of warnings (old) or an object { warnings, checkedFrames, ... }
      let warnings = []
      let frames = 0
      let avgAngle = null, minAngle = null, maxAngle = null
      if (Array.isArray(result)) {
        warnings = result
      } else if (result && typeof result === 'object') {
        warnings = result.warnings || []
        frames = typeof result.checkedFrames === 'number' ? result.checkedFrames : 0
        avgAngle = result.avgAngle
        minAngle = result.minAngle
        maxAngle = result.maxAngle
      }

      // Keep the analysis in the centered modal so the full video stays visible.
      try {
        const url = URL.createObjectURL(file)
        if (url) {
          setVideoUrl(url)
          setAnalysisData({ warnings, frames, avgAngle, minAngle, maxAngle })
          setAnalysisOpen(true)
          return
        }

        const escapedWarnings = (warnings || []).map(w => w.replace(/</g, '&lt;').replace(/>/g, '&gt;'))
        const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>FullForm — Analysis</title>
  <style>
    :root{--bg:#0b0b0b;--panel:#171717;--text:#dcdcdc;--muted:#9aa0a6;--yellow:#ffd60a;--neon:#fff34a}
    body{margin:0;background:var(--bg);color:var(--text);font-family:Inter, system-ui, sans-serif}
    .wrap{display:grid;grid-template-columns:1fr 360px;gap:18px;min-height:100vh;padding:18px}
    .player{background:#000;border-radius:8px;overflow:hidden;position:relative}
    video{width:100%;height:auto;display:block;background:#000}
    canvas{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}
    .side{background:var(--panel);border:1px solid #222;border-radius:8px;padding:14px}
    h2{margin:0 0 8px 0;color:var(--text)}
    .stats{color:var(--muted);font-family:monospace;margin-bottom:12px}
    .warn{color:var(--yellow);margin-bottom:8px}
    .ok{color:var(--text);margin-bottom:8px}
    .btn{display:inline-block;padding:8px 12px;background:var(--yellow);color:#0b0b0b;border-radius:6px;font-weight:700;text-decoration:none}
    .guidance{position:absolute;left:8px;bottom:12px;background:rgba(0,0,0,0.6);padding:8px 12px;border-radius:6px;color:var(--text);font-weight:700}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="player">
      <video id="srcVideo" src="${url}" controls autoplay playsinline muted></video>
      <canvas id="overlay"></canvas>
      <div id="guidance" class="guidance">Initializing detector…</div>
    </div>
    <div class="side">
      <h2>Analysis</h2>
      <div class="stats"><div>Frames checked: ${frames}</div><div>Knee angle avg/min/max: ${avgAngle ? Math.round(avgAngle) : 'N/A'} / ${minAngle ? Math.round(minAngle) : 'N/A'} / ${maxAngle ? Math.round(maxAngle) : 'N/A'}</div></div>
      <h3>Warnings</h3>
      <div id="warnings">
        ${escapedWarnings.length ? escapedWarnings.map(w => `<div class="warn">${w}</div>`).join('') : '<div class="ok">No warnings detected</div>'}
      </div>
      <div style="margin-top:12px"><a class="btn" id="closeBtn">Close</a></div>
    </div>
  </div>
  <script>
    // minimal script to load tf and pose-detection, draw overlay and provide guidance
    function loadScript(src){return new Promise((res,rej)=>{if(document.querySelector('script[src="'+src+'"]'))return res();const s=document.createElement('script');s.src=src;s.async=true;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
    (async function(){
      const warningsBox = document.getElementById('warnings')
      const guidance = document.getElementById('guidance')
      const video = document.getElementById('srcVideo')
      const canvas = document.getElementById('overlay')
      const ctx = canvas.getContext('2d')
      function resize(){canvas.width=video.clientWidth;canvas.height=video.clientHeight}
      video.addEventListener('loadedmetadata', resize)
      window.addEventListener('resize', resize)

      try{
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.13.0/dist/tf.min.js')
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl@4.13.0/dist/tf-backend-webgl.min.js')
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@0.0.8/dist/pose-detection.min.js')
      }catch(e){guidance.textContent='Failed to load ML libs. See console for details.';console.error(e);return}
      const tf = window.tf; const poseDetection = window.poseDetection
      try{await tf.setBackend('webgl'); await tf.ready()}catch(e){console.warn('tf backend',e)}
      const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING})

      function drawPoint(x,y,r=4,color='rgba(255,214,10,0.95)'){ctx.beginPath();ctx.fillStyle=color;ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
      function drawLine(a,b,color='rgba(255,214,10,0.85)'){ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=3;ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
      function calculateAngle(a,b,c){const abx=a.x-b.x,aby=a.y-b.y,cbx=c.x-b.x,cby=c.y-b.y;const dot=abx*cbx+aby*cby;const magAB=Math.hypot(abx,aby);const magCB=Math.hypot(cbx,cby);if(!magAB||!magCB)return 0;let ang=Math.acos(Math.max(-1,Math.min(1,dot/(magAB*magCB))))*(180/Math.PI);return ang}

      let raf=null; function step(){ctx.clearRect(0,0,canvas.width,canvas.height); if(video.paused||video.ended){cancelAnimationFrame(raf);return} detector.estimatePoses(video).then(poses=>{if(poses && poses.length){const k=poses[0].keypoints; // coco idxs
          const map = (kp) => ({x: kp.x * (canvas.width/video.videoWidth), y: kp.y * (canvas.height/video.videoHeight), score: kp.score})
          const lHip=k[11], lKnee=k[13], lAnkle=k[15], rHip=k[12], rKnee=k[14], rAnkle=k[16]
          const left = (lHip&&lKnee&&lAnkle && lHip.score>0.2 && lKnee.score>0.2 && lAnkle.score>0.2) ? [map(lHip),map(lKnee),map(lAnkle)] : null
          const right = (rHip&&rKnee&&rAnkle && rHip.score>0.2 && rKnee.score>0.2 && rAnkle.score>0.2) ? [map(rHip),map(rKnee),map(rAnkle)] : null
          if(left){ drawPoint(left[0].x,left[0].y,5); drawPoint(left[1].x,left[1].y,6); drawPoint(left[2].x,left[2].y,5); drawLine(left[0],left[1]); drawLine(left[1],left[2]); const angle=calculateAngle(left[0],left[1],left[2]); ctx.fillStyle='rgba(255,255,255,0.95)'; ctx.fillText(Math.round(angle)+'°', left[1].x+8, left[1].y-8);
            // guidance
            if(angle>110){ guidance.textContent='Left knee: lower your hips — aim for ~90° (currently '+Math.round(angle)+'°)'; }
            else if(angle>=80 && angle<=110){ guidance.textContent='Left knee: good depth'; }
            else if(angle<80){ guidance.textContent='Left knee: deep enough — keep control'; }
          }
          if(right){ drawPoint(right[0].x,right[0].y,5); drawPoint(right[1].x,right[1].y,6); drawPoint(right[2].x,right[2].y,5); drawLine(right[0],right[1]); drawLine(right[1],right[2]); const rangle=calculateAngle(right[0],right[1],right[2]); ctx.fillStyle='rgba(255,255,255,0.95)'; ctx.fillText(Math.round(rangle)+'°', right[1].x+8, right[1].y-8);
            if(!left){ // if left not present, show right guidance
              if(rangle>110){ guidance.textContent='Right knee: lower your hips — aim for ~90° (currently '+Math.round(rangle)+'°)'; }
              else if(rangle>=80 && rangle<=110){ guidance.textContent='Right knee: good depth'; }
              else if(rangle<80){ guidance.textContent='Right knee: deep enough — keep control'; }
            }
          }
        } else {
          guidance.textContent='No pose detected — ensure full body visible and camera stable.'
        }}).catch(e=>{console.warn('pose error',e); guidance.textContent='Pose estimation error' + (e && e.message?': '+e.message:'')})
        raf=requestAnimationFrame(step)
      }

      video.play().then(()=>{resize(); step()}).catch(e=>{console.warn('video play',e); guidance.textContent='Unable to play video: '+(e && e.message?e.message:'')})
      document.getElementById('closeBtn').addEventListener('click',()=>{win.close()})
    })()
  </script>
</body>
</html>`

        win.document.open()
        win.document.write(html)
        win.document.close()
      } catch (e) {
        console.error('Unable to create analysis page', e)
        const fallbackUrl = url
        setVideoUrl(fallbackUrl)
        setAnalysisData({ warnings, frames, avgAngle, minAngle, maxAngle })
        setAnalysisOpen(true)
      }
    } catch (err) {
      console.error('analyzeVideo error (full):', err)
      // Safely extract a message from Error, Event, or other thrown values
      let text = 'Analysis error'
      try {
        if (err instanceof Event) {
          const src = err.target && (err.target.src || err.target.currentSrc || err.target.baseURI)
          text = `Event ${err.type}` + (src ? ` (src: ${src})` : '')
        } else if (err && err.message) {
          text = err.message
        } else {
          text = JSON.stringify(err)
        }
      } catch (e) {
        try { text = String(err) } catch (_) { text = 'Unknown analysis error' }
      }
      alert('Analysis error: ' + text + '\nSee console for details.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <header className="nav">
      <div className="nav__inner">
        <a className="nav__logo" href="#top">
          <img src={logo} alt="Full Form logo" className="nav__logo-image" />
          <span>FULL FORM</span>
        </a>
        <nav className="nav__links">
          <a href="#how">How it works</a>
          <a href="#feedback">Live feedback</a>
          <a href="#exercises">Exercises</a>
        </nav>
        <Button onClick={handleOpenCamera} variant="ghost" size="sm" className="nav__cta">
          {uploading ? 'Uploading...' : 'Upload video'}
        </Button>

        {exerciseChooserOpen && (
          <div className="exercise-chooser" role="presentation">
            <div className="exercise-chooser__backdrop" onClick={() => setExerciseChooserOpen(false)} />
            <div className="exercise-chooser__panel" role="dialog" aria-modal="true" aria-labelledby="exercise-chooser-title">
              <button className="exercise-chooser__close" onClick={() => setExerciseChooserOpen(false)} aria-label="Close">x</button>
              <h2 id="exercise-chooser-title">What exercise are you uploading?</h2>
              <div className="exercise-chooser__options">
                {EXERCISES.map((exercise) => (
                  <button key={exercise.value} onClick={() => handleExerciseSelected(exercise.value)}>
                    {exercise.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <AnalysisModal
          open={analysisOpen}
          onClose={() => { setAnalysisOpen(false); setAnalysisData(null); if (videoUrl) { try { URL.revokeObjectURL(videoUrl) } catch (_) {} setVideoUrl(null) } }}
          videoUrl={videoUrl}
          warnings={analysisData && analysisData.warnings ? analysisData.warnings : (Array.isArray(analysisData) ? analysisData : (analysisData ? analysisData.warnings : []))}
          frames={analysisData && typeof analysisData.frames === 'number' ? analysisData.frames : (analysisData && typeof analysisData.checkedFrames === 'number' ? analysisData.checkedFrames : 0)}
          avgAngle={analysisData && analysisData.avgAngle}
          minAngle={analysisData && analysisData.minAngle}
          maxAngle={analysisData && analysisData.maxAngle}
        />
      </div>
    </header>
  )
}
