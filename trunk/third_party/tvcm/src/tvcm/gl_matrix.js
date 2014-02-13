// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.requireRawScript('gl-matrix/common.js');
tvcm.requireRawScript('gl-matrix/mat2d.js');
tvcm.requireRawScript('gl-matrix/mat4.js');
tvcm.requireRawScript('gl-matrix/vec2.js');
tvcm.requireRawScript('gl-matrix/vec3.js');
tvcm.requireRawScript('gl-matrix/vec4.js');

tvcm.exportTo('tvcm', function() {
  var tmp_vec2 = vec2.create();
  var tmp_vec2b = vec2.create();
  var tmp_vec4 = vec4.create();
  var tmp_mat2d = mat2d.create();

  vec2.createFromArray = function(arr) {
    if (arr.length != 2)
      throw new Error('Should be length 2');
    var v = vec2.create();
    vec2.set(v, arr[0], arr[1]);
    return v;
  };

  vec2.createXY = function(x, y) {
    var v = vec2.create();
    vec2.set(v, x, y);
    return v;
  };

  vec2.toString = function(a) {
    return '[' + a[0] + ', ' + a[1] + ']';
  };

  vec2.addTwoScaledUnitVectors = function(out, u1, scale1, u2, scale2) {
    // out = u1 * scale1 + u2 * scale2
    vec2.scale(tmp_vec2, u1, scale1);
    vec2.scale(tmp_vec2b, u2, scale2);
    vec2.add(out, tmp_vec2, tmp_vec2b);
  }

  vec3.createXYZ = function(x, y, z) {
    var v = vec3.create();
    vec3.set(v, x, y, z);
    return v;
  };

  vec3.toString = function(a) {
    return 'vec3(' + a[0] + ', ' + a[1] + ', ' + a[2] + ')';
  }

  mat2d.translateXY = function(out, x, y) {
    vec2.set(tmp_vec2, x, y);
    mat2d.translate(out, out, tmp_vec2);
  }

  mat2d.scaleXY = function(out, x, y) {
    vec2.set(tmp_vec2, x, y);
    mat2d.scale(out, out, tmp_vec2);
  }

  vec4.unitize = function(out, a) {
    out[0] = a[0] / a[3];
    out[1] = a[1] / a[3];
    out[2] = a[2] / a[3];
    out[3] = 1;
    return out;
  }

  vec2.copyFromVec4 = function(out, a) {
    vec4.unitize(tmp_vec4, a);
    vec2.copy(out, tmp_vec4);
  }

  return {};
});
