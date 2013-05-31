// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('base.gl_matrix');

base.exportTo('base', function() {
  var tmpVec2s = [];
  for (var i = 0; i < 8; i++)
    tmpVec2s[i] = vec2.create();

  var tmpVec2a = vec4.create();
  var tmpVec4a = vec4.create();
  var tmpVec4b = vec4.create();
  var tmpMat4 = mat4.create();
  var tmpMat4b = mat4.create();

  var p00 = vec2.createXY(0, 0);
  var p10 = vec2.createXY(1, 0);
  var p01 = vec2.createXY(0, 1);
  var p11 = vec2.createXY(1, 1);

  var lerpingVecA = vec2.create();
  var lerpingVecB = vec2.create();
  function lerpVec2(out, a, b, amt) {
    vec2.scale(lerpingVecA, a, amt);
    vec2.scale(lerpingVecB, b, 1 - amt);
    vec2.add(out, lerpingVecA, lerpingVecB);
    vec2.normalize(out, out);
    return out;
  }

  /**
   * @constructor
   */
  function Quad() {
    this.p1 = vec2.create();
    this.p2 = vec2.create();
    this.p3 = vec2.create();
    this.p4 = vec2.create();
  }

  Quad.FromXYWH = function(x, y, w, h) {
    var q = new Quad();
    vec2.set(q.p1, x, y);
    vec2.set(q.p2, x + w, y);
    vec2.set(q.p3, x + w, y + h);
    vec2.set(q.p4, x, y + h);
    return q;
  }

  Quad.FromRect = function(r) {
    return new Quad.FromXYWH(
        r.x, r.y,
        r.width, r.height);
  }

  Quad.From4Vecs = function(p1, p2, p3, p4) {
    var q = new Quad();
    vec2.set(q.p1, p1[0], p1[1]);
    vec2.set(q.p2, p2[0], p2[1]);
    vec2.set(q.p3, p3[0], p3[1]);
    vec2.set(q.p4, p4[0], p4[1]);
    return q;
  }

  Quad.From8Array = function(arr) {
    if (arr.length != 8)
      throw new Error('Array must be 8 long');
    var q = new Quad();
    q.p1[0] = arr[0];
    q.p1[1] = arr[1];
    q.p2[0] = arr[2];
    q.p2[1] = arr[3];
    q.p3[0] = arr[4];
    q.p3[1] = arr[5];
    q.p4[0] = arr[6];
    q.p4[1] = arr[7];
    return q;
  };

  Quad.prototype = {
    vecInside: function(vec) {
      return vecInTriangle2(vec, this.p1, this.p2, this.p3) ||
          vecInTriangle2(vec, this.p1, this.p3, this.p4);
    },

    boundingRect: function() {
      var x0 = Math.min(this.p1[0], this.p2[0], this.p3[0], this.p4[0]);
      var y0 = Math.min(this.p1[1], this.p2[1], this.p3[1], this.p4[1]);

      var x1 = Math.max(this.p1[0], this.p2[0], this.p3[0], this.p4[0]);
      var y1 = Math.max(this.p1[1], this.p2[1], this.p3[1], this.p4[1]);

      return new base.Rect.FromXYWH(x0, y0, x1 - x0, y1 - y0);
    },

    clone: function() {
      var q = new Quad();
      vec2.copy(q.p1, this.p1);
      vec2.copy(q.p2, this.p2);
      vec2.copy(q.p3, this.p3);
      vec2.copy(q.p4, this.p4);
      return q;
    },

    scale: function(s) {
      var q = new Quad();
      this.scaleFast(q, s);
      return q;
    },

    scaleFast: function(dstQuad, s) {
      vec2.copy(dstQuad.p1, this.p1, s);
      vec2.copy(dstQuad.p2, this.p2, s);
      vec2.copy(dstQuad.p3, this.p3, s);
      vec2.copy(dstQuad.p3, this.p3, s);
    },

    isRectangle: function() {
      // Simple rectangle check. Note: will not handle out-of-order components.
      var bounds = this.boundingRect();
      return (
          bounds.x == this.p1[0] &&
          bounds.y == this.p1[1] &&
          bounds.width == this.p2[0] - this.p1[0] &&
          bounds.y == this.p2[1] &&
          bounds.width == this.p3[0] - this.p1[0] &&
          bounds.height == this.p3[1] - this.p2[1] &&
          bounds.x == this.p4[0] &&
          bounds.height == this.p4[1] - this.p2[1]
      );
    },

    projectUnitRect: function(rect) {
      var q = new Quad();
      this.projectUnitRectFast(q, rect);
      return q;
    },

    projectUnitRectFast: function(dstQuad, rect) {
      var v12 = tmpVec2s[0];
      var v14 = tmpVec2s[1];
      var v23 = tmpVec2s[2];
      var v43 = tmpVec2s[3];
      var l12, l14, l23, l43;

      vec2.sub(v12, this.p2, this.p1);
      l12 = vec2.length(v12);
      vec2.scale(v12, v12, 1 / l12);

      vec2.sub(v14, this.p4, this.p1);
      l14 = vec2.length(v14);
      vec2.scale(v14, v14, 1 / l14);

      vec2.sub(v23, this.p3, this.p2);
      l23 = vec2.length(v23);
      vec2.scale(v23, v23, 1 / l23);

      vec2.sub(v43, this.p3, this.p4);
      l43 = vec2.length(v43);
      vec2.scale(v43, v43, 1 / l43);

      var b12 = tmpVec2s[0];
      var b14 = tmpVec2s[1];
      var b23 = tmpVec2s[2];
      var b43 = tmpVec2s[3];
      lerpVec2(b12, v12, v43, rect.y);
      lerpVec2(b43, v12, v43, 1 - rect.bottom);
      lerpVec2(b14, v14, v23, rect.x);
      lerpVec2(b23, v14, v23, 1 - rect.right);

      vec2.addTwoScaledUnitVectors(tmpVec2a,
                                   b12, l12 * rect.x,
                                   b14, l14 * rect.y);
      vec2.add(dstQuad.p1, this.p1, tmpVec2a);

      vec2.addTwoScaledUnitVectors(tmpVec2a,
                                   b12, l12 * -(1.0 - rect.right),
                                   b23, l23 * rect.y);
      vec2.add(dstQuad.p2, this.p2, tmpVec2a);


      vec2.addTwoScaledUnitVectors(tmpVec2a,
                                   b43, l43 * -(1.0 - rect.right),
                                   b23, l23 * -(1.0 - rect.bottom));
      vec2.add(dstQuad.p3, this.p3, tmpVec2a);

      vec2.addTwoScaledUnitVectors(tmpVec2a,
                                   b43, l43 * rect.left,
                                   b14, l14 * -(1.0 - rect.bottom));
      vec2.add(dstQuad.p4, this.p4, tmpVec2a);
    },

    toString: function() {
      return 'Quad(' +
          vec2.toString(this.p1) + ', ' +
          vec2.toString(this.p2) + ', ' +
          vec2.toString(this.p3) + ', ' +
          vec2.toString(this.p4) + ')';
    }
  };

  function sign(p1, p2, p3) {
    return (p1[0] - p3[0]) * (p2[1] - p3[1]) -
        (p2[0] - p3[0]) * (p1[1] - p3[1]);
  }

  function vecInTriangle2(pt, p1, p2, p3) {
    var b1 = sign(pt, p1, p2) < 0.0;
    var b2 = sign(pt, p2, p3) < 0.0;
    var b3 = sign(pt, p3, p1) < 0.0;
    return ((b1 == b2) && (b2 == b3));
  }

  return {
    vecInTriangle2: vecInTriangle2,
    Quad: Quad
  };
});
