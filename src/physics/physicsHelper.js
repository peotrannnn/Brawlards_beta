import * as CANNON from 'cannon-es'

// ==================== PHYSICS CONFIG ====================

const DEFAULT_LINEAR_DAMPING = 0.35
const DEFAULT_ANGULAR_DAMPING = 0.8
const DEFAULT_MASS = 1

// ✨ Object mass constants (dùng cho recoil calculation)
export const OBJECT_MASSES = {
  BILLIARD_BALL: 0.17,
  BOWLING_BALL: 6.5,  // ✨ Fixed to match BallFactory mass
  PLAYER: 0.01,
  DUMMY: 100,
  GUY: 0.01,
  GUIDE: 30,
  TABLE: 0  // Static
};

export const COLLISION_GROUPS = {
    STATIC: 1,
    BALL: 2,
    PLAYER: 4,
    CUE: 8,
    RAIL: 16, // Nhóm mới cho thành bàn
    TRIGGER: 32, // Nhóm mới cho các hitbox trigger
    ITEM: 64 // Nhóm mới cho các item (light stick, baby oil, etc.)
};

export const COLLISION_MASKS = {
    STATIC: -1 ^ (COLLISION_GROUPS.TRIGGER | COLLISION_GROUPS.CUE), // FIX: Va chạm mọi thứ TRỪ TRIGGER và CUE
    BALL: COLLISION_GROUPS.STATIC | COLLISION_GROUPS.BALL | COLLISION_GROUPS.PLAYER | COLLISION_GROUPS.RAIL | COLLISION_GROUPS.TRIGGER | COLLISION_GROUPS.CUE | COLLISION_GROUPS.ITEM,
    // Body chính của Player va chạm với STATIC, BALL, ITEM và TRIGGER (để kích hoạt event)
    PLAYER: COLLISION_GROUPS.STATIC | COLLISION_GROUPS.BALL | COLLISION_GROUPS.TRIGGER | COLLISION_GROUPS.ITEM, // Player không còn va chạm với CUE của chính nó
    CUE: COLLISION_GROUPS.BALL | COLLISION_GROUPS.ITEM, // Cây cơ va chạm với bi và item
    RAIL: COLLISION_GROUPS.STATIC | COLLISION_GROUPS.BALL | COLLISION_GROUPS.PLAYER | COLLISION_GROUPS.ITEM, // Table va chạm với BALL, PLAYER, ITEM và STATIC
    // Hitbox trigger sẽ được kiểm tra va chạm với PLAYER, BALL và ITEM (để tạo event cho AI)
    TRIGGER: COLLISION_GROUPS.PLAYER | COLLISION_GROUPS.BALL | COLLISION_GROUPS.ITEM,
    ITEM: COLLISION_GROUPS.STATIC | COLLISION_GROUPS.BALL | COLLISION_GROUPS.PLAYER | COLLISION_GROUPS.ITEM | COLLISION_GROUPS.CUE // Item va chạm với mọi thứ, gồm cả cue
};

export const CONTACT_CONFIG = {
  // Định nghĩa các loại material
  materials: {
    BALL: 'ball',
    PLAYER: 'player',
    TABLE: 'table',
    CUE: 'cue'  // ✨ Thêm cue material
  },

  // Cấu hình cho từng cặp va chạm
  ballTable: {
    friction: 0.1,
    restitution: 0.2,
    stiffness: 1e7,
    relaxation: 3
  },

  playerTable: {
    friction: 0.3,
    restitution: 0.3,
    stiffness: 1e8,
    relaxation: 3
  },

  ballPlayer: {
    friction: 0.3,
    restitution: 0.5,
    stiffness: 1e8,
    relaxation: 3
  },

  // ✨ Cấu hình CUE-BALL: high stiffness để prevent clipping
  cueBall: {
    friction: 0.05,        // Ma sát thấp
    restitution: 0.9,      // Độ nảy cao
    stiffness: 2e8,        // Rất cao để prevent penetration
    relaxation: 1          // Thấp để nhiều iteration hơn
  },

  // THÊM: Cấu hình cho bi với bi
  ballBall: {
    friction: 0.05,        // Ma sát rất thấp giữa các bi
    restitution: 0.95,      // Độ nảy cao - va chạm đàn hồi gần như lý tưởng
    stiffness: 1e8,
    relaxation: 3
  },

  // THÊM: Cấu hình cho player với player (nếu cần)
  playerPlayer: {
    friction: 0.5,
    restitution: 0.95,
    stiffness: 1e8,
    relaxation: 3
  },

  // THÊM: Cấu hình cho bàn với bàn (thường không cần nhưng để đầy đủ)
  tableTable: {
    friction: 0.5,
    restitution: 0.05,
    stiffness: 1e8,
    relaxation: 3
  }
}

