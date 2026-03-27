import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, RotateCcw, Trash2, Save, Info, Monitor, X, Link, Check } from 'lucide-react';

const Configurator = () => {
  const [modules, setModules] = useState([]);
  const [selectedType, setSelectedType] = useState('96x64');
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [dragGhost, setDragGhost] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [addCols, setAddCols] = useState(1);
  const [addRows, setAddRows] = useState(1);
  const [addOrientation, setAddOrientation] = useState('horizontal');
  const [selectedIds, setSelectedIds] = useState([]);
  const [dragGroup, setDragGroup] = useState(null); // { dx, dy, valid }
  const workbenchRef = useRef(null);
  const isDraggingRef = useRef(false);
  const moduleJustAddedRef = useRef(null);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  useEffect(() => {
    const handleHashLoad = () => {
      try {
        if (window.location.hash.startsWith('#c=')) {
          const b64 = window.location.hash.replace('#c=', '');
          const json = decodeURIComponent(atob(b64));
          const arr = JSON.parse(json);
          const restored = arr.map(m => ({
            id: Math.random().toString(36).substr(2, 9),
            type: m.t === 'SP' ? '96x64' : '128x48',
            x: m.x,
            y: m.y,
            rotation: m.r
          }));
          setModules(restored);
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

  const GRID_SIZE = 40; // 16cm = 40px
  const CM_TO_PX = 2.5; // 1cm = 2.5px

  const moduleTypes = {
    '96x64': { width: 96 * CM_TO_PX, height: 64 * CM_TO_PX, name: 'Standard Pro', price: 2000 },
    '128x48': { width: 128 * CM_TO_PX, height: 48 * CM_TO_PX, name: 'Slim Wide', price: 2000 }
  };

  const totalPrice = modules.length * 2000;

  const handleShareLink = () => {
    try {
      if (modules.length === 0) return;
      const minified = modules.map(m => ({
        x: m.x,
        y: m.y,
        r: m.rotation,
        t: m.type === '96x64' ? 'SP' : 'SW'
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
    const isRot = mod.rotation % 180 !== 0;
    const w = isRot ? moduleTypes[mod.type].height : moduleTypes[mod.type].width;
    const h = isRot ? moduleTypes[mod.type].width : moduleTypes[mod.type].height;
    return { x: mod.x, y: mod.y, w, h };
  };

  const isColliding = (newModBounds, existingModules) => {
    const isRot = newModBounds.rotation % 180 !== 0;
    const width = isRot ? moduleTypes[newModBounds.type || selectedType].height : moduleTypes[newModBounds.type || selectedType].width;
    const height = isRot ? moduleTypes[newModBounds.type || selectedType].width : moduleTypes[newModBounds.type || selectedType].height;
    // Note: newModBounds can already have width/height if it's a grid rect, so we need to fallback
    const finalWidth = newModBounds.width || width;
    const finalHeight = newModBounds.height || height;

    return existingModules.some(mod => {
      if (mod.id === newModBounds.id && !newModBounds.isGridBlock) return false;
      const b = getModuleBounds(mod);
      return !(
        newModBounds.x + finalWidth <= b.x ||
        newModBounds.x >= b.x + b.w ||
        newModBounds.y + finalHeight <= b.y ||
        newModBounds.y >= b.y + b.h
      );
    });
  };

  const addGrid = () => {
    setModules(prev => {
      const newModules = [...prev];
      const isAddRotated = addOrientation === 'vertical';
      const baseWidth = moduleTypes[selectedType].width;
      const baseHeight = moduleTypes[selectedType].height;
      const moduleWidth = isAddRotated ? baseHeight : baseWidth;
      const moduleHeight = isAddRotated ? baseWidth : baseHeight;

      const gridTotalWidth = addCols * moduleWidth;
      const gridTotalHeight = addRows * moduleHeight;

      let startX = 0;
      let startY = 0;
      let foundSpot = false;

      // Find an empty spot for the entire Plaster block
      for (let attemptY = 0; attemptY < 100 && !foundSpot; attemptY++) {
        for (let attemptX = 0; attemptX < 100 && !foundSpot; attemptX++) {
          const testX = attemptX * GRID_SIZE; // Use GRID_SIZE for placement attempts
          const testY = attemptY * GRID_SIZE; // Use GRID_SIZE for placement attempts
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

      for (let r = 0; r < addRows; r++) {
         for (let c = 0; c < addCols; c++) {
            const newId = idCounter++;
            addedIds.push(newId);
            newModules.push({
              id: newId,
              type: selectedType,
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
        const oldW = isRotated ? moduleTypes[m.type].height : moduleTypes[m.type].width;
        const oldH = isRotated ? moduleTypes[m.type].width : moduleTypes[m.type].height;
        
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
      const pivotW = isPivotRotated ? moduleTypes[pivotMod.type].height : moduleTypes[pivotMod.type].width;
      const pivotH = isPivotRotated ? moduleTypes[pivotMod.type].width : moduleTypes[pivotMod.type].height;
      const cx = pivotMod.x + pivotW / 2;
      const cy = pivotMod.y + pivotH / 2;

      // 3. Compute rotated elements
      const updatedGroup = selectedMods.map(m => {
        const isRotated = m.rotation % 180 !== 0;
        const w = isRotated ? moduleTypes[m.type].height : moduleTypes[m.type].width;
        const h = isRotated ? moduleTypes[m.type].width : moduleTypes[m.type].height;
        
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
    if (modules.length === 0 || !workbenchRef.current) return;
    
    const container = workbenchRef.current.parentElement;
    const viewW = container.clientWidth;
    const viewH = container.clientHeight;
    
    let maxR = 0;
    let maxB = 0;
    
    modules.forEach(m => {
      const b = getModuleBounds(m);
      if (b.x + b.w > maxR) maxR = b.x + b.w;
      if (b.y + b.h > maxB) maxB = b.y + b.h;
    });

    const requiredW = maxR + 100;
    const requiredH = maxB + 100;
    
    const requiredScaleX = viewW / requiredW;
    const requiredScaleY = viewH / requiredH;
    
    const neededScale = Math.min(1, requiredScaleX, requiredScaleY);
    const targetZoom = Math.max(0.01, (Math.floor(neededScale * 100) / 100));
    
    setZoom(targetZoom);
  };

  useEffect(() => {
    if (modules.length === 0 || !workbenchRef.current) return;
    fitToScreen();
  }, [modules]);

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
      
      return {
        id: index + 1,
        count: cluster.length,
        widthCm: Math.round((widthPx / GRID_SIZE) * 16),
        heightCm: Math.round((heightPx / GRID_SIZE) * 16)
      };
    }).sort((a,b) => b.count - a.count);
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
              <label>Typ Modułu</label>
              <div className="module-selector">
                {Object.keys(moduleTypes).map(type => (
                  <button 
                    key={type}
                    className={`type-btn ${selectedType === type ? 'active' : ''}`}
                    onClick={() => setSelectedType(type)}
                  >
                    <span className="type-name">{moduleTypes[type].name}</span>
                    <span className="type-size">{type} cm</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="info-box">
              <div className="info-item">
                <Info size={16} />
                <span>Koszt za moduł: 2 000 PLN</span>
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
            <div className="workbench">
              <motion.div 
                ref={workbenchRef} 
                className={`grid-canvas ${isGridVisible ? 'grid-on' : ''}`}
                animate={{ scale: zoom }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{ originX: 0, originY: 0, width: `${100/zoom}%`, height: `${100/zoom}%` }}
                onPointerDown={(e) => {
                  if (e.target === workbenchRef.current) {
                    setSelectedIds([]);
                  }
                }}
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
                      if (!selectedIds.includes(module.id)) return; // Should not happen if configured right
                      
                      const newX = Math.round((module.x + (info.offset.x / zoom)) / GRID_SIZE) * GRID_SIZE;
                      const newY = Math.round((module.y + (info.offset.y / zoom)) / GRID_SIZE) * GRID_SIZE;
                      
                      const dx = newX - module.x;
                      const dy = newY - module.y;
                      
                      const unselectedMods = modules.filter(m => !selectedIds.includes(m.id));
                      const groupMods = modules.filter(m => selectedIds.includes(m.id));
                      
                      let isValid = true;
                      for (const m of groupMods) {
                        const moved = { ...m, x: m.x + dx, y: m.y + dy };
                        if (moved.x < 0 || moved.y < 0 || isColliding(moved, unselectedMods)) {
                          isValid = false;
                          break;
                        }
                      }
                      
                      setDragGroup({ dx, dy, valid: isValid });
                    }}
                    onDragEnd={(e, info) => {
                      setTimeout(() => { isDraggingRef.current = false; }, 100);
                      if (!dragGroup) return; // sometimes drag doesn't fire nicely
                      // If it did fire, finish up:
                      const finalDx = dragGroup.dx;
                      const finalDy = dragGroup.dy;
                      const isValid = dragGroup.valid;
                      
                      setDragGroup(null);
                      
                      if (isValid && (finalDx !== 0 || finalDy !== 0)) {
                        setModules(prev => prev.map(m => {
                          if (selectedIds.includes(m.id)) {
                            return { ...m, x: m.x + finalDx, y: m.y + finalDy };
                          }
                          return m;
                        }));
                      } else {
                        // Revert visual jump or micro-drags that didn't cross the grid threshold
                        setModules(prev => prev.map(m => {
                          if (selectedIds.includes(m.id)) {
                            return { ...m, collisionKey: (m.collisionKey || 0) + 1 };
                          }
                          return m;
                        }));
                      }
                    }}
                    onPointerDown={(e) => {
                      if (!selectedIds.includes(module.id)) {
                        setSelectedIds(prev => [...prev, module.id]);
                        moduleJustAddedRef.current = module.id;
                      }
                    }}
                    onClick={(e) => {
                      if (isDraggingRef.current) {
                        moduleJustAddedRef.current = null;
                        return;
                      }
                      
                      if (moduleJustAddedRef.current === module.id) {
                         // Just added on mousedown, do not toggle off
                         moduleJustAddedRef.current = null;
                      } else {
                         // Toggle off on normal click
                         setSelectedIds(prev => prev.filter(id => id !== module.id));
                      }
                    }}
                    className={`module-item ${selectedIds.includes(module.id) ? 'selected' : ''}`}
                    style={{
                      width: `${module.rotation % 180 !== 0 ? moduleTypes[module.type].height : moduleTypes[module.type].width}px`,
                      height: `${module.rotation % 180 !== 0 ? moduleTypes[module.type].width : moduleTypes[module.type].height}px`,
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      opacity: (dragGroup && selectedIds.includes(module.id)) ? 0.01 : 1
                    }}
                  >
                    <div className="module-content" style={{ transform: `rotate(${module.rotation}deg)` }}>
                      <span className="module-label">{module.type}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Group Drag Feedback */}
              {dragGroup && modules.filter(m => selectedIds.includes(m.id)).map(m => {
                const isRotated = m.rotation % 180 !== 0;
                const width = isRotated ? moduleTypes[m.type].height : moduleTypes[m.type].width;
                const height = isRotated ? moduleTypes[m.type].width : moduleTypes[m.type].height;
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
                    {m.type}
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
                <div style={{ fontSize: '0.9rem', color: '#71717a', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>Złożony z {cluster.count} moduł(ów)</div>
              </div>
            ))}
            {modules.length === 0 && <span style={{ color: '#71717a' }}>Dodaj moduły, aby zobaczyć dokładne wymiary gotowych ekranów.</span>}
          </div>
        </div>
      </div>

      <style jsx>{`
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
        }

        .controls {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
          height: 100%;
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
        }

        .grid-canvas {
          position: absolute;
          top: 0;
          left: 0;
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
