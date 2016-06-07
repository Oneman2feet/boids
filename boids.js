// TODO: add obstacles, add general path following, add sidescrolling, minnows, split flock and remerge

var vue = new Vue({
  el: '#controls',
  data: {
    variables: [
      { text: "Separation", reactivity: 30, sensitivity:  25 },
      { text:  "Alignment", reactivity:  3, sensitivity: 100 },
      { text:   "Cohesion", reactivity: 30, sensitivity: 200 }
    ]
  }
});

var s = Snap("#svg");
var fps = 60;
var boids = [];
var rect;

class Vector {
  constructor(x=0, y=0) {
    this.x = x;
    this.y = y;
  }

  set(x, y) {
    this.x = x;
    this.y = y;
  }

  add(other) {
    this.x += other.x;
    this.y += other.y;
  }

  sub(other) {
    this.x -= other.x;
    this.y -= other.y;
  }

  scale(amt) {
    this.x *= amt;
    this.y *= amt;
  }

  normalize() {
    this.scale(1 / this.magnitude);
  }

  lerp(other, t) {
    other.scale(t);
    this.scale(1-t);
    this.add(other);
    return this;
  }

  get magnitudeSq() {
    return this.x*this.x + this.y*this.y;
  }

  get magnitude() {
    return Math.sqrt(this.magnitudeSq);
  }

  get direction() {
    return Math.atan2(this.y, this.x);
  }

  get angle() {
    return this.direction * 180 / Math.PI;
  }

  static sum(a, b) {
    return new Vector(a.x+b.x, a.y+b.y);
  }

  static distSq(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx*dx + dy*dy;
  }

  // Angle in radians needed to rotate from a to b
  static rotationBetween(a, b) {
    if (a.angle===NaN || b.angle===NaN) return 0; // cover zero vector
    var diff = b.angle-a.angle;
    if (diff >  Math.PI) return diff - 2*Math.PI;
    if (diff < -Math.PI) return diff + 2*Math.PI;
    return diff;
  }
}

class Boid {
  constructor(x, y, dir=0, scale=4) {
    this.x = this.nextX = x;
    this.y = this.nextY = y;
    this.direction = this.nextDirection = dir;
    this.scale = scale;
    this.polygon = s
      .polygon(3, 0, -1, -1, -1, 1) // triangle pointing right
      .transform(this.transform);
  }

  translate(dx, dy) {
    this.x += dx;
    this.y += dy;
  }

  wrapPosition() {
    var w = rect.width, h = rect.height;
    var x = this.nextX, y = this.nextY;
    if (x < 0) this.nextX += w;
    if (y < 0) this.nextY += h;
    if (x > w) this.nextX -= w;
    if (y > h) this.nextY -= h;
  }

  steer(dr) {
    this.nextDirection += dr;
  }

  steerTowards(otherHeading, speed) {
    var angle = Vector.rotationBetween(this.nextHeading,otherHeading);
    if (Math.abs(angle) < speed) this.steer(angle);
    else this.steer(Math.sign(angle)*speed);
  }

  fly(distance) {
    this.nextX += distance * Math.cos(this.direction);
    this.nextY += distance * Math.sin(this.direction);
  }

  get position() {
    return new Vector(this.x, this.y);
  }

  get heading() {
    return new Vector(Math.cos(this.direction), Math.sin(this.direction));
  }

  get nextHeading() {
    return new Vector(Math.cos(this.nextDirection), Math.sin(this.nextDirection));
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

  // TODO: optimize with AABB
  // TODO: remove self?
  // account for world wrap
  neighborsWithin(distance) {
    var that = this;
    return boids.filter(function(boid) {
      return Vector.distSq(boid.position, that.position) < distance*distance;
    });
  }

  // Separation
  separate(neighbors, reactivity) {
    var opposingDirection = neighbors.reduce(function(acc,el){
      acc.add(el.position);
      return acc;
    }, new Vector());
    opposingDirection.scale(1 / neighbors.length);
    opposingDirection.sub(this.position);
    opposingDirection.scale(-1);
    this.steerTowards(opposingDirection, reactivity / 1000);
  }

  // Alignment
  align(neighbors, reactivity) {
    var avgHeading = neighbors.reduce(function(acc,el){
      acc.add(el.heading);
      return acc;
    }, new Vector());
    avgHeading.scale(1 / neighbors.length);
    avgHeading.sub(this.position);
    this.steerTowards(avgHeading, reactivity / 10000);
  }

  // Cohesion
  cohese(neighbors, reactivity) {
    var towardsAvgPos = neighbors.reduce(function(acc,el){
      acc.add(el.position);
      return acc;
    }, new Vector());
    towardsAvgPos.scale(1 / neighbors.length);
    towardsAvgPos.sub(this.position);
    this.steerTowards(towardsAvgPos, reactivity / 1000);
  }

  update() {
    // TODO: optimize by doing steps in order of decreasing radius
    // and using previous neighbors list for filter of next step
    this.separate( this.neighborsWithin(vue.variables[0].sensitivity), vue.variables[0].reactivity);
    this.align(    this.neighborsWithin(vue.variables[1].sensitivity), vue.variables[1].reactivity);
    this.cohese(   this.neighborsWithin(vue.variables[2].sensitivity), vue.variables[2].reactivity);
    // TODO: add some amount of random flying?
    // TODO: add speed dependant on amount of turn?
    this.fly(3);
  }

  draw() {
    this.wrapPosition();
    this.x = this.nextX;
    this.y = this.nextY;
    this.direction = this.nextDirection;
    this.polygon.transform(this.transform);
  }
}

function create() {
  rect = s.node.getBoundingClientRect();
  for (var i=0; i<100; i++) {
    boids.push(new Boid(
      Math.random() * rect.width,
      Math.random() * rect.height,
      Math.random() * 2 * Math.PI));
  }
}

function step() {
  rect = s.node.getBoundingClientRect();
  boids.forEach(function(boid){ boid.update(); });
  boids.forEach(function(boid){ boid.draw(); });
}

function main() {
  create();
  var interval = setInterval(step, 1000 / fps);
}

main();