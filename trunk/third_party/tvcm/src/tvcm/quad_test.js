// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.quad');
tvcm.require('tvcm.rect');

tvcm.unittest.testSuite('tvcm.quad_test', function() {
  test('pointInTri', function() {
    var res = tvcm.pointInTriangle2(
        [0.25, 0.25],
        [0, 0],
        [1, 0],
        [0, 1]);
    assertTrue(res);
  });

  test('pointNotInTri', function() {
    var res = tvcm.pointInTriangle2(
        [0.75, 0.75],
        [0, 0],
        [1, 0],
        [0, 1]);
    assertFalse(res);
  });

  test('pointInside', function() {
    var q = tvcm.Quad.from4Vecs([0, 0],
                                [1, 0],
                                [1, 1],
                                [0, 1]);
    var res = q.pointInside([0.5, 0.5]);
    assertTrue(res);
  });

  test('pointNotInQuad', function() {
    var q = tvcm.Quad.from4Vecs([0, 0],
                                [1, 0],
                                [1, 1],
                                [0, 1]);
    var res = q.pointInside([1.5, 0.5]);
    assertFalse(res);
  });

  test('isRectangle', function() {
    assertTrue(tvcm.Quad.fromXYWH(0, 0, 10, 10).isRectangle());
    assertTrue(tvcm.Quad.fromXYWH(-10, -10, 5, 5).isRectangle());
    assertTrue(tvcm.Quad.fromXYWH(-10, -10, 20, 20).isRectangle());
    assertTrue(tvcm.Quad.fromXYWH(-10, 10, 5, 5).isRectangle());

    assertFalse(tvcm.Quad.fromXYWH(0, 0, -10, -10).isRectangle());
    assertFalse(tvcm.Quad.from8Array([0, 1, 2, 3, 4, 5, 6, 7]).isRectangle());
    assertFalse(tvcm.Quad.from8Array([0, 0, 0, 5, 5, 5, 0, 0]).isRectangle());
  });

  test('projectUnitRect', function() {
    var container = tvcm.Quad.fromXYWH(0, 0, 10, 10);
    var srcRect = tvcm.Rect.fromXYWH(0.1, 0.8, 0.8, 0.1);
    var expectedRect = srcRect.scale(10);

    var q = new tvcm.Quad();
    container.projectUnitRectFast(q, srcRect);

    assertQuadEquals(tvcm.Quad.fromRect(expectedRect), q);
  });

  test('projectUnitRectOntoUnitQuad', function() {
    var container = tvcm.Quad.fromXYWH(0, 0, 1, 1);
    var srcRect = tvcm.Rect.fromXYWH(0.0, 0, 1, 1);
    var expectedRect = srcRect;

    var q = new tvcm.Quad();
    container.projectUnitRectFast(q, srcRect);

    assertQuadEquals(tvcm.Quad.fromRect(expectedRect), q);
  });

  test('projectUnitRectOntoSizeTwoQuad', function() {
    var container = tvcm.Quad.fromXYWH(0, 0, 2, 2);
    var srcRect = tvcm.Rect.fromXYWH(0.0, 0, 1, 1);
    var expectedRect = srcRect.scale(2);

    var q = new tvcm.Quad();
    container.projectUnitRectFast(q, srcRect);

    assertQuadEquals(tvcm.Quad.fromRect(expectedRect), q);
  });

  test('projectUnitRectOntoTranslatedQuad', function() {
    var container = tvcm.Quad.fromXYWH(1, 1, 1, 1);
    var srcRect = tvcm.Rect.fromXYWH(0.0, 0, 1, 1);
    var expectedRect = srcRect.translate([1, 1]);

    var q = new tvcm.Quad();
    container.projectUnitRectFast(q, srcRect);

    assertQuadEquals(tvcm.Quad.fromRect(expectedRect), q);
  });

  test('projectShrunkUnitRectOntoUnitQuad', function() {
    var container = tvcm.Quad.fromXYWH(0, 0, 1, 1);
    var srcRect = tvcm.Rect.fromXYWH(0.1, 0.1, 0.8, 0.8);
    var expectedRect = srcRect;

    var q = new tvcm.Quad();
    container.projectUnitRectFast(q, srcRect);

    assertQuadEquals(tvcm.Quad.fromRect(expectedRect), q);
  });
});
