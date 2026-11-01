import { unsupported } from './unsupported';
export enum BiometryType {
  None = 0,
  TouchID = 1,
  FaceID = 2,
}
export const checkStatus = async () => ({ isAvailable: false, biometryType: BiometryType.None });
export const authenticate = unsupported<void>;
