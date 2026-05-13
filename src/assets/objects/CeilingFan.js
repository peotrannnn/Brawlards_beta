import * as THREE from 'three'

const CEILING_FAN_SCALE = 3

const CEILING_FAN_CONFIG = {
  canopyHeight: 0.28 * CEILING_FAN_SCALE,
  canopyTopRadius: 0.24 * CEILING_FAN_SCALE,
  canopyBottomRadius: 0.09 * CEILING_FAN_SCALE,
  rodRadius: 0.045 * CEILING_FAN_SCALE,
  rodLength: 0.92 * CEILING_FAN_SCALE,
  hubHeight: 0.16 * CEILING_FAN_SCALE,
  hubRadius: 0.085 * CEILING_FAN_SCALE,
  plateHeight: 0.06 * CEILING_FAN_SCALE,
  plateRadius: 0.32 * CEILING_FAN_SCALE,
  capHeight: 0.1 * CEILING_FAN_SCALE,
  capRadius: 0.11 * CEILING_FAN_SCALE,
  capTopLift: 0.025 * CEILING_FAN_SCALE,
  bladeLength: 0.94 * CEILING_FAN_SCALE,
  bladeWidth: 0.22 * CEILING_FAN_SCALE,
  bladeThickness: 0.03 * CEILING_FAN_SCALE,
  bladeCenterOffset: 0.6 * CEILING_FAN_SCALE,
  metalColor: '#c8d2db',
  metalDarkColor: '#677181',
  bladeColor: '#aeb8c5',
  accentColor: '#eef5ff'
}

const CEILING_FAN_LAYOUT = {
  canopyCenterY: -(CEILING_FAN_CONFIG.canopyHeight * 0.5),
  rodCenterY: -(CEILING_FAN_CONFIG.canopyHeight + (CEILING_FAN_CONFIG.rodLength * 0.5)),
  hubCenterY: -(CEILING_FAN_CONFIG.canopyHeight + CEILING_FAN_CONFIG.rodLength + (CEILING_FAN_CONFIG.hubHeight * 0.5)),
  plateCenterY: -(CEILING_FAN_CONFIG.canopyHeight + CEILING_FAN_CONFIG.rodLength + CEILING_FAN_CONFIG.hubHeight + (CEILING_FAN_CONFIG.plateHeight * 0.5)),
  capCenterY: -(CEILING_FAN_CONFIG.canopyHeight + CEILING_FAN_CONFIG.rodLength + CEILING_FAN_CONFIG.hubHeight + (CEILING_FAN_CONFIG.capHeight * 0.5) - CEILING_FAN_CONFIG.capTopLift)
}

const ceilingFanRotorPhysicsDef = {
  type: 'dynamic',
  mass: 18,
  material: 'table',
  fixedRotation: true,
  linearDamping: 0.04,
  angularDamping: 1,
  shapes: [
    {
      type: 'box',
      role: 'rotorCore',
      size: [CEILING_FAN_CONFIG.plateRadius * 1.2, CEILING_FAN_CONFIG.capHeight + CEILING_FAN_CONFIG.plateHeight, CEILING_FAN_CONFIG.plateRadius * 1.2],
      offset: [0, (CEILING_FAN_LAYOUT.plateCenterY + CEILING_FAN_LAYOUT.capCenterY) * 0.5, 0]
    },
    {
      type: 'box',
      role: 'bladeXPositive',
      size: [CEILING_FAN_CONFIG.bladeLength, CEILING_FAN_CONFIG.bladeThickness, CEILING_FAN_CONFIG.bladeWidth],
      offset: [CEILING_FAN_CONFIG.bladeCenterOffset, CEILING_FAN_LAYOUT.plateCenterY, 0]
    },
    {
      type: 'box',
      role: 'bladeXNegative',
      size: [CEILING_FAN_CONFIG.bladeLength, CEILING_FAN_CONFIG.bladeThickness, CEILING_FAN_CONFIG.bladeWidth],
      offset: [-CEILING_FAN_CONFIG.bladeCenterOffset, CEILING_FAN_LAYOUT.plateCenterY, 0]
    },
    {
      type: 'box',
      role: 'bladeZPositive',
      size: [CEILING_FAN_CONFIG.bladeWidth, CEILING_FAN_CONFIG.bladeThickness, CEILING_FAN_CONFIG.bladeLength],
      offset: [0, CEILING_FAN_LAYOUT.plateCenterY, CEILING_FAN_CONFIG.bladeCenterOffset]
    },
    {
      type: 'box',
      role: 'bladeZNegative',
      size: [CEILING_FAN_CONFIG.bladeWidth, CEILING_FAN_CONFIG.bladeThickness, CEILING_FAN_CONFIG.bladeLength],
      offset: [0, CEILING_FAN_LAYOUT.plateCenterY, -CEILING_FAN_CONFIG.bladeCenterOffset]
    }
  ]
}

