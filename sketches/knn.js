const canvasSketch = require('canvas-sketch');
import {random} from "canvas-sketch-util"
import math from "canvas-sketch-util/math";
import { convertToSVGPath } from "canvas-sketch-util/penplot";
const cholesky = require('cholesky')

const settings = {
  dimensions: [ 1080 / 3, 1080 / 3 ]
};

const params = {
  numPoints: 50,
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

const generatePoints2D = (width, height, variance) => {
  const transform = (u1, u2, trigFunc) => {
    return Math.sqrt(-2 * Math.log(u1)) * trigFunc(2 * Math.PI * u2);
  }
  const r1 = Math.random();
  const r2 = Math.random();

  const z0 = transform(r1, r2, Math.cos);
  const z1 = transform(r1, r2, Math.sin);

  const L = cholesky(variance);

  return dotLT(variance, [z0, z1]);
};

const drawPoint = (context, point, mean, colour) => {
  context.save();
  context.fillStyle = colour;
  context.translate(mean[0], mean[1]);
  context.translate(point[0], point[1]);
  context.beginPath();
  context.arc(0, 0, 10, 0, 2 * Math.PI);
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
    this.class = c;
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
  return Math.sqrt((p1[0] - p2[0])**2 + (p1[0] - p2[0]));
}

// cs is a list of Closest, we want to potentially add p to it, so it is less than k
// and p is closer than the furthest point in cs
const addKClosest = (cs, p, k) => {
  if(cs.length < k) {
    cs.push(p)
  } else if (p.distance < cs[cs.length - 1]) {
    cs[cs.length - 1] = p;

    cs.sort((c1, c2) => c1.compare(c2));
  }
}

const knn = (x, points, k) => {
  let closest = [];
  points.forEach((p) => {
    const distance = dist(p, x);

  });
}

const sketch = () => {
  return ({ context, width, height }) => {
    context.fillStyle = 'white';
    context.fillRect(0, 0, width, height);

    const mean1 = [width / 3, height / 3];
    const mean2 = [2 * width / 3, 2 * height / 3];

    let points1 = [];
    let points2 = [];
    for(let i = 0; i < params.numPoints; ++i) {
      points1.push(generatePoints2D(width, height, [[100, 1], [10, 100]]));
      points2.push(generatePoints2D(width, height, [[100, 1], [10, 100]]));
    }

    points1.forEach((p) => {
      drawPoint(context, p, mean1, "red");
    });
    points2.forEach((p) => {
      drawPoint(context, p, mean2, "green");
    });
  };
};

canvasSketch(sketch, settings);
