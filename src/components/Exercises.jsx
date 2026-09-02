const EXERCISES = [
  { name: 'Squat', body: 'We check hip depth, knee tracking, and whether your back angle collapses under load.' },
  { name: 'Deadlift', body: 'We watch your spine stay neutral and catch the bar drifting away from your shins.' },
  { name: 'Push-up', body: 'We flag sagging hips, flared elbows, and reps that stop short of full depth.' },
  { name: 'Lunge', body: 'We track front-knee alignment and torso lean so your knee stays over your ankle.' },
  { name: 'Overhead press', body: 'We catch excess lower-back arch and a bar path that drifts in front of your face.' },
  { name: 'Plank', body: 'We measure hip sag and pike in real time so you hold a straight line, not just a timer.' },
]

export default function Exercises() {
  return (
    <section id="exercises" className="exercises reveal-section" data-shock-id="exercises">
      <h2 className="section-title">Built for the lifts you actually mess up</h2>
      <div className="ex-grid">
        {EXERCISES.map((ex) => (
          <article className="ex-card" key={ex.name}>
            <h3>{ex.name}</h3>
            <p>{ex.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
