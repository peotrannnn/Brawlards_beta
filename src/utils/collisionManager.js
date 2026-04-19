import * as THREE from "three";
import * as CANNON from "cannon-es";

// Configuration for visual elements
const VISUAL_CONFIG = {
    globalOpacity: 0.4,
    colors: {
        default: "#ff0000",
        static: "#00ff00",
        player: "#0000ff",
        ball: "#ffff00",
        trigger: "#ff00ff",
        kinematic: "#00ffff",
    },
    sphereSegments: 16,
    cylinderSegments: 16,
    wireframe: true,
    transparent: true,
    depthTest: false, // FIX: Allow hitboxes to be seen inside meshes
};

// --- Static State ---
let scene = null;
let syncList = [];
let sceneObjects = [];

let visualsVisible = false;
let visibilityState = 0; // 0: Normal, 1: Visuals + Meshes, 2: Visuals Only

const hitboxes = [];
const triggerZones = [];

function ensureHitboxesForVisibleEntries() {
    if (!scene || !Array.isArray(syncList)) return;

    syncList.forEach(entry => {
        if (!entry?.body) return;
        const existing = hitboxes.find(h => h.body === entry.body);
        if (existing) return;

        const color = getColorForBody(entry);
        const helper = createHitboxHelper(entry.body, color);
        if (!helper) return;

        helper.position.copy(entry.body.position);
        helper.quaternion.copy(entry.body.quaternion);
        helper.visible = visualsVisible;
        helper.renderOrder = 999;
        scene.add(helper);
        hitboxes.push({
            helper,
            body: entry.body,
            entryName: entry.name,
            type: entry.type
        });
    });
}

// --- Private Functions ---

function setMeshesVisible(visible) {
    syncList.forEach(entry => {
        if (entry.mesh) entry.mesh.visible = visible;
    });
    sceneObjects.forEach(obj => {
        if (obj) obj.visible = visible;
    });
}

function setAllVisualsVisible(visible) {
    visualsVisible = visible;
    hitboxes.forEach(item => {
        if (item.helper) item.helper.visible = visible;
    });
    triggerZones.forEach(zone => {
        if (zone) zone.visible = visible;
    });
}

function getColorForBody(entry) {
    if (entry && entry.debugColor) return entry.debugColor;
    if (entry.type === "static") return VISUAL_CONFIG.colors.static;
    if (entry.type === "trigger") return VISUAL_CONFIG.colors.trigger;
    if (entry.type === "kinematic") return VISUAL_CONFIG.colors.kinematic;
    if (entry.name === "Player") return VISUAL_CONFIG.colors.player;
    if (entry.name && entry.name.includes("Ball")) return VISUAL_CONFIG.colors.ball;
    return VISUAL_CONFIG.colors.default;
}

function createHitboxHelper(body, color) {
    if (!body) return null;

    const helper = new THREE.Group();
    helper.visible = visualsVisible;

    body.shapes.forEach((shape, index) => {
        const shapeOffset = body.shapeOffsets[index];
        const shapeOrientation = body.shapeOrientations[index];
        if (!shapeOffset) return;

        let mesh;
        const material = new THREE.MeshBasicMaterial({
            color: color,
            wireframe: VISUAL_CONFIG.wireframe,
            transparent: VISUAL_CONFIG.transparent,
            opacity: VISUAL_CONFIG.globalOpacity,
            depthTest: VISUAL_CONFIG.depthTest
        });

        if (shape instanceof CANNON.Sphere) {
            mesh = new THREE.Mesh(
                new THREE.SphereGeometry(shape.radius, VISUAL_CONFIG.sphereSegments, VISUAL_CONFIG.sphereSegments), 
                material
            );
        } else if (shape instanceof CANNON.Box) {
            mesh = new THREE.Mesh(
                new THREE.BoxGeometry(shape.halfExtents.x * 2, shape.halfExtents.y * 2, shape.halfExtents.z * 2), 
                material
            );
        } else if (shape instanceof CANNON.Cylinder) {
            mesh = new THREE.Mesh(
                new THREE.CylinderGeometry(shape.radiusTop, shape.radiusBottom, shape.height, VISUAL_CONFIG.cylinderSegments), 
                material
            );
        }

        if (mesh) {
            mesh.position.copy(shapeOffset);
            if (shapeOrientation) mesh.quaternion.copy(shapeOrientation);
            mesh.renderOrder = 999;
            helper.add(mesh);
        }
    });

    return helper;
}

