import { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import Papa from 'papaparse';
import logo from '../full-logo-white.png';

const ITEM_HEIGHT = 76; // 60px height + 16px margin

function App() {
  const [step, setStep] = useState('initial'); // 'initial', 'ready', 'spinning', 'finished'
  const [participants, setParticipants] = useState([]);
  const [winner, setWinner] = useState(null);
  const [spinOffset, setSpinOffset] = useState(0);
  const [targetIndex, setTargetIndex] = useState(3);
  const [timeSeconds, setTimeSeconds] = useState(6 * 3600 + 59 * 60 + 30); // 06:59:30
  const [spinDuration, setSpinDuration] = useState(30000);

  const listRef = useRef(null);

  const containerHeight = 400;
  const initialOffset = (containerHeight / 2) - (ITEM_HEIGHT / 2);

  // Timer logic for the fake clock during spin
  useEffect(() => {
    let interval;
    if (step !== 'initial') {
      interval = setInterval(() => {
        setTimeSeconds(s => {
          // Nos aseguramos de que no pase de 7:00:00 (7 * 3600 = 25200) por si acaso hay un ligero delay
          if (s >= 25200) {
            clearInterval(interval);
            return 25200;
          }
          return s + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step]);

  const formatTime = (totalS) => {
    const h = Math.floor(totalS / 3600);
    const m = Math.floor((totalS % 3600) / 60);
    const s = totalS % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const parseData = (fileOrPath) => {
    Papa.parse(fileOrPath, {
      header: true,
      download: typeof fileOrPath === 'string',
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;
        const validParticipants = [];
        
        data.forEach(row => {
          const commentStr = row.comment || row.text || '';
          const comment = commentStr.toLowerCase();
          const username = row.username;
          
          if (!username) return;

          const mentions = (comment.match(/@/g) || []).length;
          
          if (comment.includes('yo quiero') && mentions >= 3) {
            validParticipants.push({
              username: `@${username}`,
              avatar: row.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
            });
          }
        });

        if (validParticipants.length < 5) {
          alert('No hay suficientes participantes válidos según las reglas.');
          return;
        }

        let displayList = [];
        // Repetimos muchas veces la lista para tener suficientes items para un giro de 30 segundos
        for(let i = 0; i < 40; i++) { 
          displayList = [...displayList, ...validParticipants.map((p, idx) => ({
            ...p,
            id: `${p.username}-${i}-${idx}`
          }))];
        }

        setParticipants(displayList);
        setStep('ready');
      }
    });
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) parseData(file);
  };

  const useLastFile = () => {
    parseData(import.meta.env.BASE_URL + 'sorteo.csv');
  };

  const spinRoulette = () => {
    if (step === 'spinning' || participants.length === 0) return;
    setStep('spinning');
    setWinner(null);

    const fixedSpinDuration = 10000; // Siempre dura 10 segundos fijos
    setSpinDuration(fixedSpinDuration);

    // Calculamos el número real de participantes (dividimos entre 40 que fueron las veces que repetimos la lista)
    const originalLength = participants.length / 40;
    
    // Elegimos un ganador de forma 100% aleatoria e imparcial
    const randomWinnerIndex = Math.floor(Math.random() * originalLength);
    
    // Lo ubicamos en el bloque número 38 (casi al final) para que la ruleta gire bastante
    const targetBlock = 38; 
    const newTargetIndex = (targetBlock * originalLength) + randomWinnerIndex;
    
    setTargetIndex(newTargetIndex);
    
    const distance = -(newTargetIndex * ITEM_HEIGHT) + initialOffset;
    setSpinOffset(distance);

    setTimeout(() => {
      setStep('finished');
      setWinner(participants[newTargetIndex]);
      fireConfetti();
    }, fixedSpinDuration);
  };

  const fireConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FF7900', '#ea580c', '#ffffff']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FF7900', '#ea580c', '#ffffff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  return (
    <>
      <img src={logo} alt="Logo" className="logo" />
      
      {step === 'initial' && (
        <div className="file-upload-container">
          <h2>Preparar Sorteo</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            Selecciona cómo deseas obtener los participantes.
          </p>
          
          <button className="spin-button" style={{ width: '100%', marginBottom: '1rem' }} onClick={useLastFile}>
            Trabajar con último archivo (sorteo.csv)
          </button>
          
          <p style={{ textAlign: 'center', margin: '0.5rem 0', color: 'var(--text-muted)' }}>O también puedes</p>
          
          <input 
            type="file" 
            accept=".csv" 
            id="csvUpload" 
            className="file-input"
            onChange={handleFileUpload} 
          />
          <label htmlFor="csvUpload" className="file-upload-btn" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'white' }}>
            Cargar un nuevo CSV
          </label>
        </div>
      )}

      {step !== 'initial' && (
        <>
          <div className="roulette-container">
            <div 
              className="roulette-list" 
              ref={listRef}
              style={{ 
                transform: `translateY(${step === 'spinning' || step === 'finished' ? spinOffset : -(targetIndex * ITEM_HEIGHT) + initialOffset}px)`,
                transitionDuration: step === 'spinning' ? `${spinDuration}ms` : '0ms',
                transitionTimingFunction: 'cubic-bezier(0.1, 0.7, 0.1, 1)' // Más suavidad al final para una ruleta larga
              }}
            >
              {participants.map((p, index) => {
                const isWinner = step === 'finished' && winner && winner.id === p.id && index === targetIndex;
                return (
                  <div 
                    key={p.id} 
                    className={`participant-card ${isWinner ? 'winner-style' : ''}`}
                  >
                    <img src={p.avatar} alt={p.username} className="participant-avatar" />
                    <span>{p.username}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {step === 'ready' && (
            <button 
              className="spin-button" 
              onClick={spinRoulette}
            >
              Iniciar Sorteo
            </button>
          )}

          {step === 'spinning' && (
            <button className="spin-button" disabled>
              Sorteando...
            </button>
          )}

          {step === 'finished' && winner && (
            <div className="winner-banner">
              <div className="ganadores-badge">Ganador(a)</div>
              <div className="winner-result-card">
                <img src={winner.avatar} alt={winner.username} />
                <span>{winner.username}</span>
              </div>
            </div>
          )}

          <div className="clock-display" style={{ 
            marginTop: '2rem', 
            fontSize: '2rem', 
            fontFamily: 'monospace', 
            fontWeight: 'bold', 
            color: 'var(--bg-highlight)', 
            background: 'var(--bg-card)', 
            padding: '10px 24px', 
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 20px rgba(255, 121, 0, 0.15)'
          }}>
            {formatTime(timeSeconds)}
          </div>
        </>
      )}
    </>
  );
}

export default App;
