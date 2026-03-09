// UWAGA: Nie używamy 'import ... from "react"', bo to psuje kompilację w przeglądarce!
const { useState, useEffect, useRef, useCallback } = window.React;

// ─── ZMIENNE GLOBALNE NA DANE Z PLIKÓW ───────────────────────────────────────
let CARD_DEFS = {};
let PACK_DEFS = {};
let RECIPES = [];
let QUESTS = [];

const TYPE_COLORS = {
  unit: "#4a90d9", resource: "#5aaa60", food: "#9b59b6",
  material: "#d4801a", building: "#c0392b", currency: "#d4ac0d",
  weapon: "#7f8c8d", enemy: "#922b21",
};

const CARD_W = 350/2; 
const CARD_H = 460/2;


let _uid = 1;
const mkCard = (id, x, y) => ({ uid: _uid++, id, x, y });

function findRecipe(a, b) {
  return RECIPES.find(r => (r.a === a && r.b === b) || (r.a === b && r.b === a));
}

// ─── KARTA (COMPONET) ────────────────────────────────────────────────────────
function GameCard({ card, isDragging, craftPct, craftRemaining, onMouseDown }) {
  const def = CARD_DEFS[card.id];
  if (!def) return null;

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

// ─── GŁÓWNA GRA ──────────────────────────────────────────────────────────────
function Stacklands() {
  const [cards, setCards] = useState(() => [
    mkCard("villager", 100, 110),

    mkCard("villager", 280, 110),
    mkCard("berry_bush", 460, 110),
    mkCard("tree", 640, 100),
    mkCard("rock", 820, 120),
    mkCard("wolf", 120, 110),

  ]);
  const [inventory, setInventory] = useState({});
  const [gold, setGold] = useState(15);
  const [food, setFood] = useState(12);
  const [moon] = useState(5);
  const [draggingUid, setDragging] = useState(null);
  const [craftMap, setCraftMap] = useState({});
  const [completedQuests, setDone] = useState([]);
  const [unlockedPacks, setUnlocked] = useState(["humble_beginnings"]);
  const [toasts, setToasts] = useState([]);
  const [hovered, setHovered] = useState(null);

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
    setCards(prev => {
      const idx = prev.findIndex(c => c.uid === card.uid);
      if (idx === -1) return prev;
      return [...prev.slice(0, idx), ...prev.slice(idx + 1), prev[idx]];
    });
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      const drag = dragRef.current; if (!drag) return;
      const br = boardRef.current?.getBoundingClientRect(); if (!br) return;
      const nx = Math.max(0, Math.min(br.width - CARD_W, e.clientX - br.left - drag.ox));
      const ny = Math.max(0, Math.min(br.height - CARD_H, e.clientY - br.top - drag.oy));
      setCards(prev => prev.map(c => c.uid === drag.uid ? { ...c, x: nx, y: ny } : c));
    };
    const onUp = () => {
      const drag = dragRef.current; if (!drag) return;
      const movedUid = drag.uid; dragRef.current = null; setDragging(null);
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
  }, []);

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

  // Logika Questów
  useEffect(() => {
    QUESTS.forEach(q => {
      if (completedQuests.includes(q.id)) return;
      let done = false;
      if (q.condition) {
        if (q.condition.type === "card_count_on_board") {
          done = cards.filter(c => c.id === q.condition.card_id).length >= q.condition.count;
        } else if (q.condition.type === "proximity") {
          done = cards.some(ca => ca.id === q.condition.target_a && cards.some(cb => cb.id === q.condition.target_b && ca.uid !== cb.uid && Math.sqrt((ca.x - cb.x) ** 2 + (ca.y - cb.y) ** 2) < (CARD_W * 1.2)));
        }
      } else if (q.requirements) {
        done = Object.entries(q.requirements).every(([k, v]) => {
          if (k === "villager_count") return cards.filter(c => c.id === "villager").length >= v;
          if (k === "completed_quests") return completedQuests.length >= v;
          return (inventory[k] || 0) >= v;
        });
      }
      if (done) {
        setDone(c => [...new Set([...c, q.id])]);
        toast(`🎯 Quest: "${q.title_pl || q.title}" ukończony!`);
        if (q.unlock_pack) { setUnlocked(u => [...new Set([...u, q.unlock_pack])]); toast(`📦 Odblokowano nowy pakiet!`); }
        if (q.rewards?.gold) setGold(g => g + q.rewards.gold);
      }
    });
  }, [cards, inventory, completedQuests, toast]);

  const buyPack = (packId) => {
    const pack = PACK_DEFS[packId]; if (!pack) return;
    if (!unlockedPacks.includes(packId)) { toast("🔒 Pakiet zablokowany!"); return; }
    if (gold < pack.cost) { toast("❌ Za mało złota!"); return; }
    if (!pack.cards_pool?.length) { toast("🔮 Wkrótce!"); return; }

    setGold(g => g - pack.cost);
    const pool = pack.cards_pool;
    const drawn = pool[Math.floor(Math.random() * pool.length)];
    setCards(prev => [...prev, mkCard(drawn, 80 + Math.random() * 500, 80 + Math.random() * 300)]);
    toast(`📦 Wylosowano nową kartę!`);
  };

  const allPackIds = Object.keys(PACK_DEFS);
  const totalSlots = Math.max(7, allPackIds.length + 4);
  const packSlots = [...allPackIds, ...Array(totalSlots - allPackIds.length).fill(null)];

  return (
    <div style={{ width: "100vw", height: "100vh", fontFamily: "'Nunito','Segoe UI',sans-serif", display: "flex", flexDirection: "column", overflow: "hidden", background: "#5a9040" }}>
      {/* Pasek Górny */}
      <div style={{ height: 88, background: "rgba(0,0,0,0.40)", display: "flex", alignItems: "center", padding: "0 12px", gap: 7, flexShrink: 0, borderBottom: "2px solid rgba(0,0,0,0.3)" }}>
        <div style={{ width: 62, height: 68, background: "rgba(0,0,0,0.45)", border: "2px solid rgba(255,255,255,0.12)", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 800, cursor: "pointer", gap: 2, flexShrink: 0 }}><span style={{ fontSize: 22 }}>💰</span><span>Sell</span></div>
        <div style={{ width: 2, height: 54, background: "rgba(255,255,255,0.12)", margin: "0 3px", flexShrink: 0 }} />
        {packSlots.map((packId, i) => {
          const pack = packId ? PACK_DEFS[packId] : null;
          const isUnlocked = packId && unlockedPacks.includes(packId);
          const canAfford = pack && gold >= pack.cost;
          const showReal = pack && isUnlocked;
          return (
            <div key={i} onClick={() => packId && buyPack(packId)} style={{ width: 72, height: 68, background: showReal ? canAfford ? "rgba(55,38,12,0.92)" : "rgba(30,18,4,0.8)" : "rgba(0,0,0,0.45)", border: `2px solid ${showReal ? (canAfford ? "#c8a86b" : "#6a4418") : "rgba(255,255,255,0.08)"}`, borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: showReal ? "pointer" : "default", opacity: showReal ? 1 : 0.4, padding: "4px 3px", gap: 2, transition: "all 0.15s", flexShrink: 0 }}>
              {showReal ? (<><span style={{ fontSize: 9, color: "#f0d080", fontWeight: 800, textAlign: "center", lineHeight: 1.3, whiteSpace: "pre-line" }}>{pack.name.replace(" ", "\n")}</span><span style={{ fontSize: 11, color: canAfford ? "#ffd060" : "#a06030", fontWeight: 700 }}>🪙{pack.cost}</span></>) : <span style={{ fontSize: 20, color: "rgba(255,255,255,0.2)" }}>???</span>}
            </div>
          );
        })}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <div style={{ background: "rgba(0,0,0,0.4)", border: "2px solid rgba(255,255,255,0.15)", borderRadius: 9, padding: "6px 14px", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", gap: 12, alignItems: "center" }}><span>🪙 {gold}</span><span style={{ opacity: 0.3 }}>|</span><span>❤ {food}/20</span></div>
          <div style={{ background: "rgba(0,0,0,0.4)", border: "2px solid rgba(255,255,255,0.15)", borderRadius: 9, padding: "6px 14px", color: "#f0d080", fontSize: 13, fontWeight: 700 }}>🌙 Moon {moon}</div>
        </div>
      </div>

      {/* Środek Gry */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Lewy Panel Quests */}
        <div style={{ width: 165, background: "rgba(248,242,220,0.97)", borderRight: "2px solid #c8a86b", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ display: "flex", borderBottom: "2px solid #c8a86b" }}>
            {["Quests", "Ideas"].map((tab, i) => (
              <div key={tab} style={{ flex: 1, padding: "8px 0", textAlign: "center", fontSize: 11, fontWeight: 800, color: i === 0 ? "#3a2808" : "#a08050", background: i === 0 ? "rgba(200,168,107,0.22)" : "transparent", borderRight: i === 0 ? "1px solid #c8a86b" : "none" }}>{tab}</div>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
            {QUESTS.filter(q => !q.is_main_quest).sort((a, b) => a.order - b.order).map(q => {
              const done = completedQuests.includes(q.id);
              return (
                <div key={q.id} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 8, fontSize: 11, color: done ? "#5a8828" : "#3a2808", fontWeight: 700 }}>
                  <span style={{ flexShrink: 0, marginTop: 1, fontSize: 13 }}>{done ? "✓" : "☐"}</span><span style={{ lineHeight: 1.35 }}>{q.title_pl || q.title}</span>
                </div>
              );
            })}
          </div>
          {hovered && CARD_DEFS[hovered] && (
            <div style={{ borderTop: "2px solid #c8a86b", padding: "8px 10px", background: "rgba(200,168,107,0.18)", flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#3a2808", textTransform: "uppercase" }}>{CARD_DEFS[hovered].name_pl || CARD_DEFS[hovered].name}</div>
              <div style={{ fontSize: 10, color: "#7a5820", marginTop: 2, lineHeight: 1.4 }}>{CARD_DEFS[hovered].description}</div>
            </div>
          )}
        </div>

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
          {cards.map(card => (
            <GameCard key={card.uid} card={card} isDragging={draggingUid === card.uid} craftPct={craftMap[card.uid]?.pct} craftRemaining={craftMap[card.uid]?.remaining} onMouseDown={(e) => handleMouseDown(e, card)} />
          ))}
          <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.38)", pointerEvents: "none", fontStyle: "italic" }}>
            Przeciągnij karty na siebie, by craftować • Kup pakiety u góry
          </div>
        </div>
      </div>
      <RecipeBook />
      <Toasts list={toasts} />
    </div>
  );
}

// ─── KONTROLER ŁADOWANIA PLIKÓW ──────────────────────────────────────────────
function GameWrapper() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAllData() {
      try {
        const [questsRes, assetsRes, recipesRes] = await Promise.all([
          fetch('quests.json'),
          fetch('assets.yaml'),
          fetch('recipes.csv')
        ]);

        if (!questsRes.ok) throw new Error("Brak pliku quests.json");
        if (!assetsRes.ok) throw new Error("Brak pliku assets.yaml");
        if (!recipesRes.ok) throw new Error("Brak pliku recipes.csv");

        QUESTS = await questsRes.json();
        
        const yamlText = await assetsRes.text();
        const assetsObj = jsyaml.load(yamlText);
        if (assetsObj.cards) assetsObj.cards.forEach(c => { CARD_DEFS[c.id] = c; });
        if (assetsObj.packs) assetsObj.packs.forEach(p => { PACK_DEFS[p.id] = p; });

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
