// special_assets/cauldron.jsx
// Modular crafting logic for the alchemy cauldron special asset
// Reference: crafting.md - Cauldron Crafting System

// Make CauldronLogic available globally for browser-based React
window.CauldronLogic = {
  // Component name to render (for future extensibility)
  component: 'CauldronTop',

  // Active slots in the 3x3 grid (indices: 0-8)
  // Layout: 0 1 2
  //         3 4 5
  //         6 7 8
  // Active slots (cross pattern): 1 (top), 3 (left), 4 (center), 5 (right), 7 (bottom)
  slots: [1, 3, 4, 5, 7],

  // Slot geometry - matches crafting.md exactly
  geometry: {
    CAULDRON_TOP_W: 524 / 3,   // ~174.67px
    CAULDRON_TOP_H: 515 / 3,   // ~171.67px
    GRID_OFFSET_X: (524 / 4) * 0.5 / 3,  // ~21.83px
    GRID_OFFSET_Y: (515 / 4) * 0.5 / 3,  // ~21.46px
    GRID_W: (524 / 4) * 3 / 3,           // ~131px
    GRID_H: (515 / 4) * 3 / 3,           // ~128.75px
    SLOT_W: ((524 / 4) * 3 / 3) / 3,     // ~43.67px
    SLOT_H: ((515 / 4) * 3 / 3) / 3,     // ~42.92px
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
    const activeSlots = this.slots;

    // Check if all active slots are filled
    const allFilled = activeSlots.every(i => cauldronSlots[i] !== null);
    if (!allFilled) return null;

    // Find matching recipe
    const matchingRecipe = craftingRecipes.find(recipe => {
      for (let i of activeSlots) {
        const inputKey = `input${Math.floor(i/3)}${i%3}`;
        const requiredId = recipe[inputKey];
        if (requiredId && (!cauldronSlots[i] || cauldronSlots[i].id !== requiredId)) {
          return false;
        }
      }
      return true;
    });

    return matchingRecipe;
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

    // Get output
    const output = matchingRecipe.output_perfect1;
    if (!output) {
      return { success: false, error: "Invalid recipe output" };
    }

    // Calculate spawn position
    const spawnX = cauldronAsset ? cauldronAsset.x + 150 : 400;
    const spawnY = cauldronAsset ? cauldronAsset.y + 200 : 300;

    // Collect UIDs of used cards
    const usedUids = [];
    cauldronSlots.forEach(card => {
      if (card) usedUids.push(card.uid);
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
    const bottomOffsetX = (524 - 420) / 2 / 3;
    const bottomOffsetY = 515 / 3 - 10;

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