// ==================== SHAPE CONFIG ====================

const SHAPE_CONFIG = {
  sphere: { defaultRadius: 1 },
  box: { defaultSize: [1, 1, 1] },
  cylinder: {
    defaultSegments: 8,
    defaultRadius: 1,
    defaultHeight: 2
  }
}

// =======================================================
// MATERIAL SETUP - ĐẦY ĐỦ TẤT CẢ CÁC CẶP
// =======================================================

export function setupContactMaterials(world) {
  // Tạo các material
  const materials = {
    default: new CANNON.Material('default'),
    ball: new CANNON.Material(CONTACT_CONFIG.materials.BALL),
    player: new CANNON.Material(CONTACT_CONFIG.materials.PLAYER),
    table: new CANNON.Material(CONTACT_CONFIG.materials.TABLE),
    cue: new CANNON.Material(CONTACT_CONFIG.materials.CUE)  // ✨ Thêm cue material
  }

  // 1. Ball - Table
  const ballTable = new CANNON.ContactMaterial(
    materials.ball,
    materials.table,
    {
      friction: CONTACT_CONFIG.ballTable.friction,
      restitution: CONTACT_CONFIG.ballTable.restitution,
      contactEquationStiffness: CONTACT_CONFIG.ballTable.stiffness,
      contactEquationRelaxation: CONTACT_CONFIG.ballTable.relaxation
    }
  )
  world.addContactMaterial(ballTable)

  // 2. Player - Table
  const playerTable = new CANNON.ContactMaterial(
    materials.player,
    materials.table,
    {
      friction: CONTACT_CONFIG.playerTable.friction,
      restitution: CONTACT_CONFIG.playerTable.restitution,
      contactEquationStiffness: CONTACT_CONFIG.playerTable.stiffness,
      contactEquationRelaxation: CONTACT_CONFIG.playerTable.relaxation
    }
  )
  world.addContactMaterial(playerTable)

  // 3. Ball - Player
  const ballPlayer = new CANNON.ContactMaterial(
    materials.ball,
    materials.player,
    {
      friction: CONTACT_CONFIG.ballPlayer.friction,
      restitution: CONTACT_CONFIG.ballPlayer.restitution,
      contactEquationStiffness: CONTACT_CONFIG.ballPlayer.stiffness,
      contactEquationRelaxation: CONTACT_CONFIG.ballPlayer.relaxation
    }
  )
  world.addContactMaterial(ballPlayer)

  // 4. Ball - Ball (QUAN TRỌNG: cho va chạm giữa các bi)
  const ballBall = new CANNON.ContactMaterial(
    materials.ball,
    materials.ball,  // Cùng là ball material
    {
      friction: CONTACT_CONFIG.ballBall.friction,
      restitution: CONTACT_CONFIG.ballBall.restitution,
      contactEquationStiffness: CONTACT_CONFIG.ballBall.stiffness,
      contactEquationRelaxation: CONTACT_CONFIG.ballBall.relaxation
    }
  )
  world.addContactMaterial(ballBall)

  // 5. Player - Player (tùy chọn)
  const playerPlayer = new CANNON.ContactMaterial(
    materials.player,
    materials.player,
    {
      friction: CONTACT_CONFIG.playerPlayer.friction,
      restitution: CONTACT_CONFIG.playerPlayer.restitution,
      contactEquationStiffness: CONTACT_CONFIG.playerPlayer.stiffness,
      contactEquationRelaxation: CONTACT_CONFIG.playerPlayer.relaxation
    }
  )
  world.addContactMaterial(playerPlayer)

  // 6. Table - Table (tùy chọn)
  const tableTable = new CANNON.ContactMaterial(
    materials.table,
    materials.table,
    {
      friction: CONTACT_CONFIG.tableTable.friction,
      restitution: CONTACT_CONFIG.tableTable.restitution,
      contactEquationStiffness: CONTACT_CONFIG.tableTable.stiffness,
      contactEquationRelaxation: CONTACT_CONFIG.tableTable.relaxation
    }
  )
  world.addContactMaterial(tableTable)

  // ✨ 7. Cue - Ball (QUAN TRỌNG: prevent clipping between cue và ball)
  const cueBall = new CANNON.ContactMaterial(
    materials.cue,
    materials.ball,
    {
      friction: CONTACT_CONFIG.cueBall.friction,
      restitution: CONTACT_CONFIG.cueBall.restitution,
      contactEquationStiffness: CONTACT_CONFIG.cueBall.stiffness,      // Rất cao để prevent penetration
      contactEquationRelaxation: CONTACT_CONFIG.cueBall.relaxation      // Thấp để nhiều iteration hơn
    }
  )
  world.addContactMaterial(cueBall)

  // Có thể thêm cấu hình mặc định cho tất cả các cặp khác
  // (sẽ được sử dụng nếu không tìm thấy contact material cụ thể)
  const defaultMaterial = materials.default
  const defaultContact = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    {
      friction: 0.3,
      restitution: 0.3,
      contactEquationStiffness: 1e8,
      contactEquationRelaxation: 3
    }
  )
  world.addContactMaterial(defaultContact)
  world.defaultContactMaterial = defaultContact

  return materials
}