function createTriggerZoneHelper(radius, color, position = null) {
    const material = new THREE.MeshBasicMaterial({
        color: color,
        wireframe: VISUAL_CONFIG.wireframe,
        transparent: VISUAL_CONFIG.transparent,
        opacity: VISUAL_CONFIG.globalOpacity * 0.5,
        depthTest: VISUAL_CONFIG.depthTest
    });
    
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, VISUAL_CONFIG.sphereSegments, VISUAL_CONFIG.sphereSegments),
        material
    );
    
    if (position) {
        mesh.position.copy(position);
    }
    
    mesh.renderOrder = 999;
    // Mark as trigger box để raycaster có thể ignore khi click possess
    mesh.userData.isTriggerBox = true;
    
    return mesh;
}

function disposeObjectResources(object) {
    if (!object) return;

    object.traverse((child) => {
        if (child.geometry && typeof child.geometry.dispose === 'function') {
            child.geometry.dispose();
        }

        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach((mat) => {
                    if (mat && typeof mat.dispose === 'function') mat.dispose();
                });
            } else if (typeof child.material.dispose === 'function') {
                child.material.dispose();
            }
        }
    });
}

// --- Public Static Class ---

export class CollisionManager {
    static init(config) {
        scene = config.scene;
        syncList = config.syncList || [];
        sceneObjects = config.sceneObjects || [];


    }

    static setSceneObjects(objects) {
        sceneObjects = Array.isArray(objects) ? objects : [objects];
        
        // When scene objects change, update their visibility based on current state
        this.applyVisibilityState();
    }

    static cycleVisibilityMode() {
        visibilityState = (visibilityState + 1) % 3;
        this.applyVisibilityState();
        

    }

    static applyVisibilityState() {
        switch (visibilityState) {
            case 0: // Normal
                setMeshesVisible(true);
                setAllVisualsVisible(false);
                break;
            case 1: // Visuals + Meshes
                ensureHitboxesForVisibleEntries();
                setMeshesVisible(true);
                setAllVisualsVisible(true);
                break;
            case 2: // Visuals Only
                ensureHitboxesForVisibleEntries();
                setMeshesVisible(false);
                setAllVisualsVisible(true);
                break;
        }
    }

    static getVisibilityStateString() {
        switch (visibilityState) {
            case 0: return "Normal";
            case 1: return "Visuals + Hitboxes";
            case 2: return "Hitboxes Only";
            default: return "Normal";
        }
    }

    static getCurrentVisibilityState() {
        return visibilityState;
    }

    static isVisualsVisible() {
        return visualsVisible;
    }

    static addHitboxForObject(entry) {
        if (!entry || !entry.body) return null;

        // Check if hitbox already exists for this body
        const existing = hitboxes.find(h => h.body === entry.body);
        if (existing) return existing.helper;

        // Keep runtime spawn cheap: only build debug helpers when debug visuals are enabled.
        if (!visualsVisible) {
            return null;
        }

        // Ensure mesh visibility is correct upon creation
        if (entry.mesh) {
            entry.mesh.visible = (visibilityState !== 2);
        }

        const color = getColorForBody(entry);
        const helper = createHitboxHelper(entry.body, color);

        if (helper) {
            helper.position.copy(entry.body.position);
            helper.quaternion.copy(entry.body.quaternion);
            helper.visible = visualsVisible; // Set visibility dựa trên state hiện tại
            helper.renderOrder = 999; // Luôn hiển thị trên cùng
            scene.add(helper);
            hitboxes.push({
                helper,
                body: entry.body,
                entryName: entry.name,
                type: entry.type
            });
        }
        
        return helper;
    }

