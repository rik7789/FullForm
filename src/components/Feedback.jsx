import specImage from '../assets/spec.png'

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

      <img className="feedback__image" src={specImage} alt="Full Form coaching feedback" />
    </section>
  )
}
