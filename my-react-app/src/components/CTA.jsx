import Button from './Button.jsx'

export default function CTA() {
  return (
    <section id="start" className="cta reveal-section" data-shock-id="cta">
      <h2 className="section-title">Set up your space</h2>
      <ul className="cta__tips">
        <li>Stand 6–8 feet back so your full body fits the frame</li>
        <li>Face the camera at a slight angle for lifts like squats and deadlifts</li>
        <li>Good, even lighting matters more than a good camera</li>
      </ul>
      <Button href="#" variant="solid" size="lg">Open webcam and start</Button>
    </section>
  )
}
