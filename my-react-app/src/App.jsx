import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import HowItWorks from './components/HowItWorks.jsx'
import Feedback from './components/Feedback.jsx'
import Exercises from './components/Exercises.jsx'
import CTA from './components/CTA.jsx'
import Footer from './components/Footer.jsx'
import ShockwaveCanvas from './components/ShockwaveCanvas.jsx'
import './App.css'

export default function App() {
  return (
    <>
      <ShockwaveCanvas />
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Feedback />
        <Exercises />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
