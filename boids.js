var s = Snap("#svg");
var fps = 60;
var boids = [];

class Boid {
  constructor(x, y, dir=0, scale=4) {
    this.x = x;
    this.y = y;
    this.direction = dir;
    this.scale = scale;
    this.polygon = s
      .polygon(3, 0, -1, -1, -1, 1) // triangle pointing right
      .transform(this.transform);
  }

  translate(dx, dy) {
    this.x += dx;
    this.y += dy;
  }

  steer(dr) {
    this.direction += dr;
  }

  fly(distance) {
    this.x += distance * Math.cos(this.direction);
    this.y += distance * Math.sin(this.direction);
  }

  get angle() {
    return this.direction * 180 / Math.PI;
  }

  get transform() {
    var t = new Snap.Matrix()
      .translate(this.x, this.y)
      .scale(this.scale)
      .rotate(this.angle)
    return t;
  }

  update() {
    this.steer((Math.random() - 0.5) / 5);
    this.fly(1);
    this.polygon.transform(this.transform);
  }
}

function create() {
  boids.push(new Boid(100, 200));
}

function update() {
  boids.forEach(function(boid){ boid.update(); });
}

function main() {
  create();
  var interval = setInterval(update, 1000 / fps);
}

main();