// =======================================================
// BODY FACTORY
// =======================================================

export function createPhysicsBodyFromUserData(mesh, userData, materials) {
  if (!userData?.physics) return null;

  const physics = userData.physics;

  const body = new CANNON.Body({
    mass: physics.type === 'static' ? 0 : (physics.mass || DEFAULT_MASS),
    material: resolveMaterial(physics.material, materials) || materials.default,
    linearDamping: physics.linearDamping ?? DEFAULT_LINEAR_DAMPING,
    angularDamping: physics.angularDamping ?? DEFAULT_ANGULAR_DAMPING,
  });

  body.name = mesh.name;

  if (physics.fixedRotation) {
    body.fixedRotation = true;
    body.updateMassProperties();
  }

  // Gán collision group/mask dựa trên material
  if (physics.material === 'table') {
      body.collisionFilterGroup = COLLISION_GROUPS.RAIL;
      body.collisionFilterMask = COLLISION_MASKS.RAIL;
  } else if (physics.material === 'player') {
      body.collisionFilterGroup = COLLISION_GROUPS.PLAYER;
      body.collisionFilterMask = COLLISION_MASKS.PLAYER;
  } else if (physics.material === 'ball') {
      body.collisionFilterGroup = COLLISION_GROUPS.BALL;
      body.collisionFilterMask = COLLISION_MASKS.BALL;
  } else {
    console.log("No Physics Material Defined")
  }

  // Add all shapes to the single body
  if (physics.shapes) {
    // Chỉ thêm các shape không phải là trigger để tránh tạo body vật lý cho chúng
    physics.shapes.filter(s => !s.isTrigger).forEach(shapeData => {
      const shape = createShape(shapeData);
      if (!shape) return;
      const offset = new CANNON.Vec3(shapeData.offset?.[0] || 0, shapeData.offset?.[1] || 0, shapeData.offset?.[2] || 0);
      const quat = new CANNON.Quaternion();
      if (shapeData.rotation) quat.setFromEuler(shapeData.rotation[0] || 0, shapeData.rotation[1] || 0, shapeData.rotation[2] || 0, 'XYZ');
      body.addShape(shape, offset, quat);
    });
  }

  return body;
}

// =======================================================
// MATERIAL RESOLVER
// =======================================================

function resolveMaterial(name, materials) {
  console.log("resolving material name:", name)
  if (!name) return null
  console.log("CONTACT_CONFIG.materials.BALL", CONTACT_CONFIG.materials.BALL)

  if (name === CONTACT_CONFIG.materials.BALL) return materials.ball
  if (name === CONTACT_CONFIG.materials.PLAYER) return materials.player
  if (name === CONTACT_CONFIG.materials.TABLE) return materials.table

  return undefined
}

// =======================================================
// SHAPE FACTORY
// =======================================================

