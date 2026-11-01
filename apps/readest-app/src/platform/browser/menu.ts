import { unsupported } from './unsupported';
interface MenuOptions {
  text?: string;
  action?: () => void;
  enabled?: boolean;
  id?: string;
}
export class MenuItem {
  static async new(_options: MenuOptions) {
    return new MenuItem();
  }
  close = async () => {};
}
export class Menu {
  static async new(_options: { items: MenuItem[] }) {
    return new Menu();
  }
  popup = unsupported<void>;
  close = async () => {};
}
