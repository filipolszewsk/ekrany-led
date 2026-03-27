import React from 'react';
import { motion } from 'framer-motion';
import { Layout } from 'lucide-react';

const Header = () => {
  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="header"
    >
      <div className="header-container">
        <div className="logo">
          <Layout className="logo-icon" size={28} />
          <span>LUMINA<span className="accent">LED</span></span>
        </div>
        <nav className="nav">
          <a href="#configurator" className="nav-link">Konfigurator</a>
          <a href="#about" className="nav-link">O Nas</a>
          <a href="#contact" className="nav-link">Kontakt</a>
          <button className="cta-button">Wyślij Zapytanie</button>
        </nav>
      </div>

      <style jsx>{`
        .header {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 80px;
          background: rgba(5, 5, 5, 0.8);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          z-index: 1000;
          display: flex;
          align-items: center;
        }

        .header-container {
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 3rem;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: 2px;
          color: #fff;
        }

        .logo .accent {
          color: #3b82f6;
        }

        .logo-icon {
          color: #3b82f6;
        }

        .nav {
          display: flex;
          align-items: center;
          gap: 2.5rem;
        }

        .nav-link {
          font-size: 0.9rem;
          font-weight: 500;
          color: #a1a1aa;
          transition: all 0.3s ease;
        }

        .nav-link:hover {
          color: #fff;
        }

        .cta-button {
          padding: 10px 24px;
          background: #3b82f6;
          color: white;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.39);
        }

        .cta-button:hover {
          background: #2563eb;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
        }
      `}</style>
    </motion.header>
  );
};

export default Header;
