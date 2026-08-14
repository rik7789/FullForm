export default function Feedback() {
  return (
    <section id="feedback" className="feedback reveal-section" data-shock-id="feedback">
      <div className="feedback__copy">
        <h2 className="section-title">Feedback that reads like a coach, not a spec sheet</h2>
        <p>
          Every rep gets scored against clean form for the lift you're doing.
          When something's off, you'll know which joint, which direction, and
          what to change — before it turns into a habit or an injury.
        </p>
      </div>

      <div className="hud">
        <div className="hud__top">
          <span className="hud__lift">BACK SQUAT</span>
          <span className="hud__rep">REP 6 / 8</span>
        </div>
        <div className="hud__grid">
          <div className="hud__stat"><span>HIP DEPTH</span><strong className="ok">−94°</strong></div>
          <div className="hud__stat"><span>KNEE TRACK</span><strong className="warn">−12°</strong></div>
          <div className="hud__stat"><span>BACK ANGLE</span><strong className="ok">41°</strong></div>
          <div className="hud__stat"><span>TEMPO</span><strong className="ok">2.1s</strong></div>
        </div>
        <div className="hud__log">
          <p className="ok">✓ Depth below parallel — good rep</p>
          <p className="warn">⚠ Left knee caving on ascent — push it toward your pinky toe</p>
          <p className="ok">✓ Bar path stayed vertical</p>
        </div>
      </div>
    </section>
  )
}
