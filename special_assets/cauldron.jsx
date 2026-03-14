// special_assets/cauldron.jsx
// Modular crafting logic for the alchemy cauldron special asset
// Reference: crafting.md - Cauldron Crafting System

// Make CauldronLogic available globally for browser-based React
window.CauldronLogic = {
  // Component name to render (for future extensibility)
  component: 'CauldronTop',

  // Active slots in the 3x3 grid (indices: 0-8)
  // Layout matches numpad/phone keypad visual layout:
  // Visual: 1 2 3    Code: 0 1 2
  //         4 5 6          3 4 5
  //         7 8 9          6 7 8
  // All slots are active for crafting - matches recipe CSV columns input00-input22
  slots: [0, 1, 2, 3, 4, 5, 6, 7, 8],

  // Slot geometry - images have 8px padding for outline, content is 524x515 (top) and 420x103 (bottom)
  // Image dimensions: top=540x566, bottom=540x134 (includes padding and outline)
  geometry: {
    CAULDRON_TOP_W: 540 / 3,   // ~180px (full image width scaled)
    CAULDRON_TOP_H: 566 / 3,   // ~188.67px (full image height scaled)
    // Grid offset = padding + original grid offset from content edge
    // Padding: (540-524)/2 = 8px, scaled: 8/3 = 2.67px
    GRID_OFFSET_X: 8/3 + (524 / 4) * 0.5 / 3,  // ~24.50px (padding + content offset)
    GRID_OFFSET_Y: 8/3 + (515 / 4) * 0.5 / 3,  // ~24.12px (padding + content offset)
    GRID_W: (524 / 4) * 3 / 3,                 // ~131px (content grid width)
    GRID_H: (515 / 4) * 3 / 3,                 // ~128.75px (content grid height)
    SLOT_W: ((524 / 4) * 3 / 3) / 3,           // ~43.67px (content slot width)
    SLOT_H: ((515 / 4) * 3 / 3) / 3,           // ~42.92px (content slot height)
  },

  // Get all 9 slot positions for rendering (relative to cauldron container)
  getAllSlotPositions: function() {
    const { GRID_OFFSET_X, GRID_OFFSET_Y, SLOT_W, SLOT_H } = this.geometry;

    const positions = [];
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        positions.push({
          index: y * 3 + x,
          x: GRID_OFFSET_X + x * SLOT_W,
          y: GRID_OFFSET_Y + y * SLOT_H,
          width: SLOT_W,
          height: SLOT_H,
          isActive: this.slots.includes(y * 3 + x)
        });
      }
    }
    return positions;
  },

  // Get slot index from card position relative to cauldron
  getSlotIndexFromPosition: function(cardX, cardY, cauldronX, cauldronY) {
    const { GRID_OFFSET_X, GRID_OFFSET_Y, SLOT_W, SLOT_H } = this.geometry;

    const relativeX = cardX - cauldronX - GRID_OFFSET_X;
    const relativeY = cardY - cauldronY - GRID_OFFSET_Y;
    const slotX = Math.floor(relativeX / SLOT_W);
    const slotY = Math.floor(relativeY / SLOT_H);
    return slotY * 3 + slotX;
  },

  // Check if position is within cauldron bounds
  isWithinCauldron: function(x, y, cauldronX, cauldronY) {
    const { CAULDRON_TOP_W, CAULDRON_TOP_H } = this.geometry;
    return x >= cauldronX && x <= cauldronX + CAULDRON_TOP_W &&
           y >= cauldronY && y <= cauldronY + CAULDRON_TOP_H;
  },

  // Check if slots match a recipe
  checkRecipe: function(cauldronSlots, craftingRecipes) {
    const activeSlots = this.slots; // [1, 3, 4, 5, 7]

    // Find matching recipe
    const matchingRecipe = craftingRecipes.find(recipe => {
      let recipeMatch = true;

      for (let i of activeSlots) {
        const inputKey = `input${Math.floor(i/3)}${i%3}`;
        const requiredId = recipe[inputKey];
        const actualId = cauldronSlots[i]?.id || null;

        // If recipe requires an item in this slot
        if (requiredId && requiredId !== '') {
          if (actualId !== requiredId) {
            recipeMatch = false;
            break;
          }
        }
      }

      return recipeMatch;
    });

    return matchingRecipe || null;
  },

  // Check if crafting is possible
  canCraft: function(cauldronSlots, craftingRecipes) {
    return this.checkRecipe(cauldronSlots, craftingRecipes) !== null;
  },

  // Execute craft - returns craft result object or null
  craft: function(cauldronSlots, craftingRecipes, cauldronAsset) {
    const matchingRecipe = this.checkRecipe(cauldronSlots, craftingRecipes);

    if (!matchingRecipe) {
      return { success: false, error: "No matching recipe" };
    }

    // Get output - try output_perfect1 first, fallback to output_perfect2
    const output = matchingRecipe.output_perfect1 || matchingRecipe.output_perfect2;
    if (!output) {
      return { success: false, error: "Invalid recipe output" };
    }

    // Calculate spawn position
    const spawnX = cauldronAsset ? cauldronAsset.x + 150 : 400;
    const spawnY = cauldronAsset ? cauldronAsset.y + 200 : 300;

    // Collect UIDs of ALL cards in slots (not just active slots)
    const usedUids = [];
    cauldronSlots.forEach(card => {
      if (card) {
        usedUids.push(card.uid);
      }
    });

    return {
      success: true,
      output: output,
      spawnX: spawnX,
      spawnY: spawnY,
      usedUids: usedUids
    };
  },

  // Handle slot click - return card to board
  onSlotClick: function(slotIndex, cauldronSlots, cauldronAsset) {
    const card = cauldronSlots[slotIndex];
    if (!card) return null;

    // Calculate spawn position away from cauldron
    const cauldronX = cauldronAsset ? cauldronAsset.x : 0;
    const cauldronY = cauldronAsset ? cauldronAsset.y : 200;
    const spawnX = cauldronX - 200;
    const spawnY = cauldronY + 100;

    return {
      card: { ...card, x: spawnX, y: spawnY },
      slotIndex: slotIndex
    };
  },

  // Handle cauldron drag - returns new positions for both cauldron parts
  getCauldronDragPositions: function(newX, newY) {
    // Both parts are 540px wide, so no X offset needed (centered)
    // Y offset: top height (566/3=188.67) minus overlap (~13px) = 175.67
    const bottomOffsetX = 0;  // Both parts are 540px wide - perfectly centered
    const bottomOffsetY = 566 / 3 - 13;  // ~175.67 - bottom attaches below top with small overlap

    return {
      top: { x: newX, y: newY },
      bottom: { x: newX + bottomOffsetX, y: newY + bottomOffsetY }
    };
  },

  // Calculate drag offset when starting to drag cauldron
  getCauldronDragOffset: function(mouseX, mouseY, cauldronX, cauldronY) {
    return {
      x: mouseX - cauldronX,
      y: mouseY - cauldronY
    };
  },

  // Check if cauldron slots are empty (allow dragging entire cauldron)
  canDragCauldron: function(cauldronSlots) {
    return cauldronSlots.every(s => s === null);
  }
};

console.log('CauldronLogic loaded successfully');
console.log('CauldronLogic:', window.CauldronLogic);
