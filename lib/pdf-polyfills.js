globalThis.DOMMatrix = globalThis.DOMMatrix || class {
  constructor() {}
  scale() { return this; }
  invertSelf() { return this; }
  multiplySelf() { return this; }
};

globalThis.ImageData = globalThis.ImageData || class {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
};

globalThis.Path2D = globalThis.Path2D || class {
  constructor() {}
  addPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  rect() {}
  arc() {}
};