const ceilingFanPhysicsDef = {
  type: 'static',
  material: 'table',
  shapes: [
    {
      type: 'cylinder',
      role: 'canopy',
      radiusTop: CEILING_FAN_CONFIG.canopyTopRadius,
      radiusBottom: CEILING_FAN_CONFIG.canopyBottomRadius,
      height: CEILING_FAN_CONFIG.canopyHeight,
      length: CEILING_FAN_CONFIG.canopyHeight,
      offset: [0, CEILING_FAN_LAYOUT.canopyCenterY, 0]
    },
    {
      type: 'cylinder',
      role: 'rod',
      radiusTop: CEILING_FAN_CONFIG.rodRadius,
      radiusBottom: CEILING_FAN_CONFIG.rodRadius,
      height: CEILING_FAN_CONFIG.rodLength,
      length: CEILING_FAN_CONFIG.rodLength,
      offset: [0, CEILING_FAN_LAYOUT.rodCenterY, 0]
    },
    {
      type: 'cylinder',
      role: 'hub',
      radiusTop: CEILING_FAN_CONFIG.hubRadius,
      radiusBottom: CEILING_FAN_CONFIG.hubRadius,
      height: CEILING_FAN_CONFIG.hubHeight,
      length: CEILING_FAN_CONFIG.hubHeight,
      offset: [0, CEILING_FAN_LAYOUT.hubCenterY, 0]
    }
  ]
}

function setShadowProps(object) {
  object.traverse((child) => {
    if (!child.isMesh) return
    child.castShadow = true
    child.receiveShadow = true
  })
}

function createBladeMaterial() {
  return new THREE.MeshStandardMaterial({
    color: CEILING_FAN_CONFIG.bladeColor,
    emissive: '#23313d',
    emissiveIntensity: 0.08,
    roughness: 0.44,
    metalness: 0.42
  })
}

function createMetalMaterial(color, emissiveIntensity = 0.06) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: '#14202b',
    emissiveIntensity,
    roughness: 0.3,
    metalness: 0.78
  })
}

function collectRotorKillMeshes(rotorAssembly) {
  const killMeshes = []
  rotorAssembly.traverse((child) => {
    if (child.isMesh && child.userData?.isFanKillMesh) {
      killMeshes.push(child)
    }
  })
  return killMeshes
}

function createRotorAssembly(darkMetalMaterial, accentMaterial, bladeMaterial) {
  const rotorAssembly = new THREE.Group()
  rotorAssembly.name = 'Ceiling Fan Rotor'

  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(
      CEILING_FAN_CONFIG.plateRadius,
      CEILING_FAN_CONFIG.plateRadius,
      CEILING_FAN_CONFIG.plateHeight,
      32
    ),
    darkMetalMaterial
  )
  plate.name = 'Ceiling Fan Plate'
  plate.position.y = CEILING_FAN_LAYOUT.plateCenterY
  plate.userData.isFanKillMesh = true
  rotorAssembly.add(plate)

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(
      CEILING_FAN_CONFIG.capRadius,
      CEILING_FAN_CONFIG.capRadius,
      CEILING_FAN_CONFIG.capHeight,
      24
    ),
    accentMaterial
  )
  cap.name = 'Ceiling Fan Cap'
  cap.position.y = CEILING_FAN_LAYOUT.capCenterY
  cap.userData.isFanKillMesh = true
  rotorAssembly.add(cap)

  const bladeGeometry = new THREE.BoxGeometry(
    CEILING_FAN_CONFIG.bladeLength,
    CEILING_FAN_CONFIG.bladeThickness,
    CEILING_FAN_CONFIG.bladeWidth
  )

  const bladePositions = [
    { name: 'Ceiling Fan Blade X+', x: CEILING_FAN_CONFIG.bladeCenterOffset, z: 0, rotationY: 0 },
    { name: 'Ceiling Fan Blade X-', x: -CEILING_FAN_CONFIG.bladeCenterOffset, z: 0, rotationY: 0 },
    { name: 'Ceiling Fan Blade Z+', x: 0, z: CEILING_FAN_CONFIG.bladeCenterOffset, rotationY: Math.PI * 0.5 },
    { name: 'Ceiling Fan Blade Z-', x: 0, z: -CEILING_FAN_CONFIG.bladeCenterOffset, rotationY: Math.PI * 0.5 }
  ]

  bladePositions.forEach(({ name, x, z, rotationY }) => {
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial)
    blade.name = name
    blade.position.set(x, CEILING_FAN_LAYOUT.plateCenterY, z)
    blade.rotation.y = rotationY
    blade.userData.isFanKillMesh = true
    rotorAssembly.add(blade)
  })

  rotorAssembly.updateMatrixWorld(true)
  const rotorBounds = new THREE.Box3().setFromObject(rotorAssembly)
  rotorAssembly.userData.rotorKillMeshes = collectRotorKillMeshes(rotorAssembly)
  rotorAssembly.userData.rotorLocalBounds = {
    minY: rotorBounds.min.y,
    maxY: rotorBounds.max.y
  }

  return rotorAssembly
}

