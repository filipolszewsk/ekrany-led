import React from 'react'
import Header from './components/Header/Header'
import Hero from './components/Hero/Hero'
import Configurator from './components/Configurator/Configurator'

function App() {
  return (
    <div className="app">
      <Header />
      <main>
        <Hero />
        <Configurator />
      </main>
      
      <footer className="footer-simple">
        <div className="container">
          <p>&copy; 2026 LUMINA LED. Wszystkie prawa zastrzeżone.</p>
        </div>
      </footer>

      <style jsx>{`
        .app {
          min-height: 100vh;
        }

        .footer-simple {
          padding: 40px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          text-align: center;
          color: #52525b;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  )
}

export default App
