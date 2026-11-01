export class LogicalPosition {
  constructor(
    public x: number,
    public y: number,
  ) {}
  toPhysical(scale: number) {
    return new PhysicalPosition(this.x * scale, this.y * scale);
  }
}
export class PhysicalPosition {
  constructor(
    public x: number,
    public y: number,
  ) {}
  toLogical(scale: number) {
    return new LogicalPosition(this.x / scale, this.y / scale);
  }
}
export class LogicalSize {
  constructor(
    public width: number,
    public height: number,
  ) {}
  toPhysical(scale: number) {
    return new PhysicalSize(this.width * scale, this.height * scale);
  }
}
export class PhysicalSize {
  constructor(
    public width: number,
    public height: number,
  ) {}
  toLogical(scale: number) {
    return new LogicalSize(this.width / scale, this.height / scale);
  }
}