function createCeilingFan() {
  const root = new THREE.Group()
  root.name = 'Ceiling Fan'
  root.userData.physics = ceilingFanPhysicsDef
  root.userData.inspectorCenterMode = 'physics'

  const metalMaterial = createMetalMaterial(CEILING_FAN_CONFIG.metalColor)
  const darkMetalMaterial = createMetalMaterial(CEILING_FAN_CONFIG.metalDarkColor, 0.04)
  const accentMaterial = createMetalMaterial(CEILING_FAN_CONFIG.accentColor, 0.1)
  const bladeMaterial = createBladeMaterial()

  const fixedAssembly = new THREE.Group()
  fixedAssembly.name = 'Ceiling Fan Fixed Assembly'
  root.add(fixedAssembly)

  const canopy = new THREE.Mesh(
    new THREE.CylinderGeometry(
      CEILING_FAN_CONFIG.canopyTopRadius,
      CEILING_FAN_CONFIG.canopyBottomRadius,
      CEILING_FAN_CONFIG.canopyHeight,
      24
    ),
    metalMaterial
  )
  canopy.name = 'Ceiling Fan Canopy'
  canopy.position.y = CEILING_FAN_LAYOUT.canopyCenterY
  fixedAssembly.add(canopy)

  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(
      CEILING_FAN_CONFIG.rodRadius,
      CEILING_FAN_CONFIG.rodRadius,
      CEILING_FAN_CONFIG.rodLength,
      18
    ),
    darkMetalMaterial
  )
  rod.name = 'Ceiling Fan Rod'
  rod.position.y = CEILING_FAN_LAYOUT.rodCenterY
  fixedAssembly.add(rod)

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(
      CEILING_FAN_CONFIG.hubRadius,
      CEILING_FAN_CONFIG.hubRadius,
      CEILING_FAN_CONFIG.hubHeight,
      20
    ),
    metalMaterial
  )
  hub.name = 'Ceiling Fan Hub'
  hub.position.y = CEILING_FAN_LAYOUT.hubCenterY
  fixedAssembly.add(hub)

  const rotorAssembly = createRotorAssembly(darkMetalMaterial, accentMaterial, bladeMaterial)
  root.add(rotorAssembly)

  setShadowProps(root)
  root.userData.fixedAssembly = fixedAssembly
  root.userData.rotorAssembly = rotorAssembly
  root.userData.rotorPhysics = ceilingFanRotorPhysicsDef
  root.userData.rotorLocalBounds = rotorAssembly.userData.rotorLocalBounds
  root.userData.rotorKillMeshes = rotorAssembly.userData.rotorKillMeshes
  root.userData.setSpinAngle = (angle) => {
    rotorAssembly.rotation.y = angle
  }
  root.userData.setRotorVisible = (visible) => {
    rotorAssembly.visible = visible
  }
  root.userData.createRotorClone = () => {
    const clone = rotorAssembly.clone(true)
    setShadowProps(clone)
    clone.userData.physics = ceilingFanRotorPhysicsDef
    clone.userData.rotorKillMeshes = collectRotorKillMeshes(clone)
    clone.userData.rotorLocalBounds = { ...rotorAssembly.userData.rotorLocalBounds }
    return clone
  }

  return root
}

export function getCeilingFanAsset() {
  return {
    name: 'Ceiling Fan',
    description: 'Cooling fan',
    factory: () => createCeilingFan(),
    physics: ceilingFanPhysicsDef
  }
}