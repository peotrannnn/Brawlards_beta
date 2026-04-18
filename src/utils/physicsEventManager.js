import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Quản lý và xử lý các sự kiện va chạm vật lý trong thế giới Cannon.js.
 * Kích hoạt các hiệu ứng (ví dụ: particle, âm thanh) dựa trên loại va chạm.
 */
export class PhysicsEventManager {
    /**
     * @param {object} options
     * @param {ParticleManager} options.particleManager - Trình quản lý particle để tạo hiệu ứng.
     * @param {Array} options.syncList - Danh sách các object được đồng bộ hóa (mesh & body).
     */
    constructor({ particleManager, syncList }) {
        this.particleManager = particleManager;
        this.syncList = syncList;
        // Sử dụng Set để đảm bảo mỗi cặp va chạm chỉ được xử lý một lần mỗi frame, tránh lag
        this.handledPairs = new Set();
        this.tableClothColor = 0x0c6b34; // Màu mặc định, sẽ được update từ scene
    }

    /**
     * Đăng ký một body vật lý để lắng nghe sự kiện 'collide'.
     * @param {CANNON.Body} body - Body vật lý cần đăng ký.
     */
    registerBody(body) {
        if (!body || !this.particleManager) return;

        body.addEventListener('collide', (event) => {
            const { body: otherBody, contact } = event;

            // Tạo một key duy nhất cho cặp va chạm để tránh xử lý trùng lặp
            const pairKey = body.id < otherBody.id ? `${body.id}-${otherBody.id}` : `${otherBody.id}-${body.id}`;
            if (this.handledPairs.has(pairKey)) {
                return; // Đã xử lý cặp này trong frame hiện tại
            }

            // Tìm các entry tương ứng trong syncList
            const entryA = this.syncList.find(e => e.body === body);
            const entryB = this.syncList.find(e => e.body === otherBody);

            // CASE 1: Ball vs Ball (Spark)
            // Chỉ xử lý khi cả hai object đều có thông tin màu (tức là dynamic objects như Ball/Player)
            if (entryA?.mesh?.userData.mainColor && entryB?.mesh?.userData.mainColor) {
                this.handleDynamicCollision(entryA, entryB, contact);
                this.handledPairs.add(pairKey);
                return;
            }

            // CASE 2: Ball vs Table (Dust)
            // Kiểm tra nếu body là Ball và otherBody là Table (dựa vào material name)
            const isBodyBall = body.material && body.material.name === 'ball';
            const isOtherTable = otherBody.material && otherBody.material.name === 'table';

            if (isBodyBall && isOtherTable) {
                this.handleTableContact(body, contact);
                this.handledPairs.add(pairKey);
            }
        });
    }

    /**
     * Xử lý logic khi hai vật thể động va chạm.
     * @param {object} entryA - Entry đầu tiên từ syncList.
     * @param {object} entryB - Entry thứ hai từ syncList.
     * @param {CANNON.ContactEquation} contact - Thông tin điểm tiếp xúc.
     */
    handleDynamicCollision(entryA, entryB, contact) {
        // Tính toán tọa độ điểm va chạm trong không gian thế giới.
        // contact.ri là vector từ tâm của bodyA đến điểm tiếp xúc, trong hệ tọa độ của bodyA.
        const contactPoint = new CANNON.Vec3();
        entryA.body.pointToWorldFrame(contact.ri, contactPoint);

        // Chuyển đổi từ CANNON.Vec3 sang THREE.Vector3 để dùng cho particle manager.
        const threeContactPoint = new THREE.Vector3(contactPoint.x, contactPoint.y, contactPoint.z);

        // Lấy màu từ userData của mesh
        const color1 = entryA.mesh.userData.mainColor;
        const color2 = entryB.mesh.userData.mainColor;

        // Tạo hiệu ứng 'spark' với màu sắc của 2 vật thể
        this.particleManager.spawn('spark', threeContactPoint, { color1, color2 });
    }

    /**
     * Xử lý khi bóng lăn trên bàn (tạo bụi).
     * @param {CANNON.Body} ballBody
     * @param {CANNON.ContactEquation} contact
     */
    handleTableContact(ballBody, contact) {
        // 1. Kiểm tra vận tốc: Chỉ tạo bụi khi bóng lăn đủ nhanh
        const speed = ballBody.velocity.length();
        const SPEED_THRESHOLD = 1.0; // Giảm ngưỡng để dễ tạo bụi hơn
        const IMPACT_THRESHOLD = 2.0; // Ngưỡng lực va chạm để tạo bụi (tạm thời comment)

       // if (speed > SPEED_THRESHOLD) return; // Chỉ tạo bụi khi chậm
       // if (contact.getImpactVelocityAlongNormal() > IMPACT_THRESHOLD) return; // Không tạo bụi khi va chạm mạnh

        // 2. Throttle: Giới hạn tần suất tạo bụi (ví dụ: 50ms một lần)
        const now = Date.now()
        const lastDustTime = ballBody.userData.lastDustTime || 0
        const DUST_COOLDOWN = 50; // ms

        if (now - lastDustTime < DUST_COOLDOWN) return;

        // 3. Tạo hiệu ứng
        const contactPoint = new CANNON.Vec3();
        ballBody.pointToWorldFrame(contact.ri, contactPoint);
        const threeContactPoint = new THREE.Vector3(contactPoint.x, contactPoint.y, contactPoint.z);

        // Tạo màu bụi sáng hơn một chút để dễ nhìn thấy trên nền bàn
        const dustColor = new THREE.Color(this.tableClothColor);
        dustColor.lerp(new THREE.Color(0xffffff), 0.4); // Trộn 40% màu trắng

        this.particleManager.spawn('dust', threeContactPoint, {
            color: dustColor.getHex()
        });

        // Cập nhật thời gian
        ballBody.userData.lastDustTime = now;
    }

    /**
     * Cập nhật màu vải bàn để hiệu ứng bụi đúng màu
     */
    setTableColor(hexColor) {
        this.tableClothColor = hexColor;
    }

    /**
     * Reset lại danh sách các cặp đã xử lý.
     * Hàm này PHẢI được gọi một lần mỗi frame, ngay trước khi world.step().
     */
    reset() {
        this.handledPairs.clear();
    }
}