import { unsupported } from './unsupported';
export class Command {
  static create(..._args: unknown[]) {
    return new Command();
  }
  execute = unsupported<{ code: number; stdout: string; stderr: string }>;
  spawn = unsupported<{ pid: number }>;
}
