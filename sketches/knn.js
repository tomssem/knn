const canvasSketch = require('canvas-sketch');
import {random} from "canvas-sketch-util"
import math from "canvas-sketch-util/math";
const _ = require("lodash");

const settings = {
  dimensions: [ 1080 / 5, 1080 / 5 ]
};

const params = {
  numPoints: 100,
  k: 31
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

  return addV(mean, dotLT(variance, [z0, z1]));
};

const drawPoint = (context, point, colour) => {
  context.save();
  context.fillStyle = colour;
  context.translate(point[0], point[1]);
  context.beginPath();
  context.arc(0, 0, 5, 0, 2 * Math.PI);
  context.fill();
  context.restore();
}

class Closest {
  constructor(p, d, c) {
    // the point we have
    this.p = p;
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

// cs is a list of Closest, we want to potentially add p to it, so it is less than k
// and p is closer than the furthest point in cs
const addKClosest = (cs, p, k) => {
  if(cs.length < k) {
    cs.push(p)
  } else if (p.d < cs[cs.length - 1].d) {
    cs[cs.length - 1] = p;
    cs.sort((c1, c2) => c1.compare(c2));
  }
}

const knn = (x, points, k, cls, closest) => {
  if(closest === undefined) {
    closest = [];               //the list of K-closest points
  }
  points.forEach((p) => {
    const distance = dist(p, x);
    const c = new Closest(p, distance, cls);
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
  const count = _.countBy(cosest.map((x) => x.c));
  return _(count)
          .entries()
          .maxBy(_.last)[0];

}

const classToColour = {"1": "red", "2": "red"}

const inBounds = (p, w, h) => {
  return p[0] >= 0 && p[0] < h && p[1] > 0 && p[1] < w;
}

const sketch = () => {
  return ({ context, width, height }) => {
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);

    const mean1 = [4 * width / 10, 4 * height / 10];
    const mean2 = [6 * width / 10, 6 * height / 10];
    const var1 = [[width/ 3, 1], [10, width/ 3]];
    const var2 = [[width/ 3, 1], [10, width/ 3]];

    let points1 = [];
    let points2 = [];
    for(let i = 0; i < params.numPoints; ++i) {
      const point1 = generatePoints2D(width, height, mean1, var1);
      if(inBounds(point1, width, height)) {
        points1.push(point1);
      }
      const point2 = generatePoints2D(width, height, mean2, var2);
      if(inBounds(point2, width, height)) {
        points2.push(point2);
      }
    }

    for(let k = params.k; k >= 1; k -= 2) {
      console.log(k);
      for(let i = 0; i < height; ++i) {
        for(let j = 0; j < width; ++j) {
          let closest = [];
          closest = knn([i, j], points2, k, 2, closest);
          closest = knn([i, j], points1, k, 1, closest);

          const cls = classFromKnn(closest);
          if(cls === "1") {
            context.save();
            context.globalAlpha = 2 * (1 / params.k);

            context.translate(i, j);
            context.fillStyle = classToColour[cls];
            context.beginPath();
            context.rect(0, 0, 1, 1);
            context.fill();

            context.restore();
          }
        }
      }
    }

    points1.forEach((p) => {
      // drawPoint(context, p, "red");
    });
    points2.forEach((p) => {
      // drawPoint(context, p, "green");
    });
  };
};

canvasSketch(sketch, settings);
