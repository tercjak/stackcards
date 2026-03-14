// UWAGA: Nie używamy 'import ... from "react"', bo to psuje kompilację w przeglądarce!
console.log("Skrypt startuje!");

const { useState, useEffect, useRef, useCallback } = window.React;

// ─── DEBUG FLAGI ─────────────────────────────────────────────────────────────
const DEBUG_CAULDRON_GRID = false; // Pokaż siatkę 3x3 na kociołku (tylko debug)
const DEBUG_MAP_SELECTOR = true; // Pokaż selector map na górze ekranu (debug)

// ─── ZMIENNE GLOBALNE NA DANE Z PLIKÓW ───────────────────────────────────────
let CARD_DEFS = {};
let PACK_DEFS = {};
let RECIPES = [];
let QUESTS = [];
let CRAFTING_RECIPES = []; // Nowe receptury 3x3 z crafting_recipes.csv
let MAPS = {}; // Map definitions loaded from maps/*.json
let CURRENT_MAP = null; // Currently loaded map data

const TYPE_COLORS = {
  unit: "#4a90d9", resource: "#5aaa60", food: "#9b59b6",
  material: "#d4801a", building: "#c0392b", currency: "#d4ac0d",
  weapon: "#7f8c8d", enemy: "#922b21",
};

const CARD_W = 350 / 2;
const CARD_H = 460 / 2;


let _uid = 1;
const mkCard = (id, x, y) => ({ uid: _uid++, id, x, y });
const mkAsset = (id, x, y, scale = 3) => ({ uid: _uid++, id, x, y, isAsset: true, scale });
const mkSpAsset = (id, x, y, scale, file, logic) => ({ uid: _uid++, id, x, y, isAsset: true, scale, isSpecial: true, file, logic });

// Expand alchemy_cauldron special asset into top + bottom parts
const expandSpecialAssets = (specialAssets) => {
  const result = [];
  for (const sa of specialAssets) {
    if (sa.id === 'alchemy_cauldron') {
      // Expand into two parts - bottom attaches to top with offset (matching map_editor.jsx)
      // Offset: x=17.33, y=161.67 (relative to top position)
      result.push({
        ...sa,
        id: 'crafting_cauldron_top',
        x: sa.x,
        y: sa.y,
      });
      result.push({
        ...sa,
        id: 'crafting_cauldron_bottom',
        x: sa.x + 17.33,
        y: sa.y + 161.67,
      });
    } else {
      result.push(sa);
    }
  }
  return result;
};

function findRecipe(a, b) {
  return RECIPES.find(r => (r.a === a && r.b === b) || (r.a === b && r.b === a));
}

// ─── KARTA (COMPONET) ────────────────────────────────────────────────────────
function GameCard({ card, isDragging, craftPct, craftRemaining, onMouseDown }) {
  const def = CARD_DEFS[card.id];
  // Jeśli brak definicji, pokaż kartę błędu zamiast zwracać null
  if (!def) {
    return (
      <div className="absolute border-2 border-red-500 bg-white" style={{ left: card.x, top: card.y, width: CARD_W, height: CARD_H }}>
        Brak ID: {card.id}
      </div>
    );
  }

  const typeColor = TYPE_COLORS[def.type] || "#888";
  const isEnemy = def.type === "enemy";

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: "absolute", left: card.x, top: card.y,
        width: CARD_W, height: CARD_H, perspective: "600px",
        zIndex: isDragging ? 500 : 10, cursor: isDragging ? "grabbing" : "grab", userSelect: "none",
      }}
    >
      <div style={{
        width: "100%", height: "100%", borderRadius: 12,
        background: isEnemy ? "linear-gradient(160deg, #e8dac8 0%, #d4c0a8 100%)" : "linear-gradient(160deg, #fdf8ee 0%, #f0e8d0 100%)",
        border: isDragging ? "3px solid #3a9efd" : `2px solid ${isEnemy ? "#9a7755" : "#c8a86b"}`,
        boxShadow: isDragging ? "0 0 0 4px #3a9efd44, 0 20px 40px #0007, 0 8px 16px #0004" : "0 4px 12px #0003, 0 2px 4px #0002, inset 0 1px 0 #ffffffcc",
        transform: isDragging ? "scale(1.08) rotate(-4deg) translateY(-8px)" : "scale(1) rotate(0deg) translateY(0px)",
        transition: isDragging ? "transform 0.12s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.12s ease, border-color 0.1s" : "transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease, border-color 0.1s",
        overflow: "hidden", display: "flex", flexDirection: "column",
        fontFamily: "'Nunito', 'Segoe UI', sans-serif", willChange: "transform",
      }}>
        <div style={{ height: 6, background: `linear-gradient(90deg, ${typeColor}, ${typeColor}aa)`, flexShrink: 0 }} />
        <div style={{ textAlign: "center", fontSize: 9, fontWeight: 800, color: typeColor, letterSpacing: "0.1em", marginTop: 4, textTransform: "uppercase", opacity: 0.85 }}>{def.type}</div>

        {/* Obszar ładowania grafiki */}
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 56, lineHeight: 1, filter: isEnemy ? "saturate(0.6) brightness(0.9)" : "none",
          backgroundImage: def.texture ? `url(${def.texture})` : "none",
          backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center",
          margin: "8px"
        }}>
          {!def.texture && (def.emoji || "❓")}
        </div>

        <div style={{ textAlign: "center", fontSize: 13, fontWeight: 800, color: "#3a2808", padding: "0 8px 2px", lineHeight: 1.2 }}>{def.name}</div>
        <div style={{ textAlign: "center", fontSize: 10, color: "#8a6030", padding: "0 6px 6px", fontStyle: "italic" }}>{def.name_pl}</div>

        {craftPct !== undefined && (
          <>
            <div style={{ margin: "0 8px", height: 6, background: "#e0d0b0", borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
              <div style={{ height: "100%", width: `${craftPct * 100}%`, background: "linear-gradient(90deg, #7bc244, #4a9010)", transition: "width 0.08s linear", borderRadius: 3 }} />
            </div>
            <div style={{ textAlign: "center", fontSize: 9, color: "#7a5820", padding: "3px 0 5px" }}>⚙ {Math.ceil(craftRemaining)}s</div>
          </>
        )}
        <div style={{ height: craftPct !== undefined ? 0 : 5, background: `linear-gradient(90deg, ${typeColor}44, ${typeColor}22)`, flexShrink: 0 }} />
      </div>
    </div>
  );
}

