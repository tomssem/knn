const canvasSketch = require('canvas-sketch');
import {random} from "canvas-sketch-util"
import math from "canvas-sketch-util/math";
const _ = require("lodash");

const settings = {
  dimensions: [ 1080, 1080]
};

const params = {
  numPoints: 100,
  k: 1
}

const dotLT = (A, x) => {
  let y = Array(x.length).fill(0);

  for(let i = 0; i < A.length; ++i) {
    for(let j = 0; j < A[i].length; ++j) {
      y[i] += A[i][j] * x[i];
    }
  }

  return y;
}

const addV = (x, y) => {
  return _.zip(x, y).map(_.sum);
}

const generatePoints2D = (width, height, mean, variance) => {
  const transform = (u1, u2, trigFunc) => {
    return Math.sqrt(-2 * Math.log(u1)) * trigFunc(2 * Math.PI * u2);
  }
  const r1 = Math.random();
  const r2 = Math.random();

  const z0 = transform(r1, r2, Math.cos);
  const z1 = transform(r1, r2, Math.sin);

  const point = addV(mean, dotLT(variance, [z0, z1]));

  return new Point(point[0], point[1]);
};

const drawPoint = (context, point) => {
  context.save();
  context.fillStyle = point.cls === "2" ? "black" : "yellow";
  context.translate(point.x, point.y);
  context.beginPath();
  context.arc(0, 0, 3, 0, 2 * Math.PI);
  context.fill();
  context.restore();
}

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  distance(that) {
    return Math.sqrt((that.x - this.x)**2 + (that.y - this.y)**2);
  }

  containedIn(p1, p2) {
    return this.x >= p1.x && this.x <= p2.x && this.y >= p1.y && this.y <= p2.y;
  }
};

class BoundingBox {
  constructor(p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
  }

  contains(p) {
    return this.p1.x <= p.x && p.x <= this.p2.x && this.p1.y <= p.y && p.y <= this.p2.y;
  }

  /**
   * splits the bounding box into 4 euqal sub bounding boxes
   * @returns a list of the new bounding boxes
   */
  split() {
    const midX = (this.p2.x + this.p1.x) / 2;
    const midY = (this.p2.y + this.p1.y) / 2;
    const center = new Point(midX, midY);
    // left-to-right top-to-bottom
    const bb1 = new BoundingBox(this.p1, center)
    const bb2 = new BoundingBox(new Point(midX, this.p1.y),
                                new Point(this.p2.x, midY));
    const bb3 = new BoundingBox(new Point(this.p1.x, midY),
                                new Point(midX, this.p2.y));
    const bb4 = new BoundingBox(center, this.p2);
    return [bb1, bb2, bb3, bb4];
  };

  draw(context) {
    context.beginPath();
    context.rect(this.p1.x, this.p1.y, this.p2.x - this.p1.x, this.p2.y - this.p1.y);
    context.stroke();
  }
};

class ClassPoint extends Point {
  constructor(x, y, cls) {
    super(x, y);
    this.cls = cls;
  }
};

class Closest {
  constructor(point, d, c) {
    // the point we have
    this.point = point;
    // the distance it is
    this.d = d;
    // the class it is
    this.c = c;
  }

  compare(that) {
    if(this.d < that.d) {
      return -1;
    }
    if(this.d > that.d) {
      return 1;
    }
    return 0;
  }
};

const dist = (p1, p2) => {
  return Math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2);
}

// cs is a list of Closest, we want to potentially add point to it, so it is less than k
// and point is closer than the furthest point in cs
const addKClosest = (cs, point, k) => {
  if(cs.length < k) {
    cs.push(point)
  } else if (point.d < cs[cs.length - 1].d) {
    cs[cs.length - 1] = point;
    cs.sort((c1, c2) => c1.compare(c2));
  }
}

const constructQuadTrees = (points, bb) => {
  const boundingBoxes = bb.split();
  let splits = _.map(boundingBoxes, (b) => [b, []]);
  splits = _.reduce(points, (arr, p) => {
    for(let i = 0; i < arr.length; ++i) {
      let bbox, points;
      [bbox, points] = arr[i];
      if(bbox.contains(p)) {
        points.push(p);
        break;
      }
    }
    return arr;},
    splits);

    return _.map(splits, (split) => {
      return new QuadTree(split[1], split[0]);
    })
};

class QuadTree {
  constructor(points, bb) {
    this.points = points;
    this.bb = bb;
    if(this.points.length > 1) {
      this.children = constructQuadTrees(this.points, this.bb);

    } else {
      this.children = [];
    }
  }

  draw(context) {
    this.bb.draw(context);
    this.children.forEach((el) => el.draw(context));
  }
}

const knn = (x, points, k) => {
  let closest = [];               //the list of K-closest points
  points.forEach((point) => {
    const distance = point.distance(x);
    const c = new Closest(point, distance);
    addKClosest(closest, c, k);
  });

  return closest;
}

const classFromKnnDebug = (cosest) => {
  const count = _.countBy(cosest.map((x) => x.c));
  return _(count)
          .entries()
          .maxBy(_.last)[0];

}

const classFromKnn = (cosest) => {
  const count = _.countBy(cosest.map((x) => x.point.cls));
  return _(count)
          .entries()
          .maxBy(_.last)[0];

}

const classToColour = {"1": "red", "2": "green"}

const inBounds = (point, w, h) => {
  return point[0] >= 0 && point[0] < h && point[1] > 0 && point[1] < w;
}

const sketch = () => {
  return ({ context, width, height }) => {
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);

    const mean1 = [4 * width / 10, 4 * height / 10];
    const mean2 = [6 * width / 10, 6 * height / 10];
    const var1 = [[width/ 3, 1], [10, width/ 3]];
    const var2 = [[width/ 3, 1], [10, width/ 3]];

    const topLeft = new Point(0, 0);
    const bottomRight = new Point(width, height);
    const boundingBox = new BoundingBox(topLeft, bottomRight);
    let points = [];
    for(let i = 0; i < params.numPoints; ++i) {
      const point1 = generatePoints2D(width, height, mean1, var1);
      if(boundingBox.contains(point1)) {
        points.push(new ClassPoint(point1.x, point1.y, "1"));
      }
      const point2 = generatePoints2D(width, height, mean2, var2);
      if(boundingBox.contains(point2)) {
        points.push(new ClassPoint(point2.x, point2.y, "2"));
      }
    }

    const quadtree = new QuadTree(points, boundingBox);

    for(let k = params.k; k >= 1; k -= 2) {
      for(let i = 0; i < height; ++i) {
        for(let j = 0; j < width; ++j) {
          const point = new Point(i, j);
          const closest = knn(point, points, k);

          const cls = classFromKnn(closest);
          if(cls === "1") {
            context.save();
            context.globalAlpha = 2 * (1 / params.k);

            context.translate(i, j);
            context.fillStyle = classToColour[cls];
            context.beginPath();
            context.rect(0, 0, 1, 1);
            context.fill();
          }

          context.restore();
        }
      }
    }

    quadtree.draw(context);
    
    points.forEach((p) => {
      drawPoint(context, p);
    });
  };
};

canvasSketch(sketch, settings);
