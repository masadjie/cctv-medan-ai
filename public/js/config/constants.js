/**
 * Nusantara Traffic Vision - Constants & Configurations
 * Architect: Adjie Kurniawan (instagram.com/adjie.apk)
 */

export const CAR_CLASSES = ['car', 'truck', 'bus'];
export const MOTOR_CLASSES = ['motorcycle', 'bicycle', 'motorbike', 'person'];

export const COLOR_CAR = '#00e5ff';      // Cyan Silver
export const COLOR_MOTOR = '#ffb300';    // Amber Yellow

export const MODEL_ENGINES = {
  yolo11: {
    name: 'YOLO11 PRO (Ultralytics)',
    description: 'Presisi Tinggi & Anti-Occlusion (Rekomendasi)'
  },
  yolov8: {
    name: 'YOLOv8 HD (Ultralytics)',
    description: 'High Recall Sepeda Motor & Mobil'
  },
  yolo26: {
    name: 'YOLO26 NMS-Free',
    description: 'Arsitektur Terbaru 2026 (Ultra-Fast)'
  },
  cocossd: {
    name: 'MobileNetV2 COCO-SSD',
    description: 'Mode Ringan (Low-End Hardware)'
  }
};