function createShape(shapeData) {
  const type = shapeData.type

  switch (type) {
    case 'sphere':
      return new CANNON.Sphere(
        shapeData.radius || SHAPE_CONFIG.sphere.defaultRadius
      )

    case 'box':
      const size = shapeData.size || SHAPE_CONFIG.box.defaultSize
      return new CANNON.Box(
        new CANNON.Vec3(size[0] / 2, size[1] / 2, size[2] / 2)
      )

    case 'cylinder':
      return new CANNON.Cylinder(
        shapeData.radiusTop || SHAPE_CONFIG.cylinder.defaultRadius,
        shapeData.radiusBottom || SHAPE_CONFIG.cylinder.defaultRadius,
        shapeData.height || SHAPE_CONFIG.cylinder.defaultHeight,
        shapeData.segments || SHAPE_CONFIG.cylinder.defaultSegments
      )

    default:
      console.warn('Unknown shape type', type)
      return null
  }
}

// =======================================================
// PHYSICS STABILIZATION
// prevents infinite micro movement
// =======================================================

export function stabilizePhysicsBodies(world) {
  const VELOCITY_EPSILON = 0.03
  const ANGULAR_EPSILON = 0.03

  world.bodies.forEach(body => {
    if (body.mass === 0) return

    const speed = body.velocity.length()
    const spin = body.angularVelocity.length()

    if (speed < VELOCITY_EPSILON) {
      body.velocity.set(0, 0, 0)
    }

    if (spin < ANGULAR_EPSILON) {
      body.angularVelocity.set(0, 0, 0)
    }
  })
}

// =======================================================
// UTILITY FUNCTIONS - Thêm các hàm tiện ích
// =======================================================

/**
 * Tạo một quả bi với cấu hình mặc định
 */
export function createBall(radius = 1, position = [0, 0, 0]) {
  return {
    physics: {
      type: 'dynamic',
      mass: 1,
      material: 'ball',
      linearDamping: 0.35,
      angularDamping: 0.8,
      shapes: [
        {
          type: 'sphere',
          radius: radius,
          offset: [0, 0, 0]
        }
      ]
    }
  }
}

/**
 * Tạo bàn với cấu hình mặc định
 */
export function createTable(size = [10, 1, 10], position = [0, 0, 0]) {
  return {
    physics: {
      type: 'static',
      material: 'table',
      shapes: [
        {
          type: 'box',
          size: size,
          offset: [0, 0, 0]
        }
      ]
    }
  }
}

/**
 * Thiết lập sự kiện va chạm cho các vật thể
 */
export function setupCollisionEvents(body, callback) {
  body.addEventListener('collide', (e) => {
    const contact = e.contact
    
    // Lấy thông tin về va chạm
    const materialA = contact.bi.material
    const materialB = contact.bj.material
    
    // Tính lực va chạm
    const impactForce = contact.getImpactVelocityAlongNormal()
    
    callback({
      body: body,
      contact: contact,
      materialA: materialA,
      materialB: materialB,
      impactForce: impactForce
    })
  })
}

// ✨ Detect cue tip touching balls
export function detectCueTouchingBalls(cueBody, forceBody, world) {
  if (!world || !world.bodies) return [];
  
  const hitBalls = [];
  
  world.bodies.forEach(body => {
    if (!body || body === cueBody || body === forceBody) return;
    
    // Bỏ qua non-ball bodies
    if (body.userData?.isCueBody || body.userData?.isForceBody || !body.userData?.isPhysicsBall) return;
    
    // Kiểm tra collision
    for (let i = 0; i < world.contacts.length; i++) {
      const contact = world.contacts[i];
      const isLicenseOrGJ = (contact.bi === cueBody || contact.bi === forceBody) && contact.bj === body;
      const isReverseOrGJ = contact.bi === body && (contact.bj === cueBody || contact.bj === forceBody);
      
      if (isLicenseOrGJ || isReverseOrGJ) {
        const contactPos = new CANNON.Vec3();
        contact.getContactPointA(contactPos);
        
        hitBalls.push({
          body: body,
          contactPoint: contactPos,
          impactForce: contact.getImpactVelocityAlongNormal()
        });
        break;
      }
    }
  });
  
  return hitBalls;
}