// ─── ASSET ŚRODOWISKOWY (bez UI karty) ──────────────────────────────────────
function GameAsset({ asset, selectedRecipe, cauldronSlots, onSlotClick, hoveredSlot, onCauldronDragStart, draggingFromSlot, handleSlotDragStart, slotDragStarted }) {
  const def = CARD_DEFS[asset.id];
  if (!def) return null;

  const isCauldronTop = asset.id === "crafting_cauldron_top";
  const isCauldronBottom = asset.id === "crafting_cauldron_bottom";
  const isCauldron = isCauldronTop || isCauldronBottom || asset.id === "alchemy_cauldron";

  // Use geometry from CauldronLogic if available
  const geometry = window.CauldronLogic?.geometry || {
    CAULDRON_TOP_W: 524 / 3,
    CAULDRON_TOP_H: 515 / 3,
    GRID_OFFSET_X: (524 / 4) * 0.5 / 3,
    GRID_OFFSET_Y: (515 / 4) * 0.5 / 3,
    GRID_W: (524 / 4) * 3 / 3,
    GRID_H: (515 / 4) * 3 / 3,
    SLOT_W: ((524 / 4) * 3 / 3) / 3,
    SLOT_H: ((515 / 4) * 3 / 3) / 3,
  };

  const width = isCauldronTop ? geometry.CAULDRON_TOP_W : isCauldronBottom ? 420 / 3 : CARD_W * (asset.scale || 1);
  const height = isCauldronTop ? geometry.CAULDRON_TOP_H : isCauldronBottom ? 103 / 3 : CARD_H * (asset.scale || 1);

  // Slot positions from CauldronLogic (relative to cauldron container)
  const slotPositions = window.CauldronLogic?.getAllSlotPositions() || [];

  // Get recipe requirements if selected
  const recipe = selectedRecipe ? CRAFTING_RECIPES.find(r => r.id === selectedRecipe) : null;

  return (
    <div
      onMouseDown={(e) => {
        const canDrag = window.CauldronLogic ? window.CauldronLogic.canDragCauldron(cauldronSlots) : cauldronSlots.every(s => s === null);
        if (isCauldronBottom && onCauldronDragStart && canDrag) {
          onCauldronDragStart(e);
        }
      }}
      style={{
        position: "absolute",
        left: asset.x,
        top: asset.y,
        width: width,
        height: height,
        backgroundImage: def.texture ? `url(${def.texture})` : "none",
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        opacity: isCauldron ? 1 : 0.8,
        pointerEvents: isCauldron ? "auto" : "none",
        zIndex: isCauldronBottom ? 5 : 10,
        cursor: isCauldronBottom && (window.CauldronLogic ? window.CauldronLogic.canDragCauldron(cauldronSlots) : cauldronSlots.every(s => s === null)) ? "grab" : "default"
      }}
    >
      {/* DEBUG: Show grid area boundary */}
      {DEBUG_CAULDRON_GRID && isCauldronTop && (
        <div
          style={{
            position: "absolute",
            left: geometry.GRID_OFFSET_X,
            top: geometry.GRID_OFFSET_Y,
            width: geometry.GRID_W,
            height: geometry.GRID_H,
            border: "2px dashed #ff0000",
            background: "rgba(255, 0, 0, 0.1)",
            pointerEvents: "none",
            zIndex: 50
          }}
        />
      )}

      {/* Cauldron slot overlays - only on top part */}
      {isCauldronTop && cauldronSlots && slotPositions.map((pos, i) => {
        const card = cauldronSlots[i];
        const inputKey = `input${Math.floor(i/3)}${i%3}`;
        const requiredId = recipe ? recipe[inputKey] : null;
        const isActive = !!requiredId;
        const isFilled = card && card.id === requiredId;
        const showRequirement = recipe && requiredId && !card;
        const isHovered = hoveredSlot === i;
        const isDraggingFromThisSlot = draggingFromSlot === i;

        return (
          <div
            key={i}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (card) {
                handleSlotDragStart(e, i);
              }
            }}
            onClick={(e) => {
              if (slotDragStarted) return; // Prevent click if drag occurred
              e.stopPropagation();
              if (card) onSlotClick && onSlotClick(i);
            }}
            style={{
              position: "absolute",
              left: pos.x,
              top: pos.y,
              width: pos.width || geometry.SLOT_W,
              height: pos.height || geometry.SLOT_H,
              background: isHovered ? "rgba(58,158,253,0.4)" : isFilled ? "rgba(123,194,68,0.35)" : showRequirement ? "rgba(255,215,0,0.2)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: card ? "grab" : "default",
              pointerEvents: isActive || card ? "auto" : "none",
              transition: "background 0.1s",
              userSelect: "none",
              opacity: isDraggingFromThisSlot ? 0.3 : 1
            }}
          >
              {/* Card icon if placed (hidden while dragging) */}
              {card && CARD_DEFS[card.id] && !isDraggingFromThisSlot && (
                CARD_DEFS[card.id].texture ? (
                  <img src={CARD_DEFS[card.id].texture} alt="" style={{ width: "80%", height: "80%", objectFit: "contain" }} />
                ) : (
                  <span style={{ fontSize: 14 }}>{CARD_DEFS[card.id].emoji || "?"}</span>
                )
              )}
              {/* Recipe requirement preview (ghost image) */}
              {showRequirement && !card && CARD_DEFS[requiredId] && (
                CARD_DEFS[requiredId].texture ? (
                  <img src={CARD_DEFS[requiredId].texture} alt="" style={{ width: "75%", height: "75%", objectFit: "contain", opacity: 0.5 }} />
                ) : (
                  <span style={{ fontSize: 12, opacity: 0.5 }}>{CARD_DEFS[requiredId].emoji || "?"}</span>
                )
              )}
            </div>
        );
      })}
    </div>
  );
}

