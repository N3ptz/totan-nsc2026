/**
 * TypeORM คืนค่า column ชนิด decimal เป็น string — transformer นี้แปลงเป็น number
 * ตั้งแต่ฝั่ง API เลย จะได้ไม่ต้อง Number() กระจัดกระจายใน frontend
 */
export const numericTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value == null ? value : Number(value)),
};
