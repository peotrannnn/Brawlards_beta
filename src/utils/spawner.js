import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { TABLE_WIDTH, TABLE_DEPTH } from "../assets/objects/BilliardTable.js"
import { CollisionManager } from './collisionManager.js'
import { COLLISION_GROUPS } from '../physics/physicsHelper.js'

function inferSpawnCategory(prefab, body) {
  if (prefab?.spawnCategory === 'item' || prefab?.spawnCategory === 'gameObject') {
    return prefab.spawnCategory
  }

  const bodyCategory = body?.userData?.spawnCategory
  if (bodyCategory === 'item' || bodyCategory === 'gameObject') {
    return bodyCategory
  }

  if (body?.collisionFilterGroup === COLLISION_GROUPS.ITEM) {
    return 'item'
  }

  return 'gameObject'
}


// returns a position vector randomly within a slightly smaller area than the table surface
// `baseY` can be used to offset the spawn height (e.g. table top + some clearance)
export function randomPositionAboveTable(height = 5, baseY = 0) {
  // we shrink the available region so objects never spawn exactly on an edge
  const shrinkFactor = 0.9 // 90% of the table dimensions
  const halfW = (TABLE_WIDTH / 2) * shrinkFactor
  const halfD = (TABLE_DEPTH / 2) * shrinkFactor
  const x = (Math.random() * 2 - 1) * halfW
  const z = (Math.random() * 2 - 1) * halfD
  return new THREE.Vector3(x, baseY + height, z)
}

// simplified spawn logic: create mesh/body and integrate with world and hitbox manager
export function spawnObject({
  scene,
  prefab,
  position,
  world,
  physicsMaterials,
  syncList,
  particleManager
}) {
  const mesh = prefab.createMesh()
  scene.add(mesh)
  mesh.position.copy(position)

  const spawnCategoryFromPrefab = prefab?.spawnCategory

  // Keep item spawns lightweight: shadows on tiny collectibles are costly and not gameplay-critical.
  const shouldApplyShadowTraversal = spawnCategoryFromPrefab !== 'item'
  if (shouldApplyShadowTraversal) {
    mesh.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }

  const body = prefab.createBody(physicsMaterials)
  if (body) {
    body.position.copy(position)
    body.name = prefab.name || mesh.name
    body.userData = body.userData || {}
    body.userData.spawnCategory = inferSpawnCategory(prefab, body)
    world.addBody(body)
  }

  const spawnCategory = inferSpawnCategory(prefab, body)
  mesh.userData = mesh.userData || {}
  mesh.userData.spawnCategory = spawnCategory

  const entry = { mesh, body, type: prefab.type, name: prefab.name, spawnCategory }
  syncList.push(entry)

  CollisionManager.addHitboxForObject(entry)

  // spawn a little smoke when object appears
  if (particleManager && particleManager.spawn) {
    particleManager.spawn('smoke', position.clone())
  }

  return entry
}

export function spawnRandom({
  scene,
  dynamicPrefabs,
  world,
  physicsMaterials,
  syncList,
  particleManager,
  height = 7,
  baseY = 0
}) {
  if (!dynamicPrefabs.length) return
  const prefab = dynamicPrefabs[Math.floor(Math.random() * dynamicPrefabs.length)]
  const pos = randomPositionAboveTable(height, baseY)
  return spawnObject({scene, prefab, position: pos, world, physicsMaterials, syncList, particleManager})
}
