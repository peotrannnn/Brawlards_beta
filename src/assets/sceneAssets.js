// src/assets/sceneAssets.js
// Collection of scene factories.  Both Inspector and SimulationTest import
// from here so adding a new scene automatically updates both dropdowns.

import { createScene1 } from "./scenes/scene1.js"

export const sceneAssets = [
  {
    name: "Pilot Room",
    description: "A game about balls... and sticks!",
    factory: createScene1
  }
]
