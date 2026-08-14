const STEPS = [
  {
    num: '01',
    title: 'Open your camera',
    body: "Prop your phone or laptop up so your full body is in frame. Pick the lift you're working on and we'll set up the right tracking points for it.",
  },
  {
    num: '02',
    title: 'Do your set',
    body: 'Lift like normal. We track your joints in real time — no sensors, no wearables, just the camera you already have.',
  },
  {
    num: '03',
    title: 'Get corrected, rep by rep',
    body: 'See exactly which joint broke form and by how much, the moment it happens, plus a clean summary once you rack the weight.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how" className="how reveal-section" data-shock-id="how">
      <h2 className="section-title">Three steps. One camera.</h2>
      <ol className="how__list">
        {STEPS.map((s) => (
          <li key={s.num}>
            <span className="how__num">{s.num}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
