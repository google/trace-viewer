// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tracing.timing_tool');

tvcm.unittest.testSuite('tracing.timing_tool_test', function() {
  function create100PxWideViewportInto10WideWorld() {
    var vp = new tracing.TimelineViewport(document.createElement('div'));
    var tempDisplayTransform = new tracing.TimelineDisplayTransform();
    tempDisplayTransform.xSetWorldBounds(0, 10, 100);
    vp.setDisplayTransformImmediately(tempDisplayTransform);

    assertEquals(0, vp.currentDisplayTransform.xViewToWorld(0));
    assertEquals(10, vp.currentDisplayTransform.xViewToWorld(100));

    return vp;
  }

  test('dragLeftInterestRegion', function() {
    var vp = create100PxWideViewportInto10WideWorld();
    vp.interestRange.min = 1;
    vp.interestRange.max = 9;
    var tool = new tracing.TimingTool(vp);

    tool.mouseDownAt_(1.1, 0);
    assertTrue(vp.interestRange.leftSelected);
    tool.mouseMoveAt_(1.5, 0, true);
    assertEquals(1.5, vp.interestRange.min);
    tool.mouseUp_();
    assertEquals(1.5, vp.interestRange.min);
    assertFalse(vp.interestRange.leftSelected);
  });

  test('dragRightInterestRegion', function() {
    var vp = create100PxWideViewportInto10WideWorld();
    vp.interestRange.min = 1;
    vp.interestRange.max = 9;
    var tool = new tracing.TimingTool(vp);

    tool.mouseDownAt_(9.1, 0);
    assertTrue(vp.interestRange.rightSelected);
    tool.mouseMoveAt_(8, 0, true);
    assertEquals(8, vp.interestRange.max);
    tool.mouseUp_();
    assertEquals(8, vp.interestRange.max);
    assertFalse(vp.interestRange.leftSelected);
  });

  test('dragInNewSpace', function() {
    var vp = create100PxWideViewportInto10WideWorld();
    vp.interestRange.min = 1;
    vp.interestRange.max = 9;
    var tool = new tracing.TimingTool(vp);

    tool.mouseDownAt_(5, 0);
    assertTrue(vp.interestRange.rightSelected);
    assertEquals(5, vp.interestRange.min);
    assertEquals(5, vp.interestRange.max);
    tool.mouseMoveAt_(4, 0, true);
    assertEquals(4, vp.interestRange.min);
    assertEquals(5, vp.interestRange.max);
    assertTrue(vp.interestRange.leftSelected);
    tool.mouseUp_();
    assertEquals(4, vp.interestRange.min);
    assertFalse(vp.interestRange.leftSelected);
    assertFalse(vp.interestRange.rightSelected);
  });
});
