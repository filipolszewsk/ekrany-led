import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, RotateCcw, Trash2, Save, Info, Monitor, X, Link, Check } from 'lucide-react';

const Configurator = () => {
  const [modules, setModules] = useState([]);
  const [cabinetConfig, setCabinetConfig] = useState({
    pixelPitch: 2.5,
    ledModW: 320,
    ledModH: 160,
    cabCols: 3,
    cabRows: 4
  });
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [dragGhost, setDragGhost] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const workbenchContainerRef = useRef(null);
  const [addCols, setAddCols] = useState(1);
  const [addRows, setAddRows] = useState(1);
  const [addOrientation, setAddOrientation] = useState('horizontal');
  const [selectedIds, setSelectedIds] = useState([]);
  const [dragGroup, setDragGroup] = useState(null); // { dx, dy, valid }
  const dragGroupRef = useRef(null);
  const selectedIdsRef = useRef([]);
  const workbenchRef = useRef(null);
  const isDraggingRef = useRef(false);
  const moduleJustAddedRef = useRef(null);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  // Keep refs in sync with state for drag handlers (avoids stale closures)
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);
  const assignPlasterIdsToClusters = (modulesList) => {
    const visited = new Set();
    let plasterCounter = 0;
    
    const getBoundsForList = (mod) => {
      const dims = getCabinetDimensions(mod.config);
      const isRot = mod.rotation % 180 !== 0;
      const w = isRot ? dims.heightPx : dims.widthPx;
      const h = isRot ? dims.widthPx : dims.heightPx;
      return { x: mod.x, y: mod.y, w, h };
    };

    const checkTouching = (m1, m2) => {
      const b1 = getBoundsForList(m1);
      const b2 = getBoundsForList(m2);
      return !(
        b1.x + b1.w < b2.x ||
        b1.x > b2.x + b2.w ||
        b1.y + b1.h < b2.y ||
        b1.y > b2.y + b2.h
      );
    };

    modulesList.forEach(startMod => {
      if (visited.has(startMod.id)) return;
      
      const plasterId = `plaster_restored_${plasterCounter++}_${Math.random().toString(36).substr(2, 5)}`;
      const queue = [startMod];
      visited.add(startMod.id);
      
      while (queue.length > 0) {
        const current = queue.shift();
        current.plasterId = plasterId;
        
        modulesList.forEach(other => {
          if (!visited.has(other.id) && checkTouching(current, other)) {
            visited.add(other.id);
            queue.push(other);
          }
        });
      }
    });
    
    return modulesList;
  };

  useEffect(() => {
    const handleHashLoad = () => {
      try {
        if (window.location.hash.startsWith('#c=')) {
          const b64 = window.location.hash.replace('#c=', '');
          const json = decodeURIComponent(atob(b64));
          const arr = JSON.parse(json);
          const restored = arr.map(m => ({
            id: Math.random().toString(36).substr(2, 9),
            config: m.c ? { pixelPitch: m.c[0], ledModW: m.c[1], ledModH: m.c[2], cabCols: m.c[3], cabRows: m.c[4] } 
                        : (m.t === 'SP' ? { pixelPitch: 2.5, ledModW: 320, ledModH: 160, cabCols: 3, cabRows: 4 } 
                                        : { pixelPitch: 2.5, ledModW: 320, ledModH: 160, cabCols: 4, cabRows: 3 }),
            x: m.x,
            y: m.y,
            rotation: m.r
          }));
          const groupedRestored = assignPlasterIdsToClusters(restored);
          setModules(groupedRestored);
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch (e) {
        console.error('Failed to restore config from URL', e);
      }
    };

    handleHashLoad();
    window.addEventListener('hashchange', handleHashLoad);
    return () => window.removeEventListener('hashchange', handleHashLoad);
  }, []);

  const CM_TO_PX = 2.5; // 1cm = 2.5px
  const GRID_SIZE = 2.5; // 1cm grid snap

  const getCabinetDimensions = (config = cabinetConfig) => {
    const widthCm = (config.ledModW * config.cabCols) / 10;
    const heightCm = (config.ledModH * config.cabRows) / 10;
    return {
      widthCm,
      heightCm,
      widthPx: widthCm * CM_TO_PX,
      heightPx: heightCm * CM_TO_PX
    };
  };

  const totalPrice = modules.length * 2000; // Koszt zależy od założeń biznesowych, na razie stały.

  const handleShareLink = () => {
    try {
      if (modules.length === 0) return;
      const minified = modules.map(m => ({
        x: Math.round(m.x),
        y: Math.round(m.y),
        r: m.rotation,
        c: [m.config.pixelPitch, m.config.ledModW, m.config.ledModH, m.config.cabCols, m.config.cabRows]
      }));
      const json = JSON.stringify(minified);
      const b64 = btoa(encodeURIComponent(json));
      const url = `${window.location.origin}${window.location.pathname}#c=${b64}`;
      
      const copySuccess = () => {
        setIsLinkCopied(true);
        setTimeout(() => setIsLinkCopied(false), 2000);
      };

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(copySuccess).catch(() => {
          // Fallback if clipboard write fails even in secure context
          window.location.hash = `c=${b64}`;
          copySuccess();
        });
      } else {
        // Fallback for non-HTTPS local network (e.g. testing on mobile over LAN)
        window.location.hash = `c=${b64}`;
        copySuccess();
      }
    } catch (e) {
      console.error('Failed to generate share link', e);
    }
  };

  const getModuleBounds = (mod) => {
    const dims = getCabinetDimensions(mod.config || cabinetConfig);
    const isRot = mod.rotation % 180 !== 0;
    const w = isRot ? dims.heightPx : dims.widthPx;
    const h = isRot ? dims.widthPx : dims.heightPx;
    return { x: mod.x, y: mod.y, w, h };
  };

  const isColliding = (newModBounds, existingModules) => {
    // newModBounds can already have width/height if it's a grid rect
    let finalWidth = newModBounds.width;
    let finalHeight = newModBounds.height;
    
    if (!finalWidth || !finalHeight) {
       const dims = getCabinetDimensions(newModBounds.config || cabinetConfig);
       const isRot = newModBounds.rotation % 180 !== 0;
       finalWidth = isRot ? dims.heightPx : dims.widthPx;
       finalHeight = isRot ? dims.widthPx : dims.heightPx;
    }

    const EPSILON = 0.5; // Tolerancja dla błędów zmiennoprzecinkowych

    return existingModules.some(mod => {
      if (mod.id === newModBounds.id && !newModBounds.isGridBlock) return false;
      const b = getModuleBounds(mod);
      return !(
        newModBounds.x + finalWidth - EPSILON <= b.x ||
        newModBounds.x + EPSILON >= b.x + b.w ||
        newModBounds.y + finalHeight - EPSILON <= b.y ||
        newModBounds.y + EPSILON >= b.y + b.h
      );
    });
  };

  const addGrid = () => {
    setModules(prev => {
      const newModules = [...prev];
      const isAddRotated = addOrientation === 'vertical';
      const dims = getCabinetDimensions(cabinetConfig);
      const moduleWidth = isAddRotated ? dims.heightPx : dims.widthPx;
      const moduleHeight = isAddRotated ? dims.widthPx : dims.heightPx;

      if (!moduleWidth || !moduleHeight || isNaN(moduleWidth) || isNaN(moduleHeight) || moduleWidth <= 0 || moduleHeight <= 0) {
        return prev;
      }

      const gridTotalWidth = addCols * moduleWidth;
      const gridTotalHeight = addRows * moduleHeight;

      let startX = 0;
      let startY = 0;
      let foundSpot = false;

      // Find an empty spot for the entire Plaster block
      const stepX = moduleWidth;
      const stepY = moduleHeight;
      for (let attemptY = 0; attemptY < 50 && !foundSpot; attemptY++) {
        for (let attemptX = 0; attemptX < 50 && !foundSpot; attemptX++) {
          const testX = attemptX * stepX;
          const testY = attemptY * stepY;
          const gridRect = { x: testX, y: testY, width: gridTotalWidth, height: gridTotalHeight, rotation: 0, isGridBlock: true };
          if (!isColliding(gridRect, newModules)) {
            startX = testX;
            startY = testY;
            foundSpot = true;
          }
        }
      }

      let idCounter = Date.now();
      const addedIds = [];
      const plasterId = `plaster_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      for (let r = 0; r < addRows; r++) {
         for (let c = 0; c < addCols; c++) {
            const newId = idCounter++;
            addedIds.push(newId);
            newModules.push({
              id: newId,
              plasterId: plasterId,
              config: { ...cabinetConfig },
              x: startX + c * moduleWidth,
              y: startY + r * moduleHeight,
              rotation: isAddRotated ? 90 : 0,
              collisionKey: 0
            });
         }
      }

      // Auto-select the newly added grid so it can be immediately moved/rotated
      setSelectedIds(addedIds);
      return newModules;
    });
  };

  const rotateSelected = () => {
    if (selectedIds.length === 0) return;

    setModules(prev => {
      const selectedMods = prev.filter(m => selectedIds.includes(m.id));
      const unselectedMods = prev.filter(m => !selectedIds.includes(m.id));

      if (selectedMods.length === 1) {
        // Single module rotation (in place)
        const m = selectedMods[0];
        const isRotated = m.rotation % 180 !== 0;
        const dims = getCabinetDimensions(m.config || cabinetConfig);
        const oldW = isRotated ? dims.heightPx : dims.widthPx;
        const oldH = isRotated ? dims.widthPx : dims.heightPx;
        
        const newW = oldH;
        const newH = oldW;
        
        let newX = m.x + (oldW - newW) / 2;
        let newY = m.y + (oldH - newH) / 2;
        
        // Snap firmly to grid center
        newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
        newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
        
        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        
        const newRotation = (m.rotation + 90) % 360;
        const updatedMod = { ...m, x: newX, y: newY, rotation: newRotation };
        if (isColliding(updatedMod, unselectedMods)) return prev;
        return prev.map(mod => mod.id === m.id ? updatedMod : mod);
      }

      // 2. Pivot around the first selected module
      const pivotMod = selectedMods[0];
      const isPivotRotated = pivotMod.rotation % 180 !== 0;
      const dimsPivot = getCabinetDimensions(pivotMod.config || cabinetConfig);
      const pivotW = isPivotRotated ? dimsPivot.heightPx : dimsPivot.widthPx;
      const pivotH = isPivotRotated ? dimsPivot.widthPx : dimsPivot.heightPx;
      const cx = pivotMod.x + pivotW / 2;
      const cy = pivotMod.y + pivotH / 2;

      // 3. Compute rotated elements
      const updatedGroup = selectedMods.map(m => {
        const isRotated = m.rotation % 180 !== 0;
        const dims = getCabinetDimensions(m.config || cabinetConfig);
        const w = isRotated ? dims.heightPx : dims.widthPx;
        const h = isRotated ? dims.widthPx : dims.heightPx;
        
        // current center of module
        const mcx = m.x + w / 2;
        const mcy = m.y + h / 2;
        
        // 90deg CW math
        const new_mcx = cx - (mcy - cy);
        const new_mcy = cy + (mcx - cx);
        
        const newRotation = (m.rotation + 90) % 360;
        const newW = h;
        const newH = w;
        
        let newX = new_mcx - newW / 2;
        let newY = new_mcy - newH / 2;
        
        // snap to strictly prevent float drift
        newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
        newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;

        return { ...m, x: newX, y: newY, rotation: newRotation };
      });

      // 4. Auto-correct negative coordinates (bump against walls)
      const minGroupX = Math.min(...updatedGroup.map(m => m.x));
      const minGroupY = Math.min(...updatedGroup.map(m => m.y));
      
      const shiftX = minGroupX < 0 ? Math.abs(minGroupX) : 0;
      const shiftY = minGroupY < 0 ? Math.abs(minGroupY) : 0;
      
      if (shiftX > 0 || shiftY > 0) {
        updatedGroup.forEach(m => {
          m.x += shiftX;
          m.y += shiftY;
        });
      }

      // 5. Validate collisions
      let isValid = true;
      for (const m of updatedGroup) {
        if (isColliding(m, unselectedMods)) {
          isValid = false;
          break;
        }
      }

      if (!isValid) return prev; // Cancel rotation if collision

      // Replace in array
      return prev.map(m => {
        const updated = updatedGroup.find(u => u.id === m.id);
        return updated ? updated : m;
      });
    });
  };

  const removeSelected = () => {
    setModules(prev => prev.filter(m => !selectedIds.includes(m.id)));
    setSelectedIds([]);
  };

  const resetModules = () => {
    setModules([]);
    setSelectedIds([]);
  };

  const handleEmailQuote = () => {
    const stdCount = modules.filter(m => m.type === '96x64').length;
    const slimCount = modules.filter(m => m.type === '128x48').length;
    
    const subject = encodeURIComponent("Zapytanie o wycenę ekranu LED");
    const body = encodeURIComponent(`Dzień dobry,\n\nProszę o wycenę następującej konfiguracji ekranu LED wygenerowanej w konfiguratorze:\n\n` + 
      `- Moduły Standard Pro (96x64 cm): ${stdCount} szt.\n` + 
      `- Moduły Slim Wide (128x48 cm): ${slimCount} szt.\n\n` + 
      `Łączna liczba modułów: ${modules.length}\n` + 
      `Orientacyjna cena z konfiguratora: ${totalPrice.toLocaleString()} PLN\n\n` + 
      `Proszę o kontakt w celu omówienia szczegółów.\n\nPozdrawiam,`);
      
    window.location.href = `mailto:kontakt@luminaled.pl?subject=${subject}&body=${body}`;
  };

  // Calculate bounding box for real-time size info
  const calculateTotalDimensions = () => {
    if (modules.length === 0) return { w: 0, h: 0 };
    return { w: 0, h: 0 }; 
  };

  const fitToScreen = () => {
    if (!workbenchContainerRef.current) return;
    const { clientWidth: viewW, clientHeight: viewH } = workbenchContainerRef.current;
    if (modules.length === 0) {
      setZoom(1);
      setPan({ x: viewW / 2, y: viewH / 2 });
      return;
    }
    let minX = Infinity, minY = Infinity, maxR = -Infinity, maxB = -Infinity;
    modules.forEach(m => {
      const b = getModuleBounds(m);
      if (b.x < minX) minX = b.x;
      if (b.y < minY) minY = b.y;
      if (b.x + b.w > maxR) maxR = b.x + b.w;
      if (b.y + b.h > maxB) maxB = b.y + b.h;
    });
    const padding = 80;
    const newZoom = Math.max(0.05, Math.min(1, (viewW - padding * 2) / (maxR - minX), (viewH - padding * 2) / (maxB - minY)));
    const cx = (minX + maxR) / 2;
    const cy = (minY + maxB) / 2;
    setZoom(newZoom);
    setPan({ x: viewW / 2 - cx * newZoom, y: viewH / 2 - cy * newZoom });
  };

  // Init: center canvas + wheel zoom (passive:false required)
  useEffect(() => {
    const el = workbenchContainerRef.current;
    if (!el) return;
    setPan({ x: el.clientWidth / 2, y: el.clientHeight / 2 });
    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setZoom(prevZoom => {
        const newZoom = Math.min(3, Math.max(0.05, prevZoom * factor));
        const sf = newZoom / prevZoom;
        setPan(p => ({ x: mouseX - (mouseX - p.x) * sf, y: mouseY - (mouseY - p.y) * sf }));
        return newZoom;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Auto-fit when modules change (e.g. after adding)
  useEffect(() => {
    fitToScreen();
  }, [modules.length]);

  const areTouching = (m1, m2) => {
    const b1 = getModuleBounds(m1);
    const b2 = getModuleBounds(m2);
    return !(
      b1.x + b1.w < b2.x ||
      b1.x > b2.x + b2.w ||
      b1.y + b1.h < b2.y ||
      b1.y > b2.y + b2.h
    );
  };

  const getClusters = () => {
    if (modules.length === 0) return [];
    
    const visited = new Set();
    const clusters = [];
    
    modules.forEach(startMod => {
      if (visited.has(startMod.id)) return;
      
      const cluster = [];
      const queue = [startMod];
      visited.add(startMod.id);
      
      while (queue.length > 0) {
        const current = queue.shift();
        cluster.push(current);
        
        modules.forEach(other => {
          if (!visited.has(other.id) && areTouching(current, other)) {
            visited.add(other.id);
            queue.push(other);
          }
        });
      }
      clusters.push(cluster);
    });
    
    return clusters.map((cluster, index) => {
      let minX = Infinity, minY = Infinity;
      let maxR = -Infinity, maxB = -Infinity;
      
      cluster.forEach(m => {
        const b = getModuleBounds(m);
        if (b.x < minX) minX = b.x;
        if (b.y < minY) minY = b.y;
        if (b.x + b.w > maxR) maxR = b.x + b.w;
        if (b.y + b.h > maxB) maxB = b.y + b.h;
      });
      
      const widthPx = maxR - minX;
      const heightPx = maxB - minY;
      const pp = cluster[0]?.config?.pixelPitch || cabinetConfig.pixelPitch;
      
      const widthCm = Math.round(widthPx / CM_TO_PX);
      const heightCm = Math.round(heightPx / CM_TO_PX);
      
      return {
        id: index + 1,
        count: cluster.length,
        widthCm,
        heightCm,
        resW: Math.round(widthCm * 10 / pp),
        resH: Math.round(heightCm * 10 / pp),
        pp
      };
    }).sort((a,b) => b.count - a.count);
  };

  const getAspectRatio = (w, h) => {
    const wi = Math.round(w);
    const hi = Math.round(h);
    if (!wi || !hi || isNaN(wi) || isNaN(hi) || !isFinite(wi) || !isFinite(hi) || wi <= 0 || hi <= 0) return '';
    
    const gcd = (a, b) => {
      if (isNaN(b) || !isFinite(b) || b <= 0) return a;
      return gcd(b, a % b);
    };
    
    const d = gcd(wi, hi);
    if (!d || isNaN(d) || !isFinite(d) || d <= 0) return '';
    
    const rw = wi / d;
    const rh = hi / d;
    if (rw > 100 || rh > 100) return `${(wi / hi).toFixed(2)}:1`;
    return `${rw}:${rh}`;
  };

  return (
    <section id="configurator" className="configurator">
      <div className="container">
        <div className="config-header">
          <h2>Konfigurator Twojego Ekranu</h2>
          <p>Wybierz rozmiar modułu i ułóż swój wymarzony ekran LED.</p>
        </div>

        <div className="config-layout">
          {/* Controls Panel */}
          <div className="controls glass">
            <div className="control-group">
              <label>Parametry Gabinetu</label>
              
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Pixel Pitch (mm)</span>
                  <input type="number" step="0.1" value={cabinetConfig.pixelPitch} 
                    onChange={e => setCabinetConfig(p => ({ ...p, pixelPitch: parseFloat(e.target.value) || 2.5 }))}
                    style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '6px' }} />
                </div>
              </div>

              <span style={{ fontSize: '0.75rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>Rozmiar Modułu LED (mm)</span>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <input type="number" value={cabinetConfig.ledModW} placeholder="Szer."
                    onChange={e => setCabinetConfig(p => ({ ...p, ledModW: parseInt(e.target.value) || 320 }))}
                    style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '6px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <input type="number" value={cabinetConfig.ledModH} placeholder="Wys."
                    onChange={e => setCabinetConfig(p => ({ ...p, ledModH: parseInt(e.target.value) || 160 }))}
                    style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '6px' }} />
                </div>
              </div>

              <span style={{ fontSize: '0.75rem', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>Układ Gabinetu (kolumny x rzędy modułów)</span>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <input type="number" value={cabinetConfig.cabCols} placeholder="Kolumny"
                    onChange={e => setCabinetConfig(p => ({ ...p, cabCols: parseInt(e.target.value) || 1 }))}
                    style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '6px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <input type="number" value={cabinetConfig.cabRows} placeholder="Rzędy"
                    onChange={e => setCabinetConfig(p => ({ ...p, cabRows: parseInt(e.target.value) || 1 }))}
                    style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '6px' }} />
                </div>
              </div>
              
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <div style={{ fontSize: '0.85rem', color: '#60a5fa', marginBottom: '4px' }}>Wynikowy Plaster (Gabinet):</div>
                <div style={{ color: 'white', fontWeight: 'bold' }}>
                  {getCabinetDimensions().widthCm} cm x {getCabinetDimensions().heightCm} cm
                </div>
                <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
                  Rozdzielczość: {Math.round(getCabinetDimensions().widthCm * 10 / cabinetConfig.pixelPitch)} x {Math.round(getCabinetDimensions().heightCm * 10 / cabinetConfig.pixelPitch)} px
                </div>
              </div>
            </div>

            <div className="action-btns">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2', marginBottom: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>Orientacja Modułu</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <button 
                    style={{ flex: 1, padding: '8px', background: addOrientation === 'horizontal' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${addOrientation === 'horizontal' ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`, color: addOrientation === 'horizontal' ? '#fff' : '#a1a1aa', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }} 
                    onClick={() => setAddOrientation('horizontal')}
                  >Poziomo</button>
                  <button 
                    style={{ flex: 1, padding: '8px', background: addOrientation === 'vertical' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${addOrientation === 'vertical' ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`, color: addOrientation === 'vertical' ? '#fff' : '#a1a1aa', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }} 
                    onClick={() => setAddOrientation('vertical')}
                  >Pionowo</button>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <span style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '4px', textTransform: 'uppercase' }}>Poziomo (kolumny)</span>
                    <input 
                      type="number" min="1" max="20" value={addCols} 
                      onChange={(e) => setAddCols(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px', textAlign: 'center', fontSize: '1rem' }}
                    />
                  </div>
                  <X size={16} color="#71717a" style={{ marginTop: '20px' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <span style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '4px', textTransform: 'uppercase' }}>Pionowo (rzędy)</span>
                    <input 
                      type="number" min="1" max="20" value={addRows} 
                      onChange={(e) => setAddRows(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px', textAlign: 'center', fontSize: '1rem' }}
                    />
                  </div>
                </div>
                <button className="add-btn" onClick={addGrid} style={{ width: '100%', background: '#3b82f6', color: 'white', padding: '12px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none', cursor: 'pointer', gridColumn: 'span 2' }}>
                  <Plus size={20} /> Dodaj Plaster ({addCols * addRows} szt.)
                </button>
              </div>
              
              {selectedIds.length > 0 && (
                <>
                  <button className="action-btn" onClick={rotateSelected} style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6', color: '#fff', borderRadius: '8px', padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 600 }}>
                    <RotateCcw size={16} /> Obróć
                  </button>
                  <button className="action-btn" onClick={removeSelected} style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fff', borderRadius: '8px', padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 600 }}>
                    <Trash2 size={16} /> Usuń
                  </button>
                </>
              )}

              <button className="reset-btn" onClick={resetModules} style={{ gridColumn: selectedIds.length > 0 ? 'span 2' : 'span 2' }}>
                <RotateCcw size={20} /> Resetuj
              </button>
            </div>

            <div className="summary glass">
              <div className="summary-item">
                <span>Liczba modułów:</span>
                <span className="value">{modules.length}</span>
              </div>
              <div className="summary-item price">
                <span>Cena orientacyjna:</span>
                <span className="value">{totalPrice.toLocaleString()} PLN</span>
              </div>
              <button className="save-btn" onClick={handleEmailQuote}>
                Generuj Ofertę <Save size={18} />
              </button>
              <button 
                className="save-btn" 
                onClick={handleShareLink}
                style={{ 
                  marginTop: '10px', 
                  background: isLinkCopied ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)', 
                  color: isLinkCopied ? '#10b981' : '#a1a1aa', 
                  border: `1px solid ${isLinkCopied ? '#10b981' : 'rgba(255,255,255,0.1)'}` 
                }}
              >
                {isLinkCopied ? 'Link Skopiowany!' : 'Udostępnij Link'}
                {isLinkCopied ? <Check size={18} /> : <Link size={18} />}
              </button>
            </div>
          </div>

          <div className="workbench-container">
            <div
              ref={workbenchContainerRef}
              className="workbench"
              style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
              onPointerDown={(e) => {
                if (e.target.closest('.module-item')) return;
                setSelectedIds([]);
                setIsPanning(true);
                panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
              }}
              onPointerMove={(e) => {
                if (!isPanning) return;
                setPan({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
              }}
              onPointerUp={() => setIsPanning(false)}
              onPointerLeave={() => setIsPanning(false)}
              onPointerCancel={() => setIsPanning(false)}
            >
              {/* Pan translate wrapper - outside Framer so drag offsets stay correct */}
              <div style={{ position: 'absolute', top: 0, left: 0, transform: `translate(${pan.x}px, ${pan.y}px)` }}>
                {/* Framer controls scale so drag offset math is correct */}
                <motion.div
                  ref={workbenchRef}
                  className={`grid-canvas ${isGridVisible ? 'grid-on' : ''}`}
                  animate={{ scale: zoom }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  style={{ originX: 0, originY: 0, width: '8000px', height: '8000px' }}
                >
                <AnimatePresence>
                {modules.map((module) => (
                  <motion.div
                    key={`${module.id}-${module.collisionKey || 0}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                      opacity: (dragGroup && selectedIds.includes(module.id)) ? 0 : 1, 
                      scale: 1,
                      x: module.x,
                      y: module.y
                    }}
                    transition={{
                      default: { type: "spring", stiffness: 400, damping: 30 },
                      x: { type: "tween", duration: 0 },
                      y: { type: "tween", duration: 0 },
                      opacity: { duration: 0 }
                    }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    drag
                    dragMomentum={false}
                    onDrag={(e, info) => {
                      isDraggingRef.current = true;
                      const curSelected = selectedIdsRef.current;
                      if (!curSelected.includes(module.id)) return;
                      
                      const rawDx = info.offset.x / zoom;
                      const rawDy = info.offset.y / zoom;
                      
                      let finalDx = rawDx;
                      let finalDy = rawDy;
                      
                      const unselectedMods = modules.filter(m => !curSelected.includes(m.id));
                      const groupMods = modules.filter(m => curSelected.includes(m.id));
                      
                      // Magnetic Snapping
                      const SNAP_DIST = 20; // px
                      let minDx = SNAP_DIST;
                      let minDy = SNAP_DIST;
                      let bestDx = 0;
                      let bestDy = 0;

                      for (const dMod of groupMods) {
                        const dBounds = getModuleBounds({ ...dMod, x: dMod.x + rawDx, y: dMod.y + rawDy });
                        
                        for (const oMod of unselectedMods) {
                          const oBounds = getModuleBounds(oMod);
                          
                          const dxOptions = [
                            oBounds.x - (dBounds.x + dBounds.w),
                            (oBounds.x + oBounds.w) - dBounds.x,
                            oBounds.x - dBounds.x,
                            (oBounds.x + oBounds.w) - (dBounds.x + dBounds.w)
                          ];
                          for (const dx of dxOptions) {
                            if (Math.abs(dx) < Math.abs(minDx)) { minDx = dx; bestDx = dx; }
                          }

                          const dyOptions = [
                            oBounds.y - (dBounds.y + dBounds.h),
                            (oBounds.y + oBounds.h) - dBounds.y,
                            oBounds.y - dBounds.y,
                            (oBounds.y + oBounds.h) - (dBounds.y + dBounds.h)
                          ];
                          for (const dy of dyOptions) {
                            if (Math.abs(dy) < Math.abs(minDy)) { minDy = dy; bestDy = dy; }
                          }
                        }
                      }

                      if (Math.abs(minDx) < SNAP_DIST) {
                        finalDx += bestDx;
                      } else {
                        finalDx = Math.round(finalDx / GRID_SIZE) * GRID_SIZE;
                      }

                      if (Math.abs(minDy) < SNAP_DIST) {
                        finalDy += bestDy;
                      } else {
                        finalDy = Math.round(finalDy / GRID_SIZE) * GRID_SIZE;
                      }
                      
                      let isValid = true;
                      for (const m of groupMods) {
                        const moved = { ...m, x: m.x + finalDx, y: m.y + finalDy };
                        if (isColliding(moved, unselectedMods)) {
                          isValid = false;
                          break;
                        }
                      }
                      
                      const dg = { dx: finalDx, dy: finalDy, valid: isValid };
                      dragGroupRef.current = dg;
                      setDragGroup(dg);
                    }}
                    onDragEnd={(e, info) => {
                      setTimeout(() => { isDraggingRef.current = false; }, 100);
                      const dg = dragGroupRef.current;
                      dragGroupRef.current = null;
                      setDragGroup(null);
                      
                      if (!dg) return;
                      
                      const finalDx = dg.dx;
                      const finalDy = dg.dy;
                      const isValid = dg.valid;
                      const curSelected = selectedIdsRef.current;
                      
                      if (isValid && (finalDx !== 0 || finalDy !== 0)) {
                        setModules(prev => prev.map(m => {
                          if (curSelected.includes(m.id)) {
                            return { ...m, x: m.x + finalDx, y: m.y + finalDy };
                          }
                          return m;
                        }));
                      } else {
                        // Revert visual jump or micro-drags that didn't cross the grid threshold
                        setModules(prev => prev.map(m => {
                          if (curSelected.includes(m.id)) {
                            return { ...m, collisionKey: (m.collisionKey || 0) + 1 };
                          }
                          return m;
                        }));
                      }
                    }}
                    onPointerDown={(e) => {
                      const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
                      const targetPlasterId = module.plasterId;
                      
                      const siblingIds = targetPlasterId 
                        ? modules.filter(m => m.plasterId === targetPlasterId).map(m => m.id)
                        : [module.id];
                        
                      if (isMultiSelect) {
                        const anySelected = siblingIds.some(id => selectedIds.includes(id));
                        if (anySelected) {
                          setSelectedIds(prev => prev.filter(id => !siblingIds.includes(id)));
                        } else {
                          setSelectedIds(prev => [...prev, ...siblingIds]);
                        }
                      } else {
                        const isAlreadySelected = siblingIds.every(id => selectedIds.includes(id));
                        if (!isAlreadySelected) {
                          setSelectedIds(siblingIds);
                        }
                      }
                      moduleJustAddedRef.current = module.id;
                    }}
                    onClick={(e) => {
                      if (isDraggingRef.current) {
                        moduleJustAddedRef.current = null;
                        return;
                      }
                      
                      if (moduleJustAddedRef.current === module.id) {
                         moduleJustAddedRef.current = null;
                      } else {
                         const targetPlasterId = module.plasterId;
                         const siblingIds = targetPlasterId 
                           ? modules.filter(m => m.plasterId === targetPlasterId).map(m => m.id)
                           : [module.id];
                         setSelectedIds(prev => prev.filter(id => !siblingIds.includes(id)));
                      }
                    }}
                    className={`module-item ${selectedIds.includes(module.id) ? 'selected' : ''}`}
                    style={{
                      width: `${module.rotation % 180 !== 0 ? getCabinetDimensions(module.config || cabinetConfig).heightPx : getCabinetDimensions(module.config || cabinetConfig).widthPx}px`,
                      height: `${module.rotation % 180 !== 0 ? getCabinetDimensions(module.config || cabinetConfig).widthPx : getCabinetDimensions(module.config || cabinetConfig).heightPx}px`,
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      opacity: (dragGroup && selectedIds.includes(module.id)) ? 0.01 : 1
                    }}
                  >
                    <div className="module-content" style={{ transform: `rotate(${module.rotation}deg)` }}>
                      <span className="module-label">P{module.config ? module.config.pixelPitch : cabinetConfig.pixelPitch}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Group Drag Feedback */}
              {dragGroup && modules.filter(m => selectedIds.includes(m.id)).map(m => {
                const isRotated = m.rotation % 180 !== 0;
                const dims = getCabinetDimensions(m.config || cabinetConfig);
                const width = isRotated ? dims.heightPx : dims.widthPx;
                const height = isRotated ? dims.widthPx : dims.heightPx;
                return (
                  <div
                    key={`ghost-${m.id}`}
                    className={`ghost-box ${dragGroup.valid ? 'valid' : 'invalid'}`}
                    style={{
                      position: 'absolute',
                      left: m.x + dragGroup.dx,
                      top: m.y + dragGroup.dy,
                      width,
                      height,
                      border: `2px dashed ${dragGroup.valid ? '#10b981' : '#ef4444'}`,
                      backgroundColor: dragGroup.valid ? '#3b82f6' : '#ef4444',
                      opacity: 0.8,
                      boxShadow: '0 0 30px rgba(59, 130, 246, 0.8)',
                      zIndex: 1000,
                      pointerEvents: 'none',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: '900',
                      textShadow: '0 1px 3px rgba(0,0,0,1)'
                    }}
                  >
                    P{m.config ? m.config.pixelPitch : cabinetConfig.pixelPitch}
                  </div>
                );
              })}

              {modules.length === 0 && (
                <div className="empty-state">
                  <Monitor size={48} className="empty-icon" />
                  <p>Twój obszar roboczy jest pusty.<br/>Dodaj pierwszy moduł, aby zacząć.</p>
                </div>
              )}
              </motion.div>
              </div>
            </div>
            
            <div className="workbench-footer">
              <div className="view-controls" style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setIsGridVisible(!isGridVisible)}>
                  {isGridVisible ? 'Ukryj Siatkę' : 'Pokaż Siatkę'}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '6px' }}>
                  <button style={{ border: 'none', background: 'none', padding: '0 8px', fontSize: '0.85rem', cursor: 'pointer', color: '#3b82f6', fontWeight: 'bold' }} onClick={fitToScreen}>Dopasuj</button>
                  <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }}></div>
                  <button style={{ border: 'none', background: 'none', padding: '0 4px', fontSize: '1rem', cursor: 'pointer', color: '#a1a1aa' }} onClick={() => setZoom(z => Math.max(0.01, z - 0.01))}>🔍-</button>
                  <span style={{ minWidth: '45px', textAlign: 'center', fontSize: '0.8rem', color: '#fff' }}>{Math.round(zoom * 100)}%</span>
                  <button style={{ border: 'none', background: 'none', padding: '0 4px', fontSize: '1rem', cursor: 'pointer', color: '#a1a1aa' }} onClick={() => setZoom(z => Math.min(3, z + 0.01))}>🔍+</button>
                </div>
              </div>
              <div className="size-indicator">
                Obszar roboczy: Przytrzymaj i przeciągnij moduły, aby je ułożyć.
              </div>
            </div>
          </div>
        </div>

        {/* CLUSTERS SUMMARY */}
        <div style={{ marginTop: '2rem', background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Monitor size={20} color="#3b82f6" /> Podsumowanie Twoich Ekranów
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {getClusters().map(cluster => (
              <div key={cluster.id} style={{ padding: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.1)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontWeight: '700', color: '#3b82f6', fontSize: '1.1rem' }}>Ekran {cluster.id}</div>
                <div style={{ fontSize: '0.95rem', color: '#a1a1aa' }}>Szerokość: <span style={{ color: '#fff', fontWeight: 'bold' }}>{cluster.widthCm} cm</span></div>
                <div style={{ fontSize: '0.95rem', color: '#a1a1aa' }}>Wysokość: <span style={{ color: '#fff', fontWeight: 'bold' }}>{cluster.heightCm} cm</span></div>
                <div style={{ fontSize: '0.95rem', color: '#a1a1aa' }}>Rozdzielczość: <span style={{ color: '#fff', fontWeight: 'bold' }}>{cluster.resW} x {cluster.resH} px</span> <span style={{ fontSize: '0.8rem' }}>(P{cluster.pp})</span></div>
                <div style={{ fontSize: '0.95rem', color: '#a1a1aa' }}>Proporcje: <span style={{ color: '#fff', fontWeight: 'bold' }}>{getAspectRatio(cluster.resW, cluster.resH)}</span></div>
                <div style={{ fontSize: '0.9rem', color: '#71717a', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>Złożony z {cluster.count} gabinetów</div>
              </div>
            ))}
            {modules.length === 0 && <span style={{ color: '#71717a' }}>Dodaj moduły, aby zobaczyć dokładne wymiary gotowych ekranów.</span>}
          </div>
        </div>
      </div>

      <style>{`
        .configurator {
          padding: 100px 0;
          background: #080808;
        }

        .config-header {
          text-align: center;
          margin-bottom: 4rem;
        }

        .config-header h2 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }

        .config-header p {
          color: #a1a1aa;
        }

        .config-layout {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 2rem;
          height: 700px;
          overflow: hidden;
        }

        .controls {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
          height: 100%;
          overflow-y: auto;
          box-sizing: border-box;
        }

        .control-group label {
          display: block;
          font-size: 0.9rem;
          font-weight: 600;
          color: #71717a;
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .module-selector {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .type-btn {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 12px 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          transition: all 0.3s ease;
          text-align: left;
          background: rgba(255, 255, 255, 0.02);
          color: #a1a1aa;
        }

        .type-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .type-btn.active {
          background: rgba(59, 130, 246, 0.1);
          border-color: #3b82f6;
          color: #fff;
        }

        .type-name {
          font-weight: 600;
          font-size: 1rem;
        }

        .type-size {
          font-size: 0.8rem;
          opacity: 0.6;
        }

        .info-box {
          background: rgba(59, 130, 246, 0.05);
          padding: 12px;
          border-radius: 8px;
          border: 1px solid rgba(59, 130, 246, 0.1);
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          color: #3b82f6;
        }

        .action-btns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .add-btn {
          grid-column: span 2;
          background: #3b82f6;
          color: white;
          padding: 12px;
          border-radius: 8px;
          font-weight: 600;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
        }

        .add-btn:hover {
          background: #2563eb;
          transform: translateY(-2px);
        }

        .reset-btn {
          grid-column: span 2;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #a1a1aa;
          padding: 10px;
          border-radius: 8px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
        }

        .summary {
          margin-top: auto;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
          color: #a1a1aa;
        }

        .summary-item.price {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 1rem;
          color: #fff;
          font-weight: 700;
        }

        .summary-item .value {
          color: #fff;
        }

        .summary-item.price .value {
          color: #3b82f6;
          font-size: 1.25rem;
        }

        .save-btn {
          background: #fff;
          color: #000;
          padding: 14px;
          border-radius: 8px;
          font-weight: 700;
          margin-top: 0.5rem;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
        }

        .workbench-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .workbench {
          flex: 1;
          background: #000;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          position: relative;
          overflow: hidden;
          padding: 0;
          display: block;
          user-select: none;
        }

        .grid-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 8000px;
          height: 8000px;
        }

        .grid-canvas.grid-on {
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          background-size: ${GRID_SIZE}px ${GRID_SIZE}px;
        }

        .module-item {
          background: #111;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          cursor: grab;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .module-item.selected {
          border-color: #3b82f6;
          background: #3b82f6 !important;
          box-shadow: 0 0 25px rgba(59, 130, 246, 0.6);
          z-index: 50 !important;
        }
        
        .module-item.selected .module-label {
          color: white !important;
          font-weight: 900;
        }

        .module-item:active {
          cursor: grabbing;
          z-index: 100;
        }

        .module-actions {
          position: absolute;
          top: 4px;
          right: 4px;
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .module-item:hover .module-actions {
          opacity: 1;
        }

        .rotate-mod, .delete-mod {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .rotate-mod:hover {
          background: #3b82f6;
        }

        .delete-mod:hover {
          background: #ef4444;
        }

        .empty-state {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          color: #3f3f46;
        }

        .empty-icon {
          margin-bottom: 1rem;
          opacity: 0.3;
        }

        .workbench-footer {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: #52525b;
        }

        .view-controls button {
          color: #a1a1aa;
          font-size: 0.8rem;
          padding: 4px 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }

        @media (max-width: 1024px) {
          .config-layout {
            grid-template-columns: 1fr;
            height: auto;
          }
          .controls {
            order: 2;
          }
          .workbench-container {
            order: 1;
            height: 500px;
          }
        }
      `}</style>
    </section>
  );
};

export default Configurator;
