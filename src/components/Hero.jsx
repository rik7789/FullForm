import Button from './Button.jsx'

export default function Hero() {
  return (
    <section id="top" className="hero reveal-section" data-shock-id="hero">
      <div className="hero__copy">
        <p className="eyebrow"> Pro-level technique tracking using just your webcam.</p>
        <h1 className="hero__title">FULL FORM</h1>
        <p className="hero__sub">
          Fire up your camera, crush your set, and get instant, rep-by-rep breakdowns of your exact joint mechanics. Ditch the spotter, stop guessing in the mirror, and leave your ego at the door.
        </p>
        <div className="hero__actions">
          <Button onClick={() => window.dispatchEvent(new Event('open-upload'))} variant="solid" size="lg">Upload Video</Button>
          <Button href="#how" variant="outline" size="lg">See how it works</Button>
        </div>
        <p className="hero__note">Runs in the browser. Your video never leaves your device.</p>
      </div>
      <div className="hero__visual">
        <div className="hero__video-frame">
          <iframe
            src="https://www.youtube.com/embed/RI-WOkEzyYQ"
            title="Full Form product demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  )
}
