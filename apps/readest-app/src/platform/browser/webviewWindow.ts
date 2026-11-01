import { BrowserWindow } from './window';
export class WebviewWindow extends BrowserWindow {
  static async getByLabel(_label: string): Promise<WebviewWindow | null> {
    return null;
  }
}
export const getAllWebviewWindows = async () => [new WebviewWindow()];
