import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Shield, Zap, Maximize } from 'lucide-react';

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-container">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="hero-content"
        >
          <div className="badge">Nowoczesna Technologia LED</div>
          <h1>Twoja Wizja, <span className="accent">Nasze Ekrany</span></h1>
          <p>Twórz niestandardowe rozwiązania wizualne z naszymi modułami premium. Dowolny kształt, dowolny rozmiar, niezrównana jasność.</p>
          
          <div className="hero-btns">
            <a href="#configurator" className="btn-primary">
              Otwórz Konfigurator <ChevronRight size={20} />
            </a>
            <a href="#about" className="btn-secondary">Dowiedz się więcej</a>
          </div>

          <div className="hero-stats">
            <div className="stat">
              <Shield className="stat-icon" />
              <div>
                <span>Gwarancja 5 Lat</span>
                <p>Niezawodność</p>
              </div>
            </div>
            <div className="stat">
              <Zap className="stat-icon" />
              <div>
                <span>Energia +</span>
                <p>Oszczędność</p>
              </div>
            </div>
            <div className="stat">
              <Maximize className="stat-icon" />
              <div>
                <span>4K Ultra</span>
                <p>Rozdzielczość</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="hero-visual"
        >
          <div className="visual-glow"></div>
          <div className="led-preview">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="preview-module"></div>
            ))}
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        .hero {
          padding: 180px 0 100px;
          position: relative;
          overflow: hidden;
        }

        .hero-container {
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 4rem;
          padding: 0 3rem;
          align-items: center;
        }

        .badge {
          display: inline-block;
          padding: 6px 16px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 100px;
          color: #3b82f6;
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 2rem;
        }

        h1 {
          font-size: 4.5rem;
          font-weight: 700;
          line-height: 1.1;
          margin-bottom: 1.5rem;
          letter-spacing: -2px;
        }

        h1 .accent {
          background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        p {
          font-size: 1.25rem;
          color: #a1a1aa;
          max-width: 600px;
          line-height: 1.6;
          margin-bottom: 3rem;
        }

        .hero-btns {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 4rem;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #3b82f6;
          padding: 16px 32px;
          border-radius: 12px;
          font-weight: 600;
          color: white;
          transition: all 0.3s ease;
          box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);
        }

        .btn-primary:hover {
          background: #2563eb;
          transform: translateY(-3px);
          box-shadow: 0 15px 30px rgba(59, 130, 246, 0.4);
        }

        .btn-secondary {
          padding: 16px 32px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .hero-stats {
          display: flex;
          gap: 3rem;
        }

        .stat {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .stat-icon {
          color: #3b82f6;
          size: 24px;
        }

        .stat span {
          display: block;
          font-weight: 600;
          font-size: 1rem;
        }

        .stat p {
          font-size: 0.85rem;
          margin: 0;
          color: #71717a;
        }

        .hero-visual {
          position: relative;
          display: flex;
          justify-content: center;
        }

        .visual-glow {
          position: absolute;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%);
          filter: blur(40px);
          z-index: -1;
        }

        .led-preview {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          background: #111;
          padding: 20px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          transform: rotateX(10deg) rotateY(-20deg);
          box-shadow: 
            20px 20px 60px rgba(0, 0, 0, 0.5),
            inset 0 0 20px rgba(59, 130, 246, 0.1);
        }

        .preview-module {
          width: 120px;
          height: 80px;
          background: #1a1a1a;
          border-radius: 4px;
          position: relative;
          overflow: hidden;
        }

        .preview-module::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(45deg, transparent 30%, rgba(59, 130, 246, 0.1) 50%, transparent 70%);
          animation: scan 3s infinite linear;
        }

        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @media (max-width: 1024px) {
          .hero-container {
            grid-template-columns: 1fr;
            text-align: center;
          }
          .hero-content {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .hero-stats {
            justify-content: center;
          }
          .hero-visual {
            margin-top: 4rem;
          }
        }
      `}</style>
    </section>
  );
};

export default Hero;
