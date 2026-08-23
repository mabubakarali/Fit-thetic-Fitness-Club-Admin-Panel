import { generateUUID } from './uuid';

const DEVICE_ID_KEY = 'fit_thetic_device_id';

/**
 * Gets or initializes a persistent unique installation Device ID.
 * Device ID is used for audit tracking and sync attribution,
 * NOT as a primary key for business entities.
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'node-server-device';
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `dev_${generateUUID().replace(/-/g, '').substring(0, 16)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}
