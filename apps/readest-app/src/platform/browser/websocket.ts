import { unsupported } from './unsupported';
type Message =
  | { type: 'Text'; data: string }
  | { type: 'Binary'; data: number[] }
  | { type: 'Close'; data: { code: number; reason: string } | null }
  | { type: 'Ping' | 'Pong'; data: number[] };
/** The browser branch uses WebSocket directly; header-based native transport is unavailable. */
export default class LegacySocket {
  static connect = unsupported<LegacySocket>;
  addListener(_handler: (message: Message) => void) {
    return () => {};
  }
  send = unsupported<void>;
  disconnect = async () => {};
}
