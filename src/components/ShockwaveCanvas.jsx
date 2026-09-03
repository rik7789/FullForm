import { useEffect, useRef } from 'react'

// Draws expanding, fading rings triggered by scroll position.
// Any element with class="reveal-section" and a data-shock-id
// fires one ring the moment it crosses ~40% into the viewport.
export default function ShockwaveCanvas() {
  const canvasRef = useRef(null)
  const wavesRef = useRef([])
  const firedRef = useRef(new Set())

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let rafId

    function resize() {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    function frame(now) {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

      wavesRef.current = wavesRef.current.filter((w) => now - w.start < w.duration)
      for (const w of wavesRef.current) {
        const t = (now - w.start) / w.duration
        const eased = 1 - Math.pow(1 - t, 3)
        const radius = eased * w.maxRadius
        const alpha = (1 - t) * 0.45

        ctx.beginPath()
        ctx.arc(w.x, w.y, radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255, 212, 0, ${alpha})`
        ctx.lineWidth = 2
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(w.x, w.y, radius * 0.72, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255, 212, 0, ${alpha * 0.5})`
        ctx.lineWidth = 1
        ctx.stroke()

if (t >= 0.95 && !w.revealed) {
          w.revealed = true
          w.section.classList.add('revealed')
        }
      }
      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)

    const sections = document.querySelectorAll('.reveal-section')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.dataset.shockId
          if (entry.isIntersecting && entry.intersectionRatio > 0.4) {
            if (!firedRef.current.has(id)) {
              firedRef.current.add(id)
              const rect = entry.target.getBoundingClientRect()
              wavesRef.current.push({
                x: window.innerWidth / 2,
                y: Math.min(Math.max(rect.top + rect.height / 2, 80), window.innerHeight - 80),
                start: performance.now(),
                duration: 520,
                maxRadius: Math.max(window.innerWidth, window.innerHeight) * 0.42,
                section: entry.target,
              })
            }
          }
        })
      },
      { threshold: [0, 0.4, 1] }
    )
    sections.forEach((s) => observer.observe(s))

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      observer.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="shockwave-canvas" aria-hidden="true" />
}
