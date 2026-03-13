// Map Editor for Stacklands
// Drag-and-drop editor for creating and editing game maps

const { useState, useEffect, useCallback, useRef } = window.React;

// ─── GLOBAL DATA ─────────────────────────────────────────────────────────────
let CARD_DEFS = {};
let ASSET_DEFS = {};

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────
const CARD_W = 60;  // Smaller for editor
const CARD_H = 80;

// ─── MAIN EDITOR COMPONENT ───────────────────────────────────────────────────
function MapEditor() {
  // State
  const [activeTab, setActiveTab] = useState('cards'); // 'cards' | 'assets' | 'special'
  const [placedItems, setPlacedItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mapName, setMapName] = useState('new_map');
  const [draggedItem, setDraggedItem] = useState(null);

  const canvasRef = useRef(null);

  // Load card and asset definitions on mount
  useEffect(() => {
    async function loadData() {
      try {
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
        if (Array.isArray(assetsObj)) {
          assetsObj.forEach(a => { ASSET_DEFS[a.id] = a; });
        }

        console.log('Loaded cards:', Object.keys(CARD_DEFS).length);
        console.log('Loaded assets:', Object.keys(ASSET_DEFS).length);
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
    const x = e.clientX - rect.left - CARD_W / 2;
    const y = e.clientY - rect.top - CARD_H / 2;

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

  // Handle placed item drag
  const handleItemDragStart = (e, item) => {
    e.stopPropagation();
    setSelectedItem(item);
    const rect = canvasRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - item.x;
    const offsetY = e.clientY - rect.top - item.y;
    e.dataTransfer.setData('offsetX', offsetX);
    e.dataTransfer.setData('offsetY', offsetY);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle item drop (reposition)
  const handleItemDrop = (e, targetItem) => {
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    const offsetX = parseFloat(e.dataTransfer.getData('offsetX'));
    const offsetY = parseFloat(e.dataTransfer.getData('offsetY'));
    const newX = Math.round(e.clientX - rect.left - offsetX);
    const newY = Math.round(e.clientY - rect.top - offsetY);

    setPlacedItems(prev => prev.map(item =>
      item.uid === targetItem.uid ? { ...item, x: newX, y: newY } : item
    ));
    setSelectedItem(prev => prev ? { ...prev, x: newX, y: newY } : null);
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

  // Save map
  const handleSave = async () => {
    const mapData = {
      id: mapName,
      name: mapName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      cards: [],
      assets: [],
      special_assets: []
    };

    placedItems.forEach(item => {
      if (item.type === 'card') {
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
      const response = await fetch(`/api/maps/save?name=${mapName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapData)
      });

      if (response.ok) {
        alert(`Map "${mapName}" saved successfully!`);
      } else {
        // Fallback: download as JSON file
        const blob = new Blob([JSON.stringify(mapData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `maps/${mapName}.json`;
        a.click();
        URL.revokeObjectURL(url);
        alert('Map downloaded as JSON file (server save failed)');
      }
    } catch (err) {
      // Fallback: download as JSON file
      const blob = new Blob([JSON.stringify(mapData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maps/${mapName}.json`;
      a.click();
      URL.revokeObjectURL(url);
      alert('Map downloaded as JSON file (server not available)');
    }
  };

  // Get palette items
  const getPaletteItems = () => {
    if (activeTab === 'cards') {
      return Object.values(CARD_DEFS).map(def => ({
        id: def.id,
        name: def.name || def.id,
        type: def.type,
        isCard: true
      }));
    } else if (activeTab === 'assets') {
      return Object.values(ASSET_DEFS).map(def => ({
        id: def.id,
        name: def.name || def.id,
        type: def.type,
        isAsset: true,
        scale: 1
      }));
    } else {
      // Special assets
      return [
        { id: 'crafting_cauldron_top', name: 'Crafting Cauldron Top', type: 'special', isSpecial: true, file: 'special_assets/cauldron.jsx', logic: 'crafting', scale: 1 },
        { id: 'crafting_cauldron_bottom', name: 'Crafting Cauldron Bottom', type: 'special', isSpecial: true, file: 'special_assets/cauldron.jsx', scale: 1 }
      ];
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

  const paletteItems = getPaletteItems();

  return (
    <div className="editor-container">
      {/* Left Sidebar - Palette */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">🗺️ Map Editor</div>
          <input
            type="text"
            className="property-input"
            value={mapName}
            onChange={(e) => setMapName(e.target.value)}
            placeholder="Map name..."
          />
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
          {paletteItems.map(item => (
            <div
              key={item.id}
              className="palette-item"
              draggable
              onDragStart={(e) => handlePaletteDragStart(e, item)}
            >
              <div className="palette-item-icon">
                {getTypeEmoji(item.type)}
              </div>
              <div className="palette-item-info">
                <div className="palette-item-name">{item.name}</div>
                <div className="palette-item-type">{item.type} • {item.id}</div>
              </div>
            </div>
          ))}
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
          {placedItems.map(item => (
            <div
              key={item.uid}
              className={`placed-item ${item.isCard ? 'item-card' : 'item-asset'} ${selectedItem?.uid === item.uid ? 'selected' : ''}`}
              style={{ left: item.x, top: item.y }}
              draggable
              onDragStart={(e) => handleItemDragStart(e, item)}
              onDrop={(e) => handleItemDrop(e, item)}
              onDragOver={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedItem(item);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <span>{getTypeEmoji(item.type)}</span>
                <span>{item.name}</span>
              </div>
              <div style={{ fontSize: 9, opacity: 0.7 }}>
                ({item.x}, {item.y})
              </div>
            </div>
          ))}

          {/* Drag preview */}
          {draggedItem && (
            <div
              className="placed-item"
              style={{
                left: mousePos.x - CARD_W / 2,
                top: mousePos.y - CARD_H / 2,
                opacity: 0.7,
                pointerEvents: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>{getTypeEmoji(draggedItem.type)}</span>
                <span>{draggedItem.name}</span>
              </div>
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
