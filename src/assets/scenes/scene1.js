import * as THREE from 'three'
import { createSection1 } from "./sections/section1_1.js"
import { createSection2 } from "./sections/section1_2.js"
import { createSection3 } from "./sections/section1_3.js"
import { createSection4 } from "./sections/section1_4.js"

export function createScene1(lightingOverrides = {}) {
  const root = new THREE.Group()
  root.name = "Scene 1 - Pilot Room"

  const section1Group = new THREE.Group()
  section1Group.name = 'Section1 Root'
  const section2Group = new THREE.Group()
  section2Group.name = 'Section2 Root'
  const section3Group = new THREE.Group()
  section3Group.name = 'Section3 Root'
  const section4Group = new THREE.Group()
  section4Group.name = 'Section4 Root'

  root.add(section1Group)
  root.add(section2Group)
  root.add(section3Group)
  root.add(section4Group)

  root.userData.sectionGroups = {
    section1: section1Group,
    section2: section2Group,
    section3: section3Group,
    section4: section4Group
  }

  // Add Section 1 (Phòng chính)
  createSection1(section1Group, lightingOverrides)

  // Section 1 initializes shared scene metadata; propagate to root so core systems
  // (physics bootstrap, lighting hooks) continue to read from scene root.
  const sharedPhysics = section1Group.userData?.physics || null
  if (sharedPhysics) {
    root.userData.physics = sharedPhysics
  }

  if (section1Group.userData?.lightingConfig) {
    root.userData.lightingConfig = section1Group.userData.lightingConfig
  }
  if (typeof section1Group.userData?.applyLighting === 'function') {
    root.userData.applyLighting = section1Group.userData.applyLighting
  }
  if (typeof section1Group.userData?.updateLighting === 'function') {
    root.userData.updateLighting = section1Group.userData.updateLighting
  }
  if (section1Group.userData?.tileInfo) {
    root.userData.tileInfo = section1Group.userData.tileInfo
  }

  // TODO: Có thể thêm Section 3,... ở đây trong tương lai
  // Temporarily expose root physics so section builders can append shapes.
  section2Group.userData.physics = root.userData.physics
  createSection2(section2Group)

  section3Group.userData.physics = root.userData.physics
  createSection3(section3Group)

  // Propagate section3 runtime systems to root so Scene1Manager can find them.
  if (section3Group.userData?.section3GrassLod) {
    root.userData.section3GrassLod = section3Group.userData.section3GrassLod
  }

  section4Group.userData.physics = root.userData.physics
  createSection4(section4Group)

  // IMPORTANT: keep physics metadata only on scene root. If section groups also keep
  // userData.physics, SimulationTest will build duplicate/static bodies from both root
  // and section groups, causing hitbox-mesh drift and overlap.
  delete section1Group.userData.physics
  delete section2Group.userData.physics
  delete section3Group.userData.physics
  delete section4Group.userData.physics

  return root
}