    static hasHitboxForBody(body) {
        if (!body) return false;
        return hitboxes.some(h => h.body === body);
    }
    
    static removeHitboxForObject(entry) {
        if (!entry || !entry.body) return false;
        
        const index = hitboxes.findIndex(h => h.body === entry.body);
        if (index !== -1) {
            const { helper } = hitboxes[index];
            if (helper && scene) scene.remove(helper);
            disposeObjectResources(helper);
            hitboxes.splice(index, 1);
            return true;
        }
        return false;
    }

    static addTriggerZone(radius, color = VISUAL_CONFIG.colors.trigger, position = null, parent = null) {
        const zone = createTriggerZoneHelper(radius, color, position);
        zone.visible = visualsVisible;
        
        if (parent) {
            parent.add(zone);
        } else if (scene) {
            scene.add(zone);
        }
        
        triggerZones.push(zone);
        return zone;
    }

    static addCharacterTriggerZones(character, config = {}) {
        if (!character) return null;
        
        const smallRadius = config.smallRadius || 1.5;
        const largeRadius = config.largeRadius || 3.0;
        const smallColor = config.smallColor || VISUAL_CONFIG.colors.trigger;
        const largeColor = config.largeColor || VISUAL_CONFIG.colors.player;
        
        const triggerZoneA = this.addTriggerZone(smallRadius, smallColor, null, character);
        triggerZoneA.name = "TriggerZone_Small";
        // ✨ Mark as trigger zone so ObjectHoverUI skips it
        triggerZoneA.userData.isTriggerZone = true;
        triggerZoneA.userData.isDynamicGameObject = false;
        
        const triggerZoneB = this.addTriggerZone(largeRadius, largeColor, null, character);
        triggerZoneB.name = "TriggerZone_Large";
        // ✨ Mark as trigger zone so ObjectHoverUI skips it
        triggerZoneB.userData.isTriggerZone = true;
        triggerZoneB.userData.isDynamicGameObject = false;
        
        return { small: triggerZoneA, large: triggerZoneB };
    }

    static removeTriggerZone(zone) {
        if (!zone) return false;
        
        const index = triggerZones.indexOf(zone);
        if (index !== -1) {
            if (scene) scene.remove(zone);
            triggerZones.splice(index, 1);
            return true;
        }
        return false;
    }

    static clearTriggerZones() {
        triggerZones.forEach(zone => {
            if (scene) scene.remove(zone);
            disposeObjectResources(zone);
        });
        triggerZones.length = 0;
    }

    static update() {
        if (!scene) return;

        // Update hitboxes if visible
        if (visualsVisible) {
            hitboxes.forEach(item => {
                if (item.body && item.helper) {
                    item.helper.position.copy(item.body.position);
                    item.helper.quaternion.copy(item.body.quaternion);
                }
            });
        }

        // Update trigger zones if they're attached to moving bodies
        // This is handled automatically if they're children of characters
    }

    static getAllHitboxes() {
        return hitboxes.map(h => ({
            helper: h.helper,
            body: h.body,
            name: h.entryName,
            type: h.type
        }));
    }

    static getAllTriggerZones() {
        return [...triggerZones];
    }

    static dispose() {
        // Clean up hitboxes
        hitboxes.forEach(({ helper }) => {
            if (helper && scene) scene.remove(helper);
            disposeObjectResources(helper);
        });
        hitboxes.length = 0;
        
        // Clean up trigger zones
        this.clearTriggerZones();
        
        // Reset state
        syncList = [];
        sceneObjects = [];
        scene = null;
        visibilityState = 0;
        visualsVisible = false;
        

    }
}