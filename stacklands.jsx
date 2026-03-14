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
let STRINGS = {}; // Localization strings from strings.csv
let DIALOGS = []; // Dialog definitions from dialogs.json

const TYPE_COLORS = THEME.colors; // Use theme colors for type colors

const CARD_W = THEME.card.width;
const CARD_H = THEME.card.height;


let _uid = 1;
const mkCard = (id, x, y) => ({ uid: _uid++, id, x, y });
const mkAsset = (id, x, y, scale = 3) => ({ uid: _uid++, id, x, y, isAsset: true, scale });
const mkSpAsset = (id, x, y, scale, file, logic) => ({ uid: _uid++, id, x, y, isAsset: true, scale, isSpecial: true, file, logic });

// Expand alchemy_cauldron special asset into top + bottom parts
const expandSpecialAssets = (specialAssets) => {
  const result = [];
  for (const sa of specialAssets) {
    if (sa.id === 'alchemy_cauldron') {
      // Expand into two parts - bottom attaches to top with offset
      // Both parts are 540px wide, so X offset = 0 (centered)
      // Y offset: top height (566/3=188.67) minus overlap (~13px) = 175.67
      result.push({
        ...sa,
        id: 'crafting_cauldron_top',
        x: sa.x,
        y: sa.y,
      });
      result.push({
        ...sa,
        id: 'crafting_cauldron_bottom',
        x: sa.x,
        y: sa.y + 176,
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

  const typeColor = TYPE_COLORS[def.type] || THEME.colors.accent;
  const isEnemy = def.type === "enemy";

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: "absolute", left: card.x, top: card.y,
        width: CARD_W, height: CARD_H, perspective: "600px",
        zIndex: isDragging ? THEME.zIndex.cardDrag : THEME.zIndex.base, cursor: isDragging ? "grabbing" : "grab", userSelect: "none",
      }}
    >
      <div style={{
        width: "100%", height: "100%", borderRadius: THEME.borderRadius.lg,
        background: THEME.disableCardGradient
          ? (isEnemy ? THEME.colors.cardBgDark : THEME.colors.cardBg)
          : (isEnemy ? `linear-gradient(160deg, ${THEME.colors.cardBgDark} 0%, #d4c0a8 100%)` : `linear-gradient(160deg, ${THEME.colors.cardBg} 0%, #f0e8d0 100%)`),
        border: THEME.thickCardBorder
          ? `3px solid ${isEnemy ? THEME.colors.cardBorderEnemy : THEME.colors.cardBorder}`
          : (isDragging ? `3px solid ${THEME.colors.accent}` : `2px solid ${isEnemy ? THEME.colors.cardBorderEnemy : THEME.colors.cardBorder}`),
        boxShadow: isDragging ? THEME.shadows.cardDrag : THEME.shadows.card,
        transform: isDragging ? "scale(1.08) rotate(-4deg) translateY(-8px)" : "scale(1) rotate(0deg) translateY(0px)",
        transition: isDragging ? `transform ${THEME.transitions.drag}, box-shadow ${THEME.transitions.drag}, border-color 0.1s` : `transform ${THEME.transitions.normal}, box-shadow ${THEME.transitions.normal}, border-color 0.1s`,
        overflow: "hidden", display: "flex", flexDirection: "column",
        fontFamily: THEME.typography.fontFamily, willChange: "transform",
      }}>
        <div style={{ height: 6, background: `linear-gradient(90deg, ${typeColor}, ${typeColor}aa)`, flexShrink: 0 }} />
        <div style={{ textAlign: "center", fontSize: THEME.typography.sizes.xs, fontWeight: THEME.typography.weights.extrabold, color: typeColor, letterSpacing: "0.1em", marginTop: 4, textTransform: "uppercase", opacity: 0.85 }}>{def.type}</div>

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

        <div style={{ textAlign: "center", fontSize: THEME.typography.sizes.lg, fontWeight: THEME.typography.weights.extrabold, color: THEME.colors.textDark, padding: "0 8px 2px", lineHeight: 1.2 }}>{def.name}</div>
        <div style={{ textAlign: "center", fontSize: THEME.typography.sizes.sm, color: "#8a6030", padding: "0 6px 6px", fontStyle: "italic" }}>{def.name_pl}</div>

        {craftPct !== undefined && (
          <>
            <div style={{ margin: "0 8px", height: 6, background: THEME.colors.progressBg, borderRadius: THEME.borderRadius.sm, overflow: "hidden", flexShrink: 0 }}>
              <div style={{ height: "100%", width: `${craftPct * 100}%`, background: `linear-gradient(90deg, ${THEME.colors.progressFill}, ${THEME.colors.progressFillDark})`, transition: "width 0.08s linear", borderRadius: THEME.borderRadius.sm }} />
            </div>
            <div style={{ textAlign: "center", fontSize: THEME.typography.sizes.xs, color: "#7a5820", padding: "3px 0 5px" }}>⚙ {Math.ceil(craftRemaining)}s</div>
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
  // Images have 8px padding for outline: top=540x566, bottom=540x134
  const geometry = window.CauldronLogic?.geometry || {
    CAULDRON_TOP_W: 540 / 3,   // ~180px (full image width scaled)
    CAULDRON_TOP_H: 566 / 3,   // ~188.67px (full image height scaled)
    GRID_OFFSET_X: 8/3 + (524 / 4) * 0.5 / 3,  // ~24.50px (padding + content offset)
    GRID_OFFSET_Y: 8/3 + (515 / 4) * 0.5 / 3,  // ~24.12px (padding + content offset)
    GRID_W: (524 / 4) * 3 / 3,                 // ~131px (content grid width)
    GRID_H: (515 / 4) * 3 / 3,                 // ~128.75px (content grid height)
    SLOT_W: ((524 / 4) * 3 / 3) / 3,           // ~43.67px (content slot width)
    SLOT_H: ((515 / 4) * 3 / 3) / 3,           // ~42.92px (content slot height)
  };

  const width = isCauldronTop ? geometry.CAULDRON_TOP_W : isCauldronBottom ? 540 / 3 : CARD_W * (asset.scale || 1);
  const height = isCauldronTop ? geometry.CAULDRON_TOP_H : isCauldronBottom ? 134 / 3 : CARD_H * (asset.scale || 1);

  // Slot positions from CauldronLogic (relative to cauldron container)
  const slotPositions = window.CauldronLogic?.getAllSlotPositions() || [];

  // Get recipe requirements if selected
  const recipe = selectedRecipe ? CRAFTING_RECIPES.find(r => r.id === selectedRecipe) : null;

  return (
    <div
      data-asset-id={asset.id}
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
              background: isHovered ? THEME.colors.slotHover : isFilled ? THEME.colors.slotFilled : showRequirement ? THEME.colors.slotRequired : "transparent",
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

// ─── DIALOG BOX (zaokrąglony czarny dymek nad assetem) ───────────────────────
function DialogBox({ text, speakerId, targetX, targetY, onClick, speakerDef }) {
  if (!text) return null;

  // Box dimensions for centering
  const boxWidth = 350;
  const boxHeight = 150;

  return (
    <div
      onClick={onClick}
      style={{
        position: "fixed",
        left: targetX || 400,
        top: (targetY || 300) - 10,
        transform: "translate(-50%, -100%)",
        maxWidth: "400px",
        width: "auto",
        minWidth: "280px",
        background: "rgba(0, 0, 0, 0.95)",
        border: `3px solid ${THEME.colors.accent}`,
        borderRadius: "20px",
        padding: "16px 20px",
        zIndex: THEME.zIndex.dialog || 1000,
        cursor: "pointer",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        animation: "dialogFadeIn 0.3s ease",
        marginBottom: "10px"
      }}
    >
      {/* Speaker name + icon */}
      {speakerDef && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
          paddingBottom: 10,
          borderBottom: `2px solid ${THEME.colors.accent}44`
        }}>
          <div style={{
            width: 36,
            height: 36,
            background: THEME.colors.cardBg,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            border: `2px solid ${THEME.colors.accent}`,
            flexShrink: 0
          }}>
            {speakerDef.texture ? (
              <img src={speakerDef.texture} alt="" style={{ width: "80%", height: "80%", objectFit: "contain", borderRadius: "50%" }} />
            ) : (
              speakerDef.emoji || "?"
            )}
          </div>
          <span style={{
            color: THEME.colors.accent,
            fontWeight: THEME.typography.weights.extrabold,
            fontSize: THEME.typography.sizes.md,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            whiteSpace: "nowrap"
          }}>
            {speakerDef.name}
          </span>
        </div>
      )}

      {/* Dialog text */}
      <p style={{
        color: "#f5f0e0",
        fontSize: THEME.typography.sizes.lg,
        lineHeight: 1.5,
        margin: 0,
        fontFamily: THEME.typography.fontFamily
      }}>
        {text}
      </p>

      {/* Click hint */}
      <div style={{
        textAlign: "right",
        fontSize: THEME.typography.sizes.xs,
        color: "#777",
        fontStyle: "italic",
        marginTop: 12
      }}>
        Click to continue →
      </div>
    </div>
  );
}

// ─── DIALOG MANAGER (obsługuje dialogi z questów - prosta sekwencja) ─────────
function DialogManager({ activeQuestId, onComplete, assets, cards, onDialogComplete, onGivePerfectPill, onActivateQuest }) {
  const [currentDialogIndex, setCurrentDialogIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [lastQuestId, setLastQuestId] = useState(null);

  const questDialog = DIALOGS?.find(d => d.quest_id === activeQuestId);

  console.log('[DialogManager] activeQuestId=', activeQuestId);
  console.log('[DialogManager] questDialog=', questDialog);
  console.log('[DialogManager] DIALOGS=', DIALOGS);
  console.log('[DialogManager] started=', started, 'lastQuestId=', lastQuestId);

  // Auto-start dialog sequence when quest activates (or resets for new quest)
  useEffect(() => {
    if (questDialog && activeQuestId !== lastQuestId) {
      // New quest - reset and start
      console.log('[DialogManager] New quest detected, starting dialog sequence:', activeQuestId);
      setStarted(true);
      setCurrentDialogIndex(0);
      setLastQuestId(activeQuestId);
    }
  }, [activeQuestId, questDialog, lastQuestId]);

  if (!questDialog || !started) {
    console.log('[DialogManager] Not rendering - questDialog:', !!questDialog, 'started:', started);
    return null;
  }

  const dialogConfig = questDialog.dialogs.find(d => d.index === currentDialogIndex);
  if (!dialogConfig) {
    console.log('[DialogManager] No dialogConfig for index:', currentDialogIndex);
    return null;
  }

  const text = STRINGS[dialogConfig.text_id] || dialogConfig.text_id;
  const speakerDef = CARD_DEFS[dialogConfig.asset_id];

  console.log('[DialogManager] Rendering dialog:', dialogConfig.text_id, 'text:', text);

  // Execute on_show actions
  if (dialogConfig.on_show === 'give_perfect_pill' && !perfectPillGivenRef.current) {
    onGivePerfectPill?.();
    perfectPillGivenRef.current = true;
  }

  // Find target position
  let targetX = 400, targetY = 300;
  const targetAsset = assets?.find(a => a.id === dialogConfig.asset_id);
  if (targetAsset) {
    const assetWidth = CARD_W * (targetAsset.scale || 1);
    targetX = targetAsset.x + assetWidth / 2;
    targetY = targetAsset.y;
  } else {
    const targetCard = cards?.find(c => c.id === dialogConfig.asset_id);
    if (targetCard) {
      targetX = targetCard.x + CARD_W / 2;
      targetY = targetCard.y;
    }
  }

  const handleClick = () => {
    const nextDialog = questDialog.dialogs.find(d => d.index === currentDialogIndex + 1);
    if (nextDialog) {
      setCurrentDialogIndex(nextDialog.index);
    } else {
      // Quest complete
      if (questDialog.next_quest) {
        // Will be activated by trigger (craft_fail_count)
        setCurrentDialogIndex(null);
        onDialogComplete?.(activeQuestId);
      } else {
        setCurrentDialogIndex(null);
        onDialogComplete?.(activeQuestId);
      }
    }
  };

  return (
    <DialogBox
      text={text}
      speakerDef={speakerDef}
      targetX={targetX}
      targetY={targetY}
      onClick={handleClick}
    />
  );
}

// Ref for tracking perfect pill (outside component to persist across renders)
let perfectPillGivenRef = { current: false };

function Toasts({ list }) {
  return (
    <div style={{ position: "fixed", bottom: THEME.spacing.lg, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", gap: THEME.spacing.sm, zIndex: THEME.zIndex.toast, pointerEvents: "none", alignItems: "center" }}>
      {list.map(m => (
        <div key={m.id} style={{ background: THEME.colors.toastBg, border: `2px solid ${THEME.colors.accentBorder}`, borderRadius: THEME.borderRadius.lg, padding: "7px 20px", fontSize: THEME.typography.sizes.sm, fontFamily: THEME.typography.fontFamily, fontWeight: THEME.typography.weights.bold, color: THEME.colors.toastText, boxShadow: THEME.shadows.toast, animation: "toastIn 2.8s ease forwards", whiteSpace: "nowrap" }}>{m.text}</div>
      ))}
    </div>
  );
}

function RecipeBook() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "fixed", bottom: 14, right: 14, zIndex: THEME.zIndex.base + 50, fontFamily: THEME.typography.fontFamily }}>
      <button onClick={() => setOpen(o => !o)} style={{ background: "rgba(248,242,220,0.97)", border: `2px solid ${THEME.colors.accentBorder}`, borderRadius: THEME.borderRadius.lg, padding: "7px 16px", fontSize: THEME.typography.sizes.sm, fontWeight: THEME.typography.weights.extrabold, color: THEME.colors.toastText, cursor: "pointer", boxShadow: THEME.shadows.button }}>📖 Receptury {open ? "▲" : "▼"}</button>
      {open && (
        <div style={{ position: "absolute", bottom: "110%", right: 0, width: 280, background: "rgba(248,242,220,0.99)", border: `2px solid ${THEME.colors.accentBorder}`, borderRadius: THEME.borderRadius.lg, padding: THEME.spacing.md, boxShadow: THEME.shadows.dropdown, maxHeight: 340, overflowY: "auto" }}>
          <div style={{ fontWeight: THEME.typography.weights.extrabold, fontSize: THEME.typography.sizes.sm, color: THEME.colors.toastText, marginBottom: 8 }}>📜 Wszystkie receptury</div>
          {RECIPES.map((r, i) => {
            const a = CARD_DEFS[r.a], b = CARD_DEFS[r.b], out = CARD_DEFS[r.out];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: THEME.spacing.sm, fontSize: THEME.typography.sizes.sm, color: "#5a3810", padding: "4px 0", borderBottom: `1px solid ${THEME.colors.accent}8` }}>
                <span style={{ fontSize: 18 }}>{a?.emoji || "🃏"}</span>
                <span style={{ color: THEME.colors.accentDim, fontWeight: THEME.typography.weights.bold }}>+</span>
                <span style={{ fontSize: 18 }}>{b?.emoji || "🃏"}</span>
                <span style={{ color: THEME.colors.accentDim, fontWeight: THEME.typography.weights.bold }}>→</span>
                <span style={{ fontSize: 18 }}>{out?.emoji || "🃏"}</span>
                <span style={{ fontWeight: THEME.typography.weights.bold }}>{out?.name}</span>
                <span style={{ marginLeft: "auto", fontSize: THEME.typography.sizes.xs, color: "#a08050" }}>{r.time}s</span>
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
  const [selectedMapId, setSelectedMapId] = useState('maps_crafting'); // Default tutorial map
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadedSpecialAssetFiles, setLoadedSpecialAssetFiles] = useState([]);

  // Active quest state - tutorial quest 1 starts active
  const [activeQuestId, setActiveQuestId] = useState('the_beginnings_are_hard_1');

  // XP system - track craft attempts per recipe
  const [craftAttempts, setCraftAttempts] = useState({});

  // Track craft failures for tutorial quest triggers
  const [craftFailCount, setCraftFailCount] = useState(0);

  // Handler for activating quest 2 after quest 1 completes
  const handleActivateQuest = (questId) => {
    console.log('Activating quest:', questId);
    setActiveQuestId(questId);
    // Reset perfect pill ref for new quest
    perfectPillGivenRef.current = false;
  };

  // Auto-activate quest 2 after 2 craft failures
  useEffect(() => {
    console.log('[QUEST TRIGGER] activeQuestId:', activeQuestId, 'craftFailCount:', craftFailCount);
    if (activeQuestId === 'the_beginnings_are_hard_1' && craftFailCount >= 2) {
      console.log('[QUEST TRIGGER] ACTIVATING quest 2!');
      handleActivateQuest('the_beginnings_are_hard_2');
    }
  }, [craftFailCount, activeQuestId]);

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
    // Both parts 540px wide - X offset = 0, Y offset = 176 (566/3 - 13 overlap)
    return [
      mkAsset("martial_arena", 1000, 200),
      mkAsset("crafting_cauldron_top", 0, 200, 1),
      mkAsset("crafting_cauldron_bottom", 0, 200 + 176, 1),
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

    // Offset is always relative to top part - this ensures the cauldron moves
    // as a unit regardless of which part you click
    const offset = {
      x: mouseX - topAsset.x,
      y: mouseY - topAsset.y
    };
    setCauldronDragOffset(offset);

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
          // Inline fallback geometry - images have 8px padding: top=540x566, bottom=540x134
          const cx = cauldronAsset.x;
          const cy = cauldronAsset.y;
          const cw = 540 / 3;
          const ch = 566 / 3;
          const GRID_OFFSET_X = 8/3 + (524 / 4) * 0.5 / 3;  // padding + content offset
          const GRID_OFFSET_Y = 8/3 + (515 / 4) * 0.5 / 3;
          const SLOT_W = ((524 / 4) * 3 / 3) / 3;  // content slot width
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
          // Inline fallback geometry - images have 8px padding: top=540x566, bottom=540x134
          const cx = cauldronAsset.x;
          const cy = cauldronAsset.y;
          const cw = 540 / 3;
          const ch = 566 / 3;
          const GRID_OFFSET_X = 8/3 + (524 / 4) * 0.5 / 3;  // padding + content offset
          const GRID_OFFSET_Y = 8/3 + (515 / 4) * 0.5 / 3;
          const SLOT_W = ((524 / 4) * 3 / 3) / 3;  // content slot width
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
          // Inline fallback - images have 8px padding: top=540x566, bottom=540x134
          const cx = cauldronAsset.x;
          const cy = cauldronAsset.y;
          const cw = 540 / 3;
          const ch = 566 / 3;
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
          // Fallback to inline calculation - both parts 540px wide, no X offset
          return { ...a, x: newX, y: newY + 566 / 3 - 13 };
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

    // XP system - determine output quality based on attempts for this recipe
    const recipeId = result.recipeId;
    const attempts = (craftAttempts[recipeId] || 0) + 1;

    console.log('[CRAFT] recipeId:', recipeId, 'attempts:', attempts, 'activeQuestId:', activeQuestId, 'craftFailCount:', craftFailCount);

    // Update attempt counter
    setCraftAttempts(prev => ({
      ...prev,
      [recipeId]: attempts
    }));

    // Find the recipe to get quality-based outputs
    const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);

    console.log('[CRAFT] recipe:', recipe);

    // Determine output based on attempt count (XP system with probability)
    // 1st-2nd attempt: FAIL (output_bad - burnt pill)
    // 3rd+ attempt: SUCCESS (output_great1 - spirit_pill, z szansą na perfect)
    let finalOutput = result.output; // Default fallback

    if (recipe) {
      // Check if this is a pill recipe
      const isPillRecipe = recipe.output_perfect1 === 'spirit_pill_p' ||
                          recipe.output_great1 === 'spirit_pill';

      if (isPillRecipe) {
        if (attempts <= 2) {
          // First 2 attempts: FAIL - burnt pill
          finalOutput = recipe.output_bad || 'spirit_pill_b';
          toast(`❌ Burnt Pill... (attempt #${attempts})`);
          // Track fail for tutorial trigger
          setCraftFailCount(prev => prev + 1);
        } else {
          // 3rd+ attempt: SUCCESS - normal pill with chance for perfect
          if (attempts >= 4) {
            let perfectChance = 0;
            if (attempts >= 12) {
              perfectChance = 1;      // 100% at 12+ attempts
            } else {
              // Linear interpolation: 50% at 4, 75% at 8
              perfectChance = 0.5 + (attempts - 4) * (0.75 - 0.5) / (8 - 4);
              if (perfectChance > 1) perfectChance = 1;
            }

            const roll = Math.random();
            if (roll < perfectChance) {
              finalOutput = recipe.output_perfect1; // Perfect pill
              toast(`🌟 PERFECT Pill! (${(perfectChance * 100).toFixed(0)}% chance)`);
            } else {
              finalOutput = recipe.output_great1; // Normal pill
              toast(`✅ Spirit Pill crafted!`);
            }
          } else {
            // 3rd attempt: guaranteed normal pill
            finalOutput = recipe.output_great1 || 'spirit_pill';
            toast(`✅ Spirit Pill crafted!`);
          }
        }
      } else {
        // Other recipes - use fallback
        finalOutput = recipe.output_perfect1 || recipe.output_great1 || result.output;
      }
    }

    // Remove used cards and add product
    setCards(prev => {
      const filtered = prev.filter(c => !result.usedUids.includes(c.uid));
      filtered.push(mkCard(finalOutput, result.spawnX, result.spawnY));
      return filtered;
    });

    // Clear slots
    setCauldronSlots(Array(9).fill(null));
  };

  // Check if cauldron slots match ANY recipe - using CauldronLogic
  const canCraft = window.CauldronLogic?.canCraft(cauldronSlots, CRAFTING_RECIPES) || false;


  return (
    <div style={{ width: "100vw", height: "100vh", fontFamily: THEME.typography.fontFamily, display: "flex", flexDirection: "column", overflow: "hidden", background: THEME.colors.board }}>
      {/* Środek Gry */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Stół (z ładnymi radialnymi gradientami) */}
        <div ref={boardRef} style={{
          flex: 1, position: "relative",
          background: `
            radial-gradient(ellipse at 15% 25%, ${THEME.colors.boardHighlight}40 0%, transparent 40%),
            radial-gradient(ellipse at 78% 68%, #4a803060 0%, transparent 50%),
            radial-gradient(ellipse at 50% 5%, ${THEME.colors.boardAccent}40 0%, transparent 35%)
          `,
          overflow: "hidden"
        }} onMouseDown={(e) => { if (e.target === boardRef.current) { setDragging(null); setHovered(null); } }}>
          <div style={{ position: "absolute", inset: THEME.spacing.sm, border: `2px solid ${THEME.colors.accentBorder}22`, borderRadius: THEME.borderRadius.lg, pointerEvents: "none", background: THEME.colors.surfaceVariant }} />
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

          {/* Craft Button under cauldron - Material Design 3 style */}
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
                left: assets.find(a => a.id === "crafting_cauldron_top").x + (CARD_W * 1) / 2 - 50,
                top: assets.find(a => a.id === "crafting_cauldron_top").y + CARD_H * 1 - 10,
                height: 40,
                padding: "0 20px",
                fontSize: THEME.typography.sizes.lg,
                fontWeight: THEME.typography.weights.medium,
                // Black background for both enabled/disabled, opacity handles the difference
                background: "#000000",
                color: THEME.colors.text,
                border: "none",
                borderRadius: THEME.borderRadius.full,
                cursor: canCraft ? "pointer" : "default",
                boxShadow: THEME.shadows.sm,
                zIndex: THEME.zIndex.base + 90,
                letterSpacing: "0.1em",
                transition: THEME.transitions.slow,
                display: "flex",
                alignItems: "center",
                gap: 8,
                textTransform: "uppercase",
                opacity: canCraft ? 1 : 0.35
              }}
            >
              {/* Flame icon - SVG */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={THEME.colors.text}
                style={{ width: 18, height: 18 }}
              >
                <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C12 6.47 13.5.67 13.5.67zM8 14c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z"/>
              </svg>
              CRAFT
            </button>
          )}

          <div style={{ position: "absolute", bottom: THEME.spacing.sm, left: 0, right: 0, textAlign: "center", fontSize: THEME.typography.sizes.xs, color: THEME.colors.textMuted, pointerEvents: "none", fontStyle: "italic" }}>
            Drag cards onto cauldron to craft • Kup pakiety u góry
          </div>

          {/* Recipe dropdown over cauldron - centered, matches Map Selector style */}
          {!draggingCauldron && selectedRecipe && (
            <div
              onClick={(e) => { e.stopPropagation(); setSelectedRecipe(null); toast("Recipe view closed"); }}
              style={{
                position: "absolute",
                left: 0, right: 0, top: 0, bottom: 0,
                zIndex: THEME.zIndex.recipeOverlay,
                cursor: "default"
              }}
            />
          )}
          {!draggingCauldron && (() => {
            const cauldronAsset = assets.find(a => a.id === "crafting_cauldron_top");
            if (!cauldronAsset) return null;
            const cauldronWidth = 524 / 3;
            const cauldronCenterX = cauldronAsset.x + cauldronWidth / 2;
            const selectorWidth = cauldronWidth;
            const selectorLeft = cauldronCenterX - selectorWidth / 2;
            return (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  left: selectorLeft,
                  top: cauldronAsset.y - 65,
                  zIndex: THEME.zIndex.dropdown,
                  background: THEME.colors.dropdownBg,
                  padding: `10px ${THEME.spacing.md}`,
                  borderRadius: THEME.borderRadius.md,
                  border: `2px solid ${THEME.colors.accentBorder}`,
                  display: "flex",
                  alignItems: "center",
                  gap: THEME.spacing.sm,
                  justifyContent: "center"
                }}
              >
                <span style={{ color: THEME.colors.dropdownText, fontSize: THEME.typography.sizes.xs, fontWeight: THEME.typography.weights.bold, textTransform: "uppercase" }}>   &nbsp; &nbsp; &nbsp;Recipe:</span>
                <select
                  value={selectedRecipe || ""}
                  onChange={(e) => setSelectedRecipe(e.target.value || null)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: THEME.colors.surface,
                    color: THEME.colors.dropdownAccent,
                    border: `1px solid ${THEME.colors.accentBorder}`,
                    borderRadius: THEME.borderRadius.sm,
                    padding: "4px 8px",
                    fontSize: THEME.typography.sizes.sm,
                    fontWeight: THEME.typography.weights.semibold,
                    cursor: "pointer",
                    flexGrow: 1
                  }}
                >
                  <option value="">-- Any Recipe --</option>
                  {CRAFTING_RECIPES.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            );
          })()}
        </div>
      </div>
      <Toasts list={toasts} />
      <DialogManager
        activeQuestId={activeQuestId}
        onComplete={(questId) => {
          console.log('Quest completed:', questId);
          // Don't clear activeQuestId here - quest 2 will be activated by trigger
        }}
        onDialogComplete={(questId) => {
          console.log('Dialog sequence completed:', questId);
          if (questId === 'the_beginnings_are_hard_2') {
            setActiveQuestId(null); // All quests done
          }
        }}
        onActivateQuest={handleActivateQuest}
        onGivePerfectPill={() => {
          // Add perfect spirit pill to board near sifu
          const sifu = assets.find(a => a.id === 'sifu_master');
          const x = sifu ? sifu.x - 100 : 1100;
          const y = sifu ? sifu.y - 50 : 600;
          setCards(prev => [...prev, mkCard('spirit_pill_p', x, y)]);
          toast('🌟 Received: Perfect Spirit Pill!');
        }}
        assets={assets}
        cards={cards}
      />

      {/* Style Selector - Bottom Right (above Map Selector) */}
      {DEBUG_MAP_SELECTOR && (
        <div style={{ position: "fixed", bottom: THEME.spacing.lg + 80, right: 14, zIndex: THEME.zIndex.mapSelector, background: THEME.colors.dropdownBg, padding: `10px ${THEME.spacing.md}`, borderRadius: THEME.borderRadius.md, border: `2px solid ${THEME.colors.accentBorder}` }}>
          <div style={{ color: THEME.colors.dropdownText, fontSize: THEME.typography.sizes.xs, fontWeight: THEME.typography.weights.bold, marginBottom: 6, textTransform: "uppercase" }}>🎨 Style</div>
          <div style={{ display: "flex", gap: THEME.spacing.sm, alignItems: "center" }}>
            <select
              value={window.getCurrentStyle ? window.getCurrentStyle() : 'default'}
              onChange={(e) => window.setStyle(e.target.value)}
              style={{ background: THEME.colors.surface, color: THEME.colors.dropdownAccent, border: `1px solid ${THEME.colors.accentBorder}`, borderRadius: THEME.borderRadius.sm, padding: "4px 8px", fontSize: THEME.typography.sizes.sm, fontWeight: THEME.typography.weights.semibold, cursor: "pointer" }}
            >
              {window.getAvailableStyles ? window.getAvailableStyles().map(styleKey => (
                <option key={styleKey} value={styleKey}>{styleKey.charAt(0).toUpperCase() + styleKey.slice(1)}</option>
              )) : <option value="default">Default</option>}
            </select>
          </div>
        </div>
      )}

      {/* Map Selector - Bottom Right */}
      {DEBUG_MAP_SELECTOR && (
        <div style={{ position: "fixed", bottom: THEME.spacing.lg, right: 14, zIndex: THEME.zIndex.mapSelector, background: THEME.colors.dropdownBg, padding: `10px ${THEME.spacing.md}`, borderRadius: THEME.borderRadius.md, border: `2px solid ${THEME.colors.accentBorder}` }}>
          <div style={{ color: THEME.colors.dropdownText, fontSize: THEME.typography.sizes.xs, fontWeight: THEME.typography.weights.bold, marginBottom: 6, textTransform: "uppercase" }}>🗺️ Map Selector</div>
          <div style={{ display: "flex", gap: THEME.spacing.sm, alignItems: "center" }}>
            <select
              value={selectedMapId}
              onChange={(e) => loadMap(e.target.value)}
              style={{ background: THEME.colors.surface, color: THEME.colors.dropdownAccent, border: `1px solid ${THEME.colors.accentBorder}`, borderRadius: THEME.borderRadius.sm, padding: "4px 8px", fontSize: THEME.typography.sizes.sm, fontWeight: THEME.typography.weights.semibold, cursor: "pointer" }}
            >
              {Object.keys(MAPS).map(mapId => (
                <option key={mapId} value={mapId}>{MAPS[mapId]?.name || mapId}</option>
              ))}
            </select>
            <span style={{ color: "#888", fontSize: THEME.typography.sizes.xs }}>Loaded: {mapLoaded ? selectedMapId : 'none'}</span>
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
        let mapIds = ['maps_crafting']; // Default map - tutorial map
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

        // Load strings.csv and dialogs.json first
        try {
          const stringsRes = await fetch('strings.csv');
          if (stringsRes.ok) {
            const stringsText = await stringsRes.text();
            Papa.parse(stringsText, {
              header: true,
              skipEmptyLines: true,
              complete: (res) => {
                res.data.forEach(row => {
                  STRINGS[row.string_id] = row.text;
                });
                console.log("Loaded strings.csv:", Object.keys(STRINGS).length, "entries");
              }
            });
          }
        } catch (e) {
          console.log("No strings.csv, skipping localization");
        }

        try {
          const dialogsRes = await fetch('dialogs.json');
          if (dialogsRes.ok) {
            DIALOGS = await dialogsRes.json();
            console.log("Loaded dialogs.json:", DIALOGS.length, "dialog sequences");
          }
        } catch (e) {
          console.log("No dialogs.json, skipping dialogs");
        }

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
    <div style={{ color: '#ff4444', padding: THEME.spacing.xxl, background: THEME.colors.text, borderRadius: THEME.borderRadius.lg, fontFamily: THEME.typography.fontFamily }}>
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
