// Map Editor for Stacklands
// Drag-and-drop editor for creating and editing game maps

const { useState, useEffect, useCallback, useRef } = window.React;

// ─── GLOBAL DATA ─────────────────────────────────────────────────────────────
let CARD_DEFS = {};
let ASSET_DEFS = {};

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────
// Same dimensions as in game (1:1 scale)
const CARD_W = 350 / 2;  // 175px
const CARD_H = 460 / 2;  // 230px

// Asset snap pairs - defines offset for snapping (x, y) relative to base asset
// cauldron_bottom attaches to cauldron_top with this offset (from getCauldronDragPositions)
// bottomOffsetX = (524 - 420) / 2 / 3 ≈ 17.33
// bottomOffsetY = 515 / 3 - 10 ≈ 161.67
const CAULDRON_BOTTOM_OFFSET = { x: 17.33, y: 161.67 };

// IDs to filter out from palettes (shown as special buttons instead)
const FILTERED_ASSET_IDS = ['crafting_cauldron_top', 'crafting_cauldron_bottom', 'alchemy_cauldron'];

// ─── MAIN EDITOR COMPONENT ───────────────────────────────────────────────────
function MapEditor() {
  // State
  const [activeTab, setActiveTab] = useState('cards');
  const [placedItems, setPlacedItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mapName, setMapName] = useState('new_map');
  const [draggedItem, setDraggedItem] = useState(null);
  const [availableMaps, setAvailableMaps] = useState([]);
  const [selectedMapId, setSelectedMapId] = useState(null);

  // For repositioning already placed items - use ref like in stacklands.jsx
  const dragRef = useRef(null);
  const canvasRef = useRef(null);

  // Handle mouse drag for repositioning placed items (same pattern as stacklands.jsx)
  useEffect(() => {
    const onMove = (e) => {
      const drag = dragRef.current;
      if (!drag || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const newX = e.clientX - rect.left - drag.ox;
      const newY = e.clientY - rect.top - drag.oy;

      setPlacedItems(prev => prev.map(item =>
        item.uid === drag.uid ? { ...item, x: Math.round(newX), y: Math.round(newY) } : item
      ));
      setMousePos({ x: Math.round(e.clientX - rect.left), y: Math.round(e.clientY - rect.top) });
    };

    const onUp = () => {
      const drag = dragRef.current;
      if (drag) {
        // Find the item to select it after drop
        const item = placedItems.find(i => i.uid === drag.uid);
        if (item) setSelectedItem(item);
        dragRef.current = null;
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [placedItems]);

  // Load card and asset definitions on mount
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch available maps first
        try {
          const mapsIndexRes = await fetch('maps/index.json');
          if (mapsIndexRes.ok) {
            const mapsIndex = await mapsIndexRes.json();
            setAvailableMaps(mapsIndex.maps || []);
          }
        } catch (e) {
          console.log("No maps/index.json found");
        }

        const [cardsRes, assetsRes] = await Promise.all([
          fetch('cards.yaml'),
          fetch('assets.yaml')
        ]);

        const cardsText = await cardsRes.text();
        const cardsObj = jsyaml.load(cardsText);
        if (Array.isArray(cardsObj)) {
          cardsObj.forEach(c => { CARD_DEFS[c.id] = c; });
        }

        const assetsText = await assetsRes.text();
        const assetsObj = jsyaml.load(assetsText);
        // Handle both array format and object with categories
        if (Array.isArray(assetsObj)) {
          assetsObj.forEach(a => { ASSET_DEFS[a.id] = a; });
        } else if (assetsObj) {
          if (assetsObj.buildings) assetsObj.buildings.forEach(a => { ASSET_DEFS[a.id] = a; });
          if (assetsObj.packs) assetsObj.packs.forEach(p => { ASSET_DEFS[p.id] = p; });
        }

        console.log('Loaded cards:', Object.keys(CARD_DEFS).length);
        console.log('Loaded assets:', Object.keys(ASSET_DEFS).length);
        console.log('Available maps:', availableMaps);
      } catch (err) {
        console.error('Error loading definitions:', err);
      }
    }
    loadData();
  }, []);

  // Handle drag start from palette
  const handlePaletteDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Handle drop on canvas
  const handleCanvasDrop = (e) => {
    e.preventDefault();
    if (!draggedItem) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const { width, height } = getItemDimensions(draggedItem);
    const x = e.clientX - rect.left - width / 2;
    const y = e.clientY - rect.top - height / 2;

    const newItem = {
      uid: Date.now(),
      ...draggedItem,
      x: Math.round(x),
      y: Math.round(y)
    };

    setPlacedItems(prev => [...prev, newItem]);
    setDraggedItem(null);
    setSelectedItem(newItem);
  };

  // Handle drag over canvas
  const handleCanvasDragOver = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    setMousePos({
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top)
    });
  };

  // Handle canvas click (deselect)
  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current) {
      setSelectedItem(null);
    }
  };

  // Handle placed item drag start (for repositioning) - same pattern as stacklands.jsx
  const handleItemMouseDown = (e, item) => {
    e.stopPropagation();
    setSelectedItem(item);
    const rect = canvasRef.current.getBoundingClientRect();
    dragRef.current = {
      uid: item.uid,
      ox: e.clientX - rect.left - item.x,
      oy: e.clientY - rect.top - item.y
    };
  };

  // Delete selected item
  const handleDelete = () => {
    if (!selectedItem) return;
    setPlacedItems(prev => prev.filter(item => item.uid !== selectedItem.uid));
    setSelectedItem(null);
  };

  // Update selected item position
  const handlePositionChange = (field, value) => {
    if (!selectedItem) return;
    const numValue = parseInt(value, 10) || 0;
    setPlacedItems(prev => prev.map(item =>
      item.uid === selectedItem.uid ? { ...item, [field]: numValue } : item
    ));
    setSelectedItem(prev => prev ? { ...prev, [field]: numValue } : null);
  };

  // Add cauldron (both parts together)
  const handleAddCauldron = () => {
    const baseX = 200;
    const baseY = 200;
    const uid = Date.now();

    // Use alchemy_cauldron - single merged asset
    const alchemyCauldron = {
      uid: uid,
      id: 'alchemy_cauldron',
      name: 'Alchemy Cauldron',
      type: 'building',
      isSpecial: true,
      isAsset: true,
      file: 'special_assets/cauldron.jsx',
      logic: 'crafting',
      scale: 1,
      x: baseX,
      y: baseY
    };

    setPlacedItems(prev => [...prev, alchemyCauldron]);
    setSelectedItem(alchemyCauldron);
  };

  // Save map - sends to server via POST /api/maps/save
  const handleSave = async () => {
    const saveName = mapName || 'unnamed_map';

    const mapData = {
      id: saveName,
      name: saveName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      cards: [],
      assets: [],
      special_assets: []
    };

    placedItems.forEach(item => {
      console.log('Save item:', item.id, 'isCard:', item.isCard);
      if (item.isCard) {
        mapData.cards.push({ id: item.id, x: item.x, y: item.y });
      } else if (item.isSpecial) {
        mapData.special_assets.push({
          id: item.id,
          x: item.x,
          y: item.y,
          scale: item.scale || 1,
          file: item.file || 'special_assets/cauldron.jsx',
          logic: item.logic || 'crafting'
        });
      } else {
        mapData.assets.push({ id: item.id, x: item.x, y: item.y, scale: item.scale || 1 });
      }
    });
    console.log('Saving mapData:', mapData);

    try {
      const response = await fetch(`/api/maps/save?name=${saveName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapData)
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        // Refresh available maps list
        const mapsIndexRes = await fetch('maps/index.json');
        if (mapsIndexRes.ok) {
          const mapsIndex = await mapsIndexRes.json();
          setAvailableMaps(mapsIndex.maps || []);
          setSelectedMapId(saveName);
        }
        alert(`Map "${saveName}" saved successfully!`);
      } else {
        throw new Error(result.error || 'Server returned error');
      }
    } catch (err) {
      console.error('Save error:', err);
      // Fallback: download as JSON file
      const blob = new Blob([JSON.stringify(mapData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maps/${saveName}.json`;
      a.click();
      URL.revokeObjectURL(url);
      alert(`Server save failed. Downloaded map as JSON.`);
    }
  };

  // Load map from server
  const loadMap = async (mapId) => {
    if (!mapId) return;

    // Check if current map has unsaved changes
    const hasChanges = placedItems.length > 0;
    let loadTarget = mapId; // Track which map to actually load

    if (hasChanges) {
      const userChoice = confirm(`Current map has unsaved changes.\n\nDo you want to save before loading?\n\nCancel = Load without saving`);
      if (userChoice) {
        // User clicked YES - prompt for filename
        const saveName = prompt('Enter map filename:', mapName || 'unnamed_map');
        if (saveName) {
          setMapName(saveName);
          loadTarget = saveName; // Load the saved map, not the selected one
          // Create map data and save
          const mapData = {
            id: saveName,
            name: saveName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            cards: [],
            assets: [],
            special_assets: []
          };

          placedItems.forEach(item => {
            if (item.isCard) {
              mapData.cards.push({ id: item.id, x: item.x, y: item.y });
            } else if (item.isSpecial) {
              mapData.special_assets.push({
                id: item.id,
                x: item.x,
                y: item.y,
                scale: item.scale || 1,
                file: item.file || 'special_assets/cauldron.jsx',
                logic: item.logic || 'crafting'
              });
            } else {
              mapData.assets.push({ id: item.id, x: item.x, y: item.y, scale: item.scale || 3 });
            }
          });

          try {
            const response = await fetch(`/api/maps/save?name=${saveName}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(mapData)
            });

            if (!response.ok) {
              throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
              const mapsIndexRes = await fetch('maps/index.json');
              if (mapsIndexRes.ok) {
                const mapsIndex = await mapsIndexRes.json();
                setAvailableMaps(mapsIndex.maps || []);
              }
            }
          } catch (err) {
            console.error('Save error:', err);
            alert(`Save failed: ${err.message}`);
            return; // Abort loading if save failed
          }
        }
      }
      // If NO/CANCEL, continue without saving - FALL THROUGH to load the map
    }

    // Actually load the target map
    try {
      // Cache-busting to force fresh fetch
      const response = await fetch(`maps/${loadTarget}.json?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`Failed to load map: ${response.status}`);
      }

      const mapData = await response.json();

      // Convert map data to placed items
      const items = [];
      let uidCounter = Date.now();

      // Load cards
      if (mapData.cards) {
        mapData.cards.forEach(card => {
          const def = CARD_DEFS[card.id];
          if (def) {
            items.push({
              uid: uidCounter++,
              id: card.id,
              name: def.name || card.id,
              type: def.type,
              isCard: true,
              x: card.x,
              y: card.y
            });
          }
        });
      }

      // Load assets
      if (mapData.assets) {
        mapData.assets.forEach(asset => {
          const def = ASSET_DEFS[asset.id];
          if (def) {
            items.push({
              uid: uidCounter++,
              id: asset.id,
              name: def.name || asset.id,
              type: def.type,
              isAsset: true,
              isSpecial: false,
              scale: asset.scale || 1,
              x: asset.x,
              y: asset.y
            });
          }
        });
      }

      // Load special assets
      if (mapData.special_assets) {
        mapData.special_assets.forEach(sa => {
          const def = ASSET_DEFS[sa.id];
          if (def) {
            items.push({
              uid: uidCounter++,
              id: sa.id,
              name: def.name || sa.id,
              type: def.type,
              isAsset: true,
              isSpecial: true,
              scale: sa.scale || 1,
              file: sa.file || 'special_assets/cauldron.jsx',
              logic: sa.logic || 'crafting',
              x: sa.x,
              y: sa.y
            });
          }
        });
      }

      // Force React to re-render by clearing first (needed when reloading same map)
      setPlacedItems([]);
      setSelectedItem(null);
      // Small delay to ensure React processes the clear
      setTimeout(() => {
        setPlacedItems(items);
        setSelectedMapId(loadTarget);
        setMapName(loadTarget);
      }, 10);
    } catch (err) {
      console.error('Load error:', err);
      alert(`Failed to load map: ${err.message}`);
    }
  };

  // Get palette items
  const getPaletteItems = () => {
    if (activeTab === 'cards') {
      return Object.values(CARD_DEFS)
        .filter(def => def?.texture) // Only items with graphics
        .map(def => ({
          id: def.id,
          name: def.name || def.id,
          type: def.type,
          isCard: true
        }));
    } else if (activeTab === 'assets') {
      return Object.values(ASSET_DEFS)
        .filter(def => def?.texture && !FILTERED_ASSET_IDS.includes(def.id)) // Only items with graphics, filter cauldrons
        .map(def => ({
          id: def.id,
          name: def.name || def.id,
          type: def.type,
          isAsset: true,
          scale: 1
        }));
    } else {
      // Special assets - buttons for special placements
      return [];
    }
  };

  // Get emoji for type
  const getTypeEmoji = (type) => {
    const emojis = {
      unit: '👤', resource: '🌿', food: '🍲', material: '🪵',
      building: '🏛️', currency: '💰', weapon: '⚔️', enemy: '👹',
      knowledge: '📜', consumable: '🧪', special: '⭐'
    };
    return emojis[type] || '🃏';
  };

  // Get texture URL for item
  const getItemTexture = (item) => {
    const def = item.isCard ? CARD_DEFS[item.id] : ASSET_DEFS[item.id];
    return def?.texture || null;
  };

  // Get item dimensions (1:1 with game)
  const getItemDimensions = (item) => {
    if (item.isCard) {
      return { width: CARD_W, height: CARD_H };
    }
    const scale = item.scale || 1;
    return {
      width: CARD_W * scale,
      height: CARD_H * scale
    };
  };

  // Get cauldron bottom position based on top position
  const getCauldronBottomPos = (topX, topY) => ({
    x: Math.round(topX + CAULDRON_BOTTOM_OFFSET.x),
    y: Math.round(topY + CAULDRON_BOTTOM_OFFSET.y)
  });

  const paletteItems = getPaletteItems();

  return (
    <div className="editor-container">
      {/* Left Sidebar - Palette */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">🗺️ Map Editor</div>

          {/* Map Loader */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: '#a09070', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>📂 Load Map</div>
            <select
              value={selectedMapId || ''}
              onChange={(e) => loadMap(e.target.value)}
              style={{ width: '100%', background: 'rgba(50,50,70,0.5)', color: '#e0d0a0', border: '1px solid rgba(200,168,107,0.3)', borderRadius: 4, padding: '6px 8px', fontSize: 11, fontWeight: 600 }}
            >
              <option value="">-- Select Map --</option>
              {availableMaps.map(mapId => (
                <option key={mapId} value={mapId}>{mapId.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          {/* Save Map Name Input */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: '#a09070', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>💾 Map Filename</div>
            <input
              type="text"
              className="property-input"
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              placeholder="Enter map filename..."
            />
          </div>
        </div>

        <div className="palette-tabs">
          <div
            className={`palette-tab ${activeTab === 'cards' ? 'active' : ''}`}
            onClick={() => setActiveTab('cards')}
          >
            📇 Cards
          </div>
          <div
            className={`palette-tab ${activeTab === 'assets' ? 'active' : ''}`}
            onClick={() => setActiveTab('assets')}
          >
            🏛️ Assets
          </div>
          <div
            className={`palette-tab ${activeTab === 'special' ? 'active' : ''}`}
            onClick={() => setActiveTab('special')}
          >
            ⭐ Special
          </div>
        </div>

        <div className="palette-content">
          {activeTab === 'special' && (
            <div
              className="palette-item cauldron-btn"
              onClick={handleAddCauldron}
              style={{ cursor: 'pointer', background: 'rgba(200,168,107,0.3)', border: '2px dashed #c8a86b' }}
            >
              <div className="palette-item-icon">
                <img src="assets/alchemy_cauldron.png" alt="Alchemy Cauldron" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div className="palette-item-info">
                <div className="palette-item-name" style={{ fontSize: 12 }}>Alchemy Cauldron</div>
                <div className="palette-item-type">Single merged cauldron asset</div>
              </div>
            </div>
          )}
          {paletteItems.map(item => {
            const def = item.isCard ? CARD_DEFS[item.id] : ASSET_DEFS[item.id];
            const texture = def?.texture;
            return (
              <div
                key={item.id}
                className="palette-item"
                draggable
                onDragStart={(e) => handlePaletteDragStart(e, item)}
              >
                <div className="palette-item-icon">
                  {texture ? (
                    <img src={texture} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    getTypeEmoji(item.type)
                  )}
                </div>
                <div className="palette-item-info">
                  <div className="palette-item-name">{item.name}</div>
                  <div className="palette-item-type">{item.type} • {item.id}</div>
                </div>
              </div>
            );
          })}
          {paletteItems.length === 0 && (
            <div className="no-selection">Loading...</div>
          )}
        </div>
      </div>

      {/* Center - Canvas */}
      <div className="canvas-area">
        <div className="canvas-toolbar">
          <div className="canvas-title">📋 Canvas</div>
          <div className="canvas-coords">Mouse: ({mousePos.x}, {mousePos.y})</div>
          <button className="canvas-save-btn" onClick={handleSave}>
            💾 Save Map
          </button>
        </div>

        <div
          ref={canvasRef}
          className="canvas-container"
          onDrop={handleCanvasDrop}
          onDragOver={handleCanvasDragOver}
          onClick={handleCanvasClick}
        >
          {/* Placed items */}
          {placedItems.map(item => {
            const def = item.isCard ? CARD_DEFS[item.id] : ASSET_DEFS[item.id];
            const texture = def?.texture;
            const { width, height } = getItemDimensions(item);
            const isCard = item.isCard === true;
            const isAsset = item.isAsset || item.isSpecial;
            const isSelected = selectedItem?.uid === item.uid;

            return (
              <div
                key={item.uid}
                className={`placed-item ${isCard ? 'item-card' : 'item-asset'} ${isSelected ? 'selected' : ''}`}
                style={{ left: item.x, top: item.y, width, height }}
                onMouseDown={(e) => handleItemMouseDown(e, item)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItem(item);
                }}
              >
                {texture ? (
                  <img
                    src={texture}
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'absolute', inset: 0, pointerEvents: 'none' }}
                  />
                ) : (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(200,168,107,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24
                  }}>
                    {getTypeEmoji(item.type)}
                  </div>
                )}

                {/* Label overlay - cards always, assets only when selected */}
                {isCard && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'rgba(0,0,0,0.75)',
                    padding: 4,
                    borderRadius: '0 0 4px 4px',
                    fontSize: 9,
                    color: '#fff'
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{item.name}</div>
                    <div style={{ opacity: 0.7 }}>
                      ({item.x}, {item.y})
                    </div>
                  </div>
                )}

                {/* Asset overlay - only when selected */}
                {isAsset && isSelected && (
                  <div style={{
                    position: 'absolute', top: -20, left: 0, right: 0,
                    background: 'rgba(0,0,0,0.85)',
                    padding: 4,
                    borderRadius: 4,
                    fontSize: 9,
                    color: '#fff',
                    textAlign: 'center',
                    whiteSpace: 'nowrap'
                  }}>
                    {item.name}: ({item.x}, {item.y}) {item.scale ? `• scale: ${item.scale}` : ''}
                  </div>
                )}
              </div>
            );
          })}

          {/* Drag preview */}
          {draggedItem && (
            <div
              className="placed-item"
              style={{
                left: mousePos.x - getItemDimensions(draggedItem).width / 2,
                top: mousePos.y - getItemDimensions(draggedItem).height / 2,
                opacity: 0.7,
                pointerEvents: 'none',
                width: getItemDimensions(draggedItem).width,
                height: getItemDimensions(draggedItem).height
              }}
            >
              {(() => {
                const def = draggedItem.isCard ? CARD_DEFS[draggedItem.id] : ASSET_DEFS[draggedItem.id];
                const texture = def?.texture;
                if (texture) {
                  return (
                    <img
                      src={texture}
                      alt={draggedItem.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'absolute', inset: 0 }}
                    />
                  );
                }
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 4 }}>
                    <span>{getTypeEmoji(draggedItem.type)}</span>
                    <span>{draggedItem.name}</span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Properties */}
      <div className="properties-panel">
        <div className="properties-title">⚙️ Properties</div>

        {selectedItem ? (
          <>
            <div className="property-row">
              <div className="property-label">ID</div>
              <div className="property-input">{selectedItem.id}</div>
            </div>
            <div className="property-row">
              <div className="property-label">Name</div>
              <div className="property-input">{selectedItem.name}</div>
            </div>
            <div className="property-row">
              <div className="property-label">X Position</div>
              <input
                type="number"
                className="property-input"
                value={selectedItem.x}
                onChange={(e) => handlePositionChange('x', e.target.value)}
              />
            </div>
            <div className="property-row">
              <div className="property-label">Y Position</div>
              <input
                type="number"
                className="property-input"
                value={selectedItem.y}
                onChange={(e) => handlePositionChange('y', e.target.value)}
              />
            </div>
            {selectedItem.isAsset && (
              <div className="property-row">
                <div className="property-label">Scale</div>
                <input
                  type="number"
                  className="property-input"
                  value={selectedItem.scale || 1}
                  step="0.1"
                  min="0.1"
                  onChange={(e) => handlePositionChange('scale', parseFloat(e.target.value) || 1)}
                />
              </div>
            )}
            {selectedItem.isSpecial && (
              <>
                <div className="property-row">
                  <div className="property-label">Logic File</div>
                  <input
                    type="text"
                    className="property-input"
                    value={selectedItem.file || ''}
                    onChange={(e) => handlePositionChange('file', e.target.value)}
                  />
                </div>
                <div className="property-row">
                  <div className="property-label">Logic Type</div>
                  <input
                    type="text"
                    className="property-input"
                    value={selectedItem.logic || ''}
                    onChange={(e) => handlePositionChange('logic', e.target.value)}
                  />
                </div>
                <div className="property-row">
                  <div className="property-label">Scale</div>
                  <input
                    type="number"
                    className="property-input"
                    value={selectedItem.scale || 1}
                    onChange={(e) => handlePositionChange('scale', e.target.value)}
                  />
                </div>
              </>
            )}
            <button className="delete-btn" onClick={handleDelete}>
              🗑️ Delete Selected
            </button>
          </>
        ) : (
          <div className="no-selection">
            Select an item on the canvas to edit its properties
          </div>
        )}
      </div>
    </div>
  );
}

// ─── START APPLICATION ───────────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<MapEditor />);