function Toasts({ list }) {
  return (
    <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", gap: 6, zIndex: 9000, pointerEvents: "none", alignItems: "center" }}>
      {list.map(m => (
        <div key={m.id} style={{ background: "rgba(248, 242, 220, 0.98)", border: "2px solid #c8a86b", borderRadius: 10, padding: "7px 20px", fontSize: 13, fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: "#3a2808", boxShadow: "0 4px 16px #0006", animation: "toastIn 2.8s ease forwards", whiteSpace: "nowrap" }}>{m.text}</div>
      ))}
    </div>
  );
}

function RecipeBook() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "fixed", bottom: 14, right: 14, zIndex: 600, fontFamily: "'Nunito',sans-serif" }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: "rgba(248,242,220,0.97)", border: "2px solid #c8a86b", borderRadius: 10, padding: "7px 16px", fontSize: 12, fontWeight: 800, color: "#3a2808", cursor: "pointer", boxShadow: "0 2px 10px #0004" }}>📖 Receptury {open ? "▲" : "▼"}</button>
      {open && (
        <div style={{ position: "absolute", bottom: "110%", right: 0, width: 280, background: "rgba(248,242,220,0.99)", border: "2px solid #c8a86b", borderRadius: 12, padding: "12px", boxShadow: "0 8px 30px #0008", maxHeight: 340, overflowY: "auto" }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#3a2808", marginBottom: 8 }}>📜 Wszystkie receptury</div>
          {RECIPES.map((r, i) => {
            const a = CARD_DEFS[r.a], b = CARD_DEFS[r.b], out = CARD_DEFS[r.out];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#5a3810", padding: "4px 0", borderBottom: "1px solid #e8d8b8" }}>
                <span style={{ fontSize: 18 }}>{a?.emoji || "🃏"}</span>
                <span style={{ color: "#b09060", fontWeight: 700 }}>+</span>
                <span style={{ fontSize: 18 }}>{b?.emoji || "🃏"}</span>
                <span style={{ color: "#b09060", fontWeight: 700 }}>→</span>
                <span style={{ fontSize: 18 }}>{out?.emoji || "🃏"}</span>
                <span style={{ fontWeight: 700 }}>{out?.name}</span>
                <span style={{ marginLeft: "auto", fontSize: 10, color: "#a08050" }}>{r.time}s</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
const useBackgroundMusic = (url) => {
  const audioRef = useRef(null);

  useEffect(() => {
    // Tworzymy obiekt audio tylko raz
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
    }

    const music = audioRef.current;
    music.loop = true;
    music.volume = 0.2; // Głośność 20%

    const startMusic = () => {
      music.play().catch(err => console.log("Błąd odtwarzania:", err));
      window.removeEventListener('click', startMusic);
      window.removeEventListener('keydown', startMusic);
    };

    // Próbujemy odtworzyć od razu (przejdzie jeśli uszkodzina/strona była już interaktywna)
    music.play().catch(err => {
      console.log("Czekam na interakcję (click/keydown) dla audio...");
      window.addEventListener('click', startMusic);
      window.addEventListener('keydown', startMusic);
    });

    return () => {
      music.pause();
      window.removeEventListener('click', startMusic);
      window.removeEventListener('keydown', startMusic);
    };
  }, [url]);
};

// ─── GŁÓWNA GRA ──────────────────────────────────────────────────────────────
function Stacklands() {
  useBackgroundMusic('bg_soundtrack.mp3');

  // State for map selection
  const [selectedMapId, setSelectedMapId] = useState('starter_map');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadedSpecialAssetFiles, setLoadedSpecialAssetFiles] = useState([]);

  // Load special asset scripts dynamically from map data
  useEffect(() => {
    const map = MAPS[selectedMapId];
    if (!map || !map.special_assets) return;

    // Collect unique script files to load
    const scriptFiles = [...new Set(map.special_assets.map(sa => sa.file).filter(Boolean))];

    // Load each script file that hasn't been loaded yet
    scriptFiles.forEach(file => {
      if (!loadedSpecialAssetFiles.includes(file)) {
        console.log('Loading special asset script:', file);
        const script = document.createElement('script');
        script.src = file;
        script.type = 'text/babel';
        script.onload = () => {
          console.log('Loaded special asset script:', file);
          setLoadedSpecialAssetFiles(prev => [...prev, file]);
        };
        script.onerror = () => {
          console.error('Failed to load special asset script:', file);
        };
        document.body.appendChild(script);
      }
    });
  }, [selectedMapId]);

  // Initialize cards and assets from map data or fallback to hardcoded
  const [cards, setCards] = useState(() => {
    const map = MAPS[selectedMapId];
    if (map && map.cards) {
      setMapLoaded(true);
      return map.cards.map(c => mkCard(c.id, c.x, c.y));
    }
    // Fallback to hardcoded
    setMapLoaded(true);
    return [
      mkCard("outer_disciple", 100, 110),
      mkCard("outer_disciple", 280, 110),
      mkCard("spirit_herb", 460, 110),
      mkCard("cultivation_manual", 640, 100),
      mkCard("alchemy_cauldron", 820, 120),
      mkCard("sect_hall", 920, 120),
      mkCard("demon_beast", 120, 110),
    ];
  });

  const [assets, setAssets] = useState(() => {
    const map = MAPS[selectedMapId];
    if (map) {
      const result = [];
      // Regular assets
      if (map.assets) {
        result.push(...map.assets.map(a => mkAsset(a.id, a.x, a.y, a.scale || 3)));
      }
      // Special assets - expand alchemy_cauldron into top + bottom parts
      if (map.special_assets) {
        const expanded = expandSpecialAssets(map.special_assets);
        result.push(...expanded.map(sa =>
          mkSpAsset(sa.id, sa.x, sa.y, sa.scale || 1, sa.file, sa.logic || null)
        ));
      }
      return result;
    }
    // Fallback to hardcoded
    return [
      mkAsset("martial_arena", 1000, 200),
      mkAsset("crafting_cauldron_top", 0, 200, 1),
      mkAsset("crafting_cauldron_bottom", (524 - 420) / 2 / 3, 200 + 515 / 3 - 10, 1),
    ];
  });

  const [inventory, setInventory] = useState({});
  const [draggingUid, setDragging] = useState(null);
  const [craftMap, setCraftMap] = useState({});
  const [toasts, setToasts] = useState([]);
  const [hovered, setHovered] = useState(null);
  const [cauldronSlots, setCauldronSlots] = useState(Array(9).fill(null)); // 3x3 grid
  const [selectedRecipe, setSelectedRecipe] = useState(null); // Selected recipe from dropdown
  const [draggedCard, setDraggedCard] = useState(null); // Card being dragged for cauldron
  const [cauldronHoveredSlot, setCauldronHoveredSlot] = useState(null);
  const [draggingFromSlot, setDraggingFromSlot] = useState(null); // Slot index being dragged from
  const [draggedSlotCard, setDraggedSlotCard] = useState(null); // Card data for rendering during slot drag
  const [slotDragStarted, setSlotDragStarted] = useState(false); // Track if drag occurred
  const [draggingCauldron, setDraggingCauldron] = useState(false);
  const [cauldronDragOffset, setCauldronDragOffset] = useState({ x: 0, y: 0 }); // Debug: current hovered slot

  const boardRef = useRef(null);
  const dragRef = useRef(null);
  const craftsRef = useRef({});

  const toast = useCallback((text) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2900);
  }, []);

  const handleMouseDown = useCallback((e, card) => {
    e.preventDefault(); e.stopPropagation();
    const br = boardRef.current.getBoundingClientRect();
    dragRef.current = { uid: card.uid, ox: e.clientX - br.left - card.x, oy: e.clientY - br.top - card.y };
    setDragging(card.uid); setHovered(card.id);
    setDraggedCard(card); // Track dragged card for cauldron drop
    setCards(prev => {
      const idx = prev.findIndex(c => c.uid === card.uid);
      if (idx === -1) return prev;
      return [...prev.slice(0, idx), ...prev.slice(idx + 1), prev[idx]];
    });
  }, []);

  const handleCauldronDragStart = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    const topAsset = assets.find(a => a.id === "crafting_cauldron_top");
    if (!topAsset) return;
    const br = boardRef.current.getBoundingClientRect();
    const mouseX = e.clientX - br.left;
    const mouseY = e.clientY - br.top;

    // Use CauldronLogic if available, otherwise fallback to inline
    if (window.CauldronLogic) {
      const offset = window.CauldronLogic.getCauldronDragOffset(mouseX, mouseY, topAsset.x, topAsset.y);
      setCauldronDragOffset(offset);
    } else {
      setCauldronDragOffset({ x: mouseX - topAsset.x, y: mouseY - topAsset.y });
    }

    setDraggingCauldron(true);
  }, [assets]);

  const handleSlotDragStart = useCallback((e, slotIndex) => {
    e.preventDefault(); e.stopPropagation();
    const card = cauldronSlots[slotIndex];
    if (!card) return;

    const topAsset = assets.find(a => a.id === "crafting_cauldron_top");
    if (!topAsset) return;

    const br = boardRef.current.getBoundingClientRect();
    const mouseX = e.clientX - br.left;
    const mouseY = e.clientY - br.top;

    // Calculate card position to follow cursor
    const cardX = mouseX - CARD_W / 2;
    const cardY = mouseY - CARD_H / 2;

    setDraggingFromSlot(slotIndex);
    setDragging(card.uid);
    setHovered(card.id);
    setSlotDragStarted(false); // Reset drag flag
    // Create a temporary card for rendering during drag (not in cards array)
    setDraggedSlotCard({ ...card, x: cardX, y: cardY });
  }, [cauldronSlots, assets, setDraggingFromSlot, setDragging, setHovered, setSlotDragStarted, setDraggedSlotCard]);

  useEffect(() => {
    const onMove = (e) => {
      const drag = dragRef.current; if (!drag) return;
      const br = boardRef.current?.getBoundingClientRect(); if (!br) return;
      const nx = Math.max(0, Math.min(br.width - CARD_W, e.clientX - br.left - drag.ox));
      const ny = Math.max(0, Math.min(br.height - CARD_H, e.clientY - br.top - drag.oy));
      setCards(prev => prev.map(c => c.uid === drag.uid ? { ...c, x: nx, y: ny } : c));

      // Check if hovering over cauldron slot
      const cauldronAsset = assets.find(a => a.id === "crafting_cauldron_top");
      if (cauldronAsset && draggedCard) {
        let slotIndex = -1;

        // Use CauldronLogic if available, otherwise use inline fallback
        if (window.CauldronLogic) {
          if (window.CauldronLogic.isWithinCauldron(nx, ny, cauldronAsset.x, cauldronAsset.y)) {
            slotIndex = window.CauldronLogic.getSlotIndexFromPosition(nx, ny, cauldronAsset.x, cauldronAsset.y);
          }
        } else {
          // Inline fallback geometry
          const cx = cauldronAsset.x;
          const cy = cauldronAsset.y;
          const cw = 524 / 3;
          const ch = 515 / 3;
          const GRID_OFFSET_X = (524 / 4) * 0.5 / 3;
          const GRID_OFFSET_Y = (515 / 4) * 0.5 / 3;
          const SLOT_W = ((524 / 4) * 3 / 3) / 3;
          const SLOT_H = ((515 / 4) * 3 / 3) / 3;

          if (nx >= cx && nx <= cx + cw && ny >= cy && ny <= cy + ch) {
            const relativeX = nx - cx - GRID_OFFSET_X;
            const relativeY = ny - cy - GRID_OFFSET_Y;
            const slotX = Math.floor(relativeX / SLOT_W);
            const slotY = Math.floor(relativeY / SLOT_H);
            slotIndex = slotY * 3 + slotX;
          }
        }

        console.log('Drag hover:', { nx, ny, cauldronX: cauldronAsset.x, cauldronY: cauldronAsset.y, slotIndex, inCauldron: slotIndex >= 0 });

        if (slotIndex >= 0 && slotIndex < 9 && !cauldronSlots[slotIndex]) {
          setCauldronHoveredSlot(slotIndex);
        } else {
          setCauldronHoveredSlot(null);
        }
      } else {
        setCauldronHoveredSlot(null);
      }
    };
    const onUp = () => {
      const drag = dragRef.current; if (!drag) return;
      const movedUid = drag.uid;

      // Get card position BEFORE clearing drag state
      const cardPos = cards.find(c => c.uid === movedUid);
      const movedCard = draggedCard || cardPos;

      dragRef.current = null; setDragging(null); setDraggedCard(null);
      setCauldronHoveredSlot(null); // Clear hover on drop

      // Check if dropped on cauldron
      const cauldronAsset = assets.find(a => a.id === "crafting_cauldron_top");
      if (cauldronAsset && movedCard && cardPos) {
        let slotIndex = -1;

        // Use CauldronLogic if available, otherwise use inline fallback
        if (window.CauldronLogic) {
          if (window.CauldronLogic.isWithinCauldron(cardPos.x, cardPos.y, cauldronAsset.x, cauldronAsset.y)) {
            slotIndex = window.CauldronLogic.getSlotIndexFromPosition(cardPos.x, cardPos.y, cauldronAsset.x, cauldronAsset.y);
          }
        } else {
          // Inline fallback geometry
          const cx = cauldronAsset.x;
          const cy = cauldronAsset.y;
          const cw = 524 / 3;
          const ch = 515 / 3;
          const GRID_OFFSET_X = (524 / 4) * 0.5 / 3;
          const GRID_OFFSET_Y = (515 / 4) * 0.5 / 3;
          const SLOT_W = ((524 / 4) * 3 / 3) / 3;
          const SLOT_H = ((515 / 4) * 3 / 3) / 3;

          if (cardPos.x >= cx && cardPos.x <= cx + cw && cardPos.y >= cy && cardPos.y <= cy + ch) {
            const relativeX = cardPos.x - cx - GRID_OFFSET_X;
            const relativeY = cardPos.y - cy - GRID_OFFSET_Y;
            const slotX = Math.floor(relativeX / SLOT_W);
            const slotY = Math.floor(relativeY / SLOT_H);
            slotIndex = slotY * 3 + slotX;
          }
        }

        if (slotIndex >= 0 && slotIndex < 9 && !cauldronSlots[slotIndex]) {
          // Add card to slot - remove from board
          setCards(prev => prev.filter(c => c.uid !== movedUid));
          const newSlots = [...cauldronSlots];
          newSlots[slotIndex] = movedCard;
          setCauldronSlots(newSlots);
          toast(`Added ${CARD_DEFS[movedCard.id]?.name} to slot ${slotIndex}`);
          return; // Don't process regular crafting
        }
      }

      // Regular card-to-card crafting
      setCards(prev => {
        const moved = prev.find(c => c.uid === movedUid); if (!moved) return prev;
        const target = prev.find(c => c.uid !== movedUid && Math.abs(c.x - moved.x) < CARD_W * 0.7 && Math.abs(c.y - moved.y) < CARD_H * 0.7);
        if (!target) return prev;
        const recipe = findRecipe(moved.id, target.id); if (!recipe) return prev;
        const key = `${movedUid}x${target.uid}`;
        const alreadyCrafting = Object.values(craftsRef.current).some(cr => (cr.uidA === movedUid && cr.uidB === target.uid) || (cr.uidA === target.uid && cr.uidB === movedUid));
        if (alreadyCrafting) return prev;
        craftsRef.current[key] = { uidA: movedUid, uidB: target.uid, recipe, key, start: Date.now(), end: Date.now() + recipe.time * 1000 };
        return prev.map(c => c.uid === movedUid ? { ...c, x: target.x + 6, y: target.y + 6 } : c);
      });
    };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [draggedCard, assets, cauldronSlots]);

  // Slot drag-to-remove handling
  useEffect(() => {
    if (draggingFromSlot === null) return;

    const onMove = (e) => {
      const br = boardRef.current?.getBoundingClientRect();
      if (!br) return;

      const mouseX = e.clientX - br.left;
      const mouseY = e.clientY - br.top;

      // Mark that a drag actually occurred (not just a click)
      setSlotDragStarted(true);

      // Update dragged card position to follow cursor
      setDraggedSlotCard(prev => {
        if (!prev) return null;
        return { ...prev, x: mouseX - CARD_W / 2, y: mouseY - CARD_H / 2 };
      });
    };

    const onUp = (e) => {
      const br = boardRef.current?.getBoundingClientRect();
      if (!br) return;

      const mouseX = e.clientX - br.left;
      const mouseY = e.clientY - br.top;

      // Check if dropped outside cauldron area
      const cauldronAsset = assets.find(a => a.id === "crafting_cauldron_top");
      const cardInSlot = cauldronSlots[draggingFromSlot];

      if (cardInSlot && cauldronAsset) {
        let insideCauldron = false;

        // Use CauldronLogic if available
        if (window.CauldronLogic) {
          insideCauldron = window.CauldronLogic.isWithinCauldron(mouseX, mouseY, cauldronAsset.x, cauldronAsset.y);
        } else {
          // Inline fallback
          const cx = cauldronAsset.x;
          const cy = cauldronAsset.y;
          const cw = 524 / 3;
          const ch = 515 / 3;
          insideCauldron = mouseX >= cx && mouseX <= cx + cw && mouseY >= cy && mouseY <= cy + ch;
        }

        if (!insideCauldron) {
          // Remove card from slot and add to board at drop position
          const newCard = { ...cardInSlot, x: mouseX - CARD_W / 2, y: mouseY - CARD_H / 2 };
          setCards(prev => [...prev, newCard]);

          // Clear the slot
          const newSlots = [...cauldronSlots];
          newSlots[draggingFromSlot] = null;
          setCauldronSlots(newSlots);

          toast("Ingredient removed from cauldron");
        }
        // If dropped inside cauldron, card stays in slot (no action needed)
      }

      // Reset drag state
      setDraggingFromSlot(null);
      setDragging(null);
      setDraggedSlotCard(null);
      setSlotDragStarted(false);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draggingFromSlot, cauldronSlots, assets]);

  // Cauldron drag handling - using CauldronLogic
  useEffect(() => {
    const onCauldronMove = (e) => {
      if (!draggingCauldron) return;
      const br = boardRef.current?.getBoundingClientRect();
      if (!br) return;
      const newX = e.clientX - br.left - cauldronDragOffset.x;
      const newY = e.clientY - br.top - cauldronDragOffset.y;

      setAssets(prev => prev.map(a => {
        if (a.id === "crafting_cauldron_top") {
          return { ...a, x: newX, y: newY };
        }
        if (a.id === "crafting_cauldron_bottom") {
          if (window.CauldronLogic) {
            const positions = window.CauldronLogic.getCauldronDragPositions(newX, newY);
            return { ...a, x: positions.bottom.x, y: positions.bottom.y };
          }
          // Fallback to inline calculation
          return { ...a, x: newX + (524 - 420) / 2 / 3, y: newY + 515 / 3 - 10 };
        }
        return a;
      }));
    };

    const onCauldronUp = () => {
      setDraggingCauldron(false);
    };

    if (draggingCauldron) {
      window.addEventListener("mousemove", onCauldronMove);
      window.addEventListener("mouseup", onCauldronUp);
    }

    return () => {
      window.removeEventListener("mousemove", onCauldronMove);
      window.removeEventListener("mouseup", onCauldronUp);
    };
  }, [draggingCauldron, cauldronDragOffset]);

  useEffect(() => {
    const tick = setInterval(() => {
      const now = Date.now(); const newMap = {}; const done = [];
      for (const craft of Object.values(craftsRef.current)) {
        const pct = Math.min(1, (now - craft.start) / (craft.recipe.time * 1000));
        newMap[craft.uidA] = { pct, remaining: Math.max(0, (craft.end - now) / 1000) };
        if (pct >= 1) done.push(craft);
      }
      setCraftMap(newMap);
      done.forEach(craft => {
        delete craftsRef.current[craft.key];
        setCards(prev => {
          const ca = prev.find(c => c.uid === craft.uidA);
          const cb = prev.find(c => c.uid === craft.uidB);

          if (!ca || !cb) return prev;

          const newCards = [];
          // 1. Dodaj główny produkt (np. jagoda)
          if (craft.recipe.out) {
            newCards.push(mkCard(craft.recipe.out, ca.x + CARD_W + 20, ca.y));
          }

          // 2. Logika zachowania karty (np. wieśniaka)
          let keepA = false;
          let keepB = false;

          if (craft.recipe.out_b) {
            const targetId = String(craft.recipe.out_b).trim();
            if (ca.id === targetId) {
              keepA = true;
            } else if (cb.id === targetId) {
              keepB = true;
            } else if (targetId !== "") {
              newCards.push(mkCard(targetId, ca.x, ca.y));
            }
          }

          // 3. Zwróć nową listę (usuń tylko te, których nie zachowujemy)
          return prev.filter(c => {
            if (c.uid === craft.uidA) return keepA;
            if (c.uid === craft.uidB) return keepB;
            return true;
          }).concat(newCards);
        });

        if (craft.recipe.out) {
          toast(`✨ Gotowe: ${CARD_DEFS[craft.recipe.out]?.name || craft.recipe.out}`);
        }
      });
    }, 80);
    return () => clearInterval(tick);
  }, [toast]);

  // Load a map by name
  const loadMap = (mapId) => {
    const map = MAPS[mapId];
    if (!map) {
      toast(`❌ Map "${mapId}" not found!`);
      return;
    }

    // Load special asset scripts first
    if (map.special_assets) {
      const scriptFiles = [...new Set(map.special_assets.map(sa => sa.file).filter(Boolean))];

      scriptFiles.forEach(file => {
        if (!loadedSpecialAssetFiles.includes(file)) {
          console.log('Loading special asset script:', file);
          const script = document.createElement('script');
          script.src = file;
          script.type = 'text/babel';
          script.onload = () => {
            console.log('Loaded special asset script:', file);
            setLoadedSpecialAssetFiles(prev => [...prev, file]);
          };
          document.body.appendChild(script);
        }
      });
    }

    // Clear current state
    setCards([]);
    setAssets([]);
    setCauldronSlots(Array(9).fill(null));

    // Load cards from map
    if (map.cards) {
      setCards(map.cards.map(c => mkCard(c.id, c.x, c.y)));
    }

    // Load assets and special assets from map
    if (map.assets || map.special_assets) {
      const newAssets = [];
      if (map.assets) {
        newAssets.push(...map.assets.map(a => mkAsset(a.id, a.x, a.y, a.scale || 1)));
      }
      if (map.special_assets) {
        // Expand alchemy_cauldron into top + bottom parts
        const expanded = expandSpecialAssets(map.special_assets);
        newAssets.push(...expanded.map(sa =>
          mkSpAsset(sa.id, sa.x, sa.y, sa.scale || 1, sa.file, sa.logic || null)
        ));
      }
      setAssets(newAssets);
    }

    setSelectedMapId(mapId);
    setMapLoaded(true);
    toast(`🗺️ Loaded map: ${map.name || mapId}`);
  };

  const handleCauldronCraft = () => {
    // Use CauldronLogic from special_assets/cauldron.js
    const cauldronAsset = assets.find(a => a.id === "crafting_cauldron_top");
    const result = window.CauldronLogic?.craft(cauldronSlots, CRAFTING_RECIPES, cauldronAsset);

    if (!result || !result.success) {
      toast(result?.error || "❌ Ingredients don't match any recipe!");
      return;
    }

    // Remove used cards and add product
    setCards(prev => {
      const filtered = prev.filter(c => !result.usedUids.includes(c.uid));
      filtered.push(mkCard(result.output, result.spawnX, result.spawnY));
      return filtered;
    });

    // Clear slots
    setCauldronSlots(Array(9).fill(null));

    toast(`✨ Crafted: ${CARD_DEFS[result.output]?.name || result.output}!`);
  };

  // Check if cauldron slots match ANY recipe - using CauldronLogic
  const canCraft = window.CauldronLogic?.canCraft(cauldronSlots, CRAFTING_RECIPES) || false;


  return (
    <div style={{ width: "100vw", height: "100vh", fontFamily: "'Nunito','Segoe UI',sans-serif", display: "flex", flexDirection: "column", overflow: "hidden", background: "#5a9040" }}>
      {/* Środek Gry */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Stół (z ładnymi radialnymi gradientami) */}
        <div ref={boardRef} style={{
          flex: 1, position: "relative",
          background: `
            radial-gradient(ellipse at 15% 25%, #8ab56040 0%, transparent 40%),
            radial-gradient(ellipse at 78% 68%, #4a803060 0%, transparent 50%),
            radial-gradient(ellipse at 50% 5%, #72b05040 0%, transparent 35%)
          `,
          overflow: "hidden"
        }} onMouseDown={(e) => { if (e.target === boardRef.current) { setDragging(null); setHovered(null); } }}>
          <div style={{ position: "absolute", inset: 10, border: "2px solid rgba(180,150,100,0.22)", borderRadius: 10, pointerEvents: "none", background: "rgba(200,180,140,0.06)" }} />
          {assets.map(asset => (
            <GameAsset
              key={asset.uid}
              asset={asset}
              selectedRecipe={selectedRecipe}
              cauldronSlots={cauldronSlots}
              hoveredSlot={cauldronHoveredSlot}
              onCauldronDragStart={handleCauldronDragStart}
              draggingFromSlot={draggingFromSlot}
              handleSlotDragStart={handleSlotDragStart}
              slotDragStarted={slotDragStarted}
              onSlotClick={(slotIndex) => {
                // Use CauldronLogic for slot click handling
                const cauldronAsset = assets.find(a => a.id === "crafting_cauldron_top");
                const result = window.CauldronLogic?.onSlotClick(slotIndex, cauldronSlots, cauldronAsset);

                if (result) {
                  setCards(prev => [...prev, result.card]);
                  const newSlots = [...cauldronSlots];
                  newSlots[result.slotIndex] = null;
                  setCauldronSlots(newSlots);
                  toast("Ingredient returned to board");
                }
              }}
            />
          ))}
          {cards.map(card => (
            <GameCard key={card.uid} card={card} isDragging={draggingUid === card.uid} craftPct={craftMap[card.uid]?.pct} craftRemaining={craftMap[card.uid]?.remaining} onMouseDown={(e) => handleMouseDown(e, card)} />
          ))}

          {/* Render card being dragged from cauldron slot */}
          {draggedSlotCard && (
            <GameCard key={`dragged-${draggedSlotCard.uid}`} card={draggedSlotCard} isDragging={true} craftPct={0} craftRemaining={0} onMouseDown={() => {}} />
          )}

          {/* Craft Button under cauldron - crafts directly when ingredients match recipe */}
          {!draggingCauldron && assets.find(a => a.id === "crafting_cauldron_top") && (
            <button
              onClick={() => {
                if (canCraft) {
                  handleCauldronCraft();
                } else {
                  toast("Ingredients don't match any recipe!");
                }
              }}
              disabled={!canCraft}
              style={{
                position: "absolute",
                left: assets.find(a => a.id === "crafting_cauldron_top").x + (CARD_W * 1) / 2 - 40,
                top: assets.find(a => a.id === "crafting_cauldron_top").y + CARD_H * 1 + 10,
                width: 80,
                padding: "6px 10px",
                fontSize: 11,
                fontWeight: 800,
                background: canCraft ? "linear-gradient(160deg, #7bc244, #4a9010)" : "linear-gradient(160deg, #6a3c8a, #4a2a6a)",
                color: "#fff",
                border: "2px solid #fff",
                borderRadius: 6,
                cursor: canCraft ? "pointer" : "not-allowed",
                boxShadow: canCraft ? "0 3px 8px #0004" : "none",
                zIndex: 100,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                opacity: canCraft ? 1 : 0.5
              }}
            >
              🔥 Craft
            </button>
          )}

          <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.38)", pointerEvents: "none", fontStyle: "italic" }}>
            Drag cards onto cauldron to craft • Kup pakiety u góry
          </div>

          {/* Recipe dropdown over cauldron */}
          {!draggingCauldron && selectedRecipe && (
            <div
              onClick={(e) => { e.stopPropagation(); setCauldronSlots(Array(9).fill(null)); setSelectedRecipe(null); toast("Recipe cancelled"); }}
              style={{
                position: "absolute",
                left: 0, right: 0, top: 0, bottom: 0,
                zIndex: 1000,
                cursor: "default"
              }}
            />
          )}
          {!draggingCauldron && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
            position: "absolute",
            left: assets.find(a => a.id === "crafting_cauldron_top")?.x + 10,
            top: assets.find(a => a.id === "crafting_cauldron_top")?.y - 50,
            zIndex: 200,
            background: "rgba(248,242,220,0.95)",
            border: "2px solid #c8a86b",
            borderRadius: 6,
            padding: "4px 8px",
            display: "flex",
            alignItems: "center",
            gap: 6
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#7a5820" }}>RECIPE:</span>
            <select
              value={selectedRecipe || ""}
              onChange={(e) => setSelectedRecipe(e.target.value || null)}
              onClick={(e) => e.stopPropagation()}
              style={{
                padding: "3px 6px",
                fontSize: 10,
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 600,
                background: "#fff",
                border: "1px solid #c8a86b",
                borderRadius: 4,
                color: "#3a2808",
                cursor: "pointer"
              }}
            >
              <option value="">-- Any Recipe --</option>
              {CRAFTING_RECIPES.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          )}
        </div>
      </div>
      <Toasts list={toasts} />

      {/* Map Selector - Bottom Right */}
      {DEBUG_MAP_SELECTOR && (
        <div style={{ position: "fixed", bottom: 20, right: 14, zIndex: 1000, background: "rgba(0,0,0,0.8)", padding: "10px 15px", borderRadius: 8, border: "2px solid #c8a86b" }}>
          <div style={{ color: "#fff", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>🗺️ Map Selector</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select
              value={selectedMapId}
              onChange={(e) => loadMap(e.target.value)}
              style={{ background: "#1a1a1a", color: "#f0d080", border: "1px solid #c8a86b", borderRadius: 4, padding: "4px 8px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              {Object.keys(MAPS).map(mapId => (
                <option key={mapId} value={mapId}>{MAPS[mapId]?.name || mapId}</option>
              ))}
            </select>
            <span style={{ color: "#888", fontSize: 10 }}>Loaded: {mapLoaded ? selectedMapId : 'none'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── KONTROLER ŁADOWANIA PLIKÓW ──────────────────────────────────────────────
function GameWrapper() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {

    // Removed undefined assets loop; CARD_DEFS will be populated from assets.yaml parsing below
    console.log("Załadowane definicje kart:", Object.keys(CARD_DEFS)); // To pokaże, czy "outer_disciple" tam jest
    async function fetchAllData() {
      try {
        console.log("1. Próba fetchowania plików...");

        // Fetch maps registry first
        let mapIds = ['starter_map']; // Default maps
        try {
          const mapsIndexRes = await fetch('maps/index.json');
          if (mapsIndexRes.ok) {
            const mapsIndex = await mapsIndexRes.json();
            mapIds = mapsIndex.maps || mapIds;
          }
        } catch (e) {
          console.log("No maps/index.json, using default maps");
        }

        // Fetch all maps
        const mapPromises = mapIds.map(id => fetch(`maps/${id}.json`).then(r => r.ok ? r.json() : null));
        const mapResults = await Promise.all(mapPromises);
        mapResults.forEach((map, i) => {
          if (map) {
            MAPS[mapIds[i]] = map;
            console.log(`Loaded map: ${mapIds[i]}`);
          }
        });

        const [questsRes, cardsRes, assetsRes, recipesRes, craftingRes] = await Promise.all([
          fetch('quests.json'),
          fetch('cards.yaml'),
          fetch('assets.yaml'),
          fetch('recipes.csv'),
          fetch('crafting_recipes.csv')
        ]);
        console.log("2. Pliki pobrane, sprawdzam statusy...");
        if (!questsRes.ok) throw new Error("Brak pliku quests.json");
        if (!cardsRes.ok) throw new Error("Brak pliku cards.yaml");
        if (!assetsRes.ok) throw new Error("Brak pliku assets.yaml");
        if (!recipesRes.ok) throw new Error("Brak pliku recipes.csv");
        if (!craftingRes.ok) throw new Error("Brak pliku crafting_recipes.csv");

        QUESTS = await questsRes.json();

        // Load cards from cards.yaml
        const cardsText = await cardsRes.text();
        const cardsObj = jsyaml.load(cardsText);
        console.log("3. Cards sparsowane:", cardsObj);
        if (Array.isArray(cardsObj)) {
          cardsObj.forEach(c => { CARD_DEFS[c.id] = c; });
        } else if (cardsObj) {
          if (cardsObj.cards) cardsObj.cards.forEach(c => { CARD_DEFS[c.id] = c; });
          if (cardsObj.packs) cardsObj.packs.forEach(p => { PACK_DEFS[p.id] = p; });
        }

        // Load assets from assets.yaml
        const assetsText2 = await assetsRes.text();
        const assetsObj = jsyaml.load(assetsText2);
        console.log("4. Assets sparsowane:", assetsObj);
        if (Array.isArray(assetsObj)) {
          assetsObj.forEach(a => { CARD_DEFS[a.id] = a; });
        } else if (assetsObj) {
          if (assetsObj.buildings) assetsObj.buildings.forEach(a => { CARD_DEFS[a.id] = a; });
          if (assetsObj.packs) assetsObj.packs.forEach(p => { PACK_DEFS[p.id] = p; });
        }

        // Load simple recipes from recipes.csv
        const csvText = await recipesRes.text();
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (res) => {
            RECIPES = res.data
              .filter(r => r.input_a) // ignoruj puste
              .map(r => ({
                a: String(r.input_a).trim(),
                b: String(r.input_b || "").trim(),
                out: String(r.output_a || r.output || "").trim(),
                out_b: String(r.output_b || "").trim(),
                time: parseInt(r.time_seconds || 5)
              }));
          }
        });

        // Load crafting recipes from crafting_recipes.csv (3x3 grid)
        const craftingCsvText = await craftingRes.text();
        Papa.parse(craftingCsvText, {
          header: true,
          skipEmptyLines: true,
          complete: (res) => {
            CRAFTING_RECIPES = res.data.filter(r => r.id && r.name);
            console.log("5. Crafting recipes sparsowane:", CRAFTING_RECIPES);
            console.log("6. Loaded maps:", Object.keys(MAPS));
            setLoading(false);
          }
        });

      } catch (err) {
        console.error("Błąd ładowania gry:", err);
        setError(err.message);
      }
    }
    fetchAllData();
  }, []);

  if (error) return (
    <div style={{ color: '#ff4444', padding: 30, background: '#fff', margin: 20, borderRadius: 10, fontFamily: "sans-serif" }}>
      <h2>Błąd podczas ładowania!</h2>
      <p>{error}</p>
      <p>Upewnij się, że używasz komendy <b>python -m http.server 8080</b> i pliki leżą we właściwym folderze.</p>
    </div>
  );
  if (loading) return null; // Kiedy null, index.html wciąż pokazuje "Trwa ładowanie..."

  return <Stacklands />;
}

// ─── START APLIKACJI ─────────────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<GameWrapper />);
