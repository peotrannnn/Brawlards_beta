/**
 * Helper để bọc factory và thêm cấu hình shadow giả
 * @param {Function} factory - Hàm tạo mesh gốc
 * @param {number} size - Kích thước shadow (mặc định 1.0)
 * @param {number} opacity - Độ đậm của shadow (mặc định 0.6)
 * @param {number} fadeRate - Tốc độ mờ khi lên cao (mặc định 0.5)
 * @returns {Function} Factory mới trả về mesh đã có cấu hình shadow
 */
export const withShadow = (factory, size = 1.0, opacity = 1.0, fadeRate = 0.5) => {
    return () => {
        const mesh = factory();
        // Thêm config này để SimulationTest.js nhận biết và tạo FakeShadow
        mesh.userData.shadowConfig = { size, opacity, fadeRate };
        return mesh;
    };
};