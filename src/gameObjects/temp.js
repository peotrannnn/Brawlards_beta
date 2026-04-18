import * as CANNON from 'cannon-es';
import { getBallAssets } from "../assets/objects/BallFactory.js";
import { COLLISION_GROUPS, COLLISION_MASKS } from '../physics/physicsHelper.js';
import { getPlayerAsset } from "../assets/objects/Player.js";
import { getGuideAsset } from "../assets/objects/Guide.js";
import { getGuyAsset } from "../assets/objects/Guy.js";
import { getDudeAsset } from "../assets/objects/Dude.js";
import { getDummyAsset } from "../assets/objects/Dummy.js";
import { getCompuneAsset } from "../assets/objects/Compune.js";
import { getEyeAsset } from "../assets/objects/eye.js";
import { getDoor0Asset, getDoor1Asset, getDoor2Asset } from "../assets/objects/DoorFactory.js";
import { getElevatorDoorAsset } from "../assets/objects/ElevatorDoor.js";
import { getLightStickAsset } from "../assets/items/lightStick.js";
import { getLightStickOffAsset } from "../assets/items/lightStickOff.js";
import { getBabyOilAsset } from "../assets/items/babyOil.js";
import { getSilverCoinAsset } from "../assets/items/silverCoin.js";
import { withShadow } from "../effects/shadows/shadowConfig.js";

/**
 * Creates a CANNON.Body from a physics definition object.
 * @param {object} physDef - The physics definition.
 * @param {object} physicsMaterials - A map of physics materials.
 * @returns {CANNON.Body|null}
 */
function createBody(physDef, physicsMaterials) {
    if (!physDef) return null;

    const body = new CANNON.Body({
        mass: physDef.mass || 0,
        material: physicsMaterials[physDef.material] || physicsMaterials.default,
        linearDamping: physDef.linearDamping !== undefined ? physDef.linearDamping : 0.01,
        angularDamping: physDef.angularDamping !== undefined ? physDef.angularDamping : 0.01,
        fixedRotation: physDef.fixedRotation || false,
    });

    // Gán collision group/mask dựa trên material để tương tác vật lý hoạt động đúng
    // Giả định rằng Guy, Guide, Dummy đều dùng material 'player'
    if (physDef.material === 'player') {
        body.collisionFilterGroup = COLLISION_GROUPS.PLAYER;
        body.collisionFilterMask = COLLISION_MASKS.PLAYER;
    } else if (physDef.material === 'ball') {
        body.collisionFilterGroup = COLLISION_GROUPS.BALL;
        body.collisionFilterMask = COLLISION_MASKS.BALL;
    } else if (physDef.material === 'item') {
        body.collisionFilterGroup = COLLISION_GROUPS.ITEM;
        body.collisionFilterMask = COLLISION_MASKS.ITEM;
    }

    if (physDef.shapes) {
        physDef.shapes.forEach(shapeDef => {
            let shape;
            if (shapeDef.type === 'sphere') {
                shape = new CANNON.Sphere(shapeDef.radius);
            } else if (shapeDef.type === 'box') {
                const size = shapeDef.size;
                shape = new CANNON.Box(new CANNON.Vec3(size[0] / 2, size[1] / 2, size[2] / 2));
            } else if (shapeDef.type === 'cylinder') {
                // Cannon-es uses sphere/box/convex, so approximate cylinder with a box
                shape = new CANNON.Cylinder(shapeDef.radius, shapeDef.radius, shapeDef.length, 8);
            }
            if (shape) {
                const offset = shapeDef.offset ? new CANNON.Vec3(...shapeDef.offset) : new CANNON.Vec3();
                const orientation = shapeDef.rotation ? new CANNON.Quaternion().setFromEuler(...shapeDef.rotation) : new CANNON.Quaternion();
                body.addShape(shape, offset, orientation);
            }
        });
    }

    return body;
}

/**
 * Tập hợp tất cả các game object có thể được spawn động trong simulation.
 * @param {THREE.WebGLRenderer} renderer
 * @returns {Array<object>} Danh sách các asset prefabs.
 */
export function createAllGameObjects(renderer) {
    const ballAssets = getBallAssets(renderer);
    const playerAsset = getPlayerAsset();
    const guideAsset = getGuideAsset();
    const guyAsset = getGuyAsset();
    const dudeAsset = getDudeAsset();
    const dummyAsset = getDummyAsset();
    const compuneAsset = getCompuneAsset();
    const eyeAsset = getEyeAsset();
    const lightStickAsset = getLightStickAsset();
    const lightStickOffAsset = getLightStickOffAsset();
    const babyOilAsset = getBabyOilAsset();
    const silverCoinAsset = getSilverCoinAsset();

    // Gán 'type' để SimulationTest.js có thể lọc ra các object động
    // Spawner.js gọi hàm 'createMesh' và 'createBody', nên ta gán các hàm tương ứng
    const dynamicBallAssets = ballAssets.map(asset => {
        let shadowSize, shadowOpacity, shadowFadeRate;

        if (asset.name === "Bowling Ball") {
            // Shadow to hơn và đậm hơn cho bowling ball để tương xứng với kích thước
            shadowSize = 1.5;       // Kích thước shadow lớn hơn
            shadowOpacity = 0.8;    // Đậm hơn
            shadowFadeRate = 0.5;   // Mờ chậm hơn khi object bay lên cao
        } else {
            // Shadow cho bi-da, tăng độ đậm lên một chút
            shadowSize = 0.6;
            shadowOpacity = 0.75;   // Đậm hơn so với 0.6 ban đầu
            shadowFadeRate = 0.8;
        }

        return {
            ...asset,
            type: 'dynamic',
            createMesh: withShadow(asset.factory, shadowSize, shadowOpacity, shadowFadeRate),
            createBody: (mats) => createBody(asset.physics, mats)
        };
    });
    
    const dynamicPlayerAsset = { 
        ...playerAsset, 
        type: 'dynamic',
        createMesh: withShadow(playerAsset.factory, 1.2, 0.9, 0.4), // Player shadow to, đậm và mờ chậm hơn
        createBody: (mats) => createBody(playerAsset.physics, mats)
    };
    
    const dynamicGuideAsset = { 
        ...guideAsset, 
        type: 'dynamic',
        createMesh: withShadow(guideAsset.factory, 1.2, 0.9, 0.4),
        createBody: (mats) => createBody(guideAsset.physics, mats)
    };

    const dynamicGuyAsset = {
        ...guyAsset,
        type: 'dynamic',
        createMesh: withShadow(guyAsset.factory, 1.2, 0.9, 0.4),
        createBody: (mats) => createBody(guyAsset.physics, mats)
    };

    const dynamicDudeAsset = {
        ...dudeAsset,
        type: 'dynamic',
        createMesh: withShadow(dudeAsset.factory, 1.2, 0.9, 0.4),
        createBody: (mats) => createBody(dudeAsset.physics, mats)
    };

    const dynamicDummyAsset = {
        ...dummyAsset,
        type: 'dynamic',
        createMesh: withShadow(dummyAsset.factory, 1.2, 0.9, 0.4),
        createBody: (mats) => createBody(dummyAsset.physics, mats)
    };

    const dynamicCompuneAsset = {
        ...compuneAsset,
        type: 'dynamic',
        createMesh: withShadow(compuneAsset.factory, 1.2, 0.9, 0.4),
        createBody: (mats) => createBody(compuneAsset.physics, mats)
    };

    const dynamicEyeAsset = {
        ...eyeAsset,
        type: 'dynamic',
        createMesh: eyeAsset.factory,
        createBody: (mats) => createBody(eyeAsset.physics, mats)
    };

    const dynamicLightStickAsset = {
        ...lightStickAsset,
        type: 'dynamic',
        createMesh: withShadow(lightStickAsset.factory, 0.6, 0.7, 0.8),
        createBody: (mats) => createBody(lightStickAsset.physics, mats)
    };

    const dynamicLightStickOffAsset = {
        ...lightStickOffAsset,
        type: 'dynamic',
        createMesh: withShadow(lightStickOffAsset.factory, 0.6, 0.7, 0.8),
        createBody: (mats) => createBody(lightStickOffAsset.physics, mats)
    };

    const dynamicBabyOilAsset = {
        ...babyOilAsset,
        type: 'dynamic',
        createMesh: withShadow(babyOilAsset.factory, 0.6, 0.7, 0.8),
        createBody: (mats) => createBody(babyOilAsset.physics, mats)
    };

    const dynamicSilverCoinAsset = {
        ...silverCoinAsset,
        type: 'dynamic',
        createMesh: withShadow(silverCoinAsset.factory, 0.5, 0.65, 0.9),
        createBody: (mats) => createBody(silverCoinAsset.physics, mats)
    };

    return [...dynamicBallAssets, dynamicPlayerAsset, dynamicGuideAsset, dynamicGuyAsset, dynamicDudeAsset, dynamicDummyAsset, dynamicCompuneAsset, dynamicEyeAsset, dynamicLightStickAsset, dynamicLightStickOffAsset, dynamicBabyOilAsset, dynamicSilverCoinAsset];
}

/**
 * Creates a collection of static scene assets (non-physics objects).
 * These are environmental/static object assets like the billiard table and elevator door.
 * @returns {Array<object>} Danh sách các static asset (không spawn động).
 */
export function createAllStaticAssets() {
    return [
        getElevatorDoorAsset()
    ];
}