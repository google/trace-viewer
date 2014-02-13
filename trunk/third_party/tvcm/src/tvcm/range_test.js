// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.range');

tvcm.unittest.testSuite('tvcm.range_test', function() {
  test('addValue', function() {
    var range = new tvcm.Range();
    assertTrue(range.isEmpty);
    range.addValue(1);
    assertFalse(range.isEmpty);
    assertEquals(range.min, 1);
    assertEquals(range.max, 1);

    range.addValue(2);
    assertFalse(range.isEmpty);
    assertEquals(range.min, 1);
    assertEquals(range.max, 2);
  });

  test('addNonEmptyRange', function() {
    var r1 = new tvcm.Range();
    r1.addValue(1);
    r1.addValue(2);

    var r = new tvcm.Range();
    r.addRange(r1);
    assertEquals(r.min, 1);
    assertEquals(r.max, 2);
  });

  test('addEmptyRange', function() {
    var r1 = new tvcm.Range();

    var r = new tvcm.Range();
    r.addRange(r1);
    assertTrue(r.isEmpty);
    assertEquals(r.min, undefined);
    assertEquals(r.max, undefined);
  });

  test('addRangeToRange', function() {
    var r1 = new tvcm.Range();
    r1.addValue(1);
    r1.addValue(2);

    var r = new tvcm.Range();
    r.addValue(3);
    r.addRange(r1);

    assertFalse(r.isEmpty);
    assertEquals(r.min, 1);
    assertEquals(r.max, 3);
  });
});
