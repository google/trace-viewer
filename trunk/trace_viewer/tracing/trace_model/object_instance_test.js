// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tracing.test_utils');
tvcm.require('tracing.trace_model.object_instance');

tvcm.unittest.testSuite('tracing.trace_model.object_instance_test', function() {
  test('getSnapshotAtWithImplicitCreation', function() {
    var instance = new tracing.trace_model.ObjectInstance(
        {}, '0x1000', 'cat', 'n', 10);
    var s10 = instance.addSnapshot(10, 'a');
    instance.addSnapshot(40, 'b');
    instance.wasDeleted(60);

    var s1 = instance.getSnapshotAt(1);
    assertEquals(s10, s1);

    var s10 = instance.getSnapshotAt(10);
    assertEquals('a', s10.args);
    assertEquals(s10, instance.getSnapshotAt(15));

    var s40 = instance.getSnapshotAt(40);
    assertEquals('b', s40.args);
    assertEquals(s40, instance.getSnapshotAt(50));
    assertEquals(s40, instance.getSnapshotAt(59.9));
  });

  test('getSnapshotAtWithExplicitCreation', function() {
    var instance = new tracing.trace_model.ObjectInstance(
        {}, '0x1000', 'cat', 'n', 10);
    instance.creationTsWasExplicit = true;
    instance.addSnapshot(10, 'a');
    instance.wasDeleted(60);

    assertThrows(function() {
      instance.getSnapshotAt(1);
    });

    var s10 = instance.getSnapshotAt(10);
    assertEquals('a', s10.args);
    assertEquals(s10, instance.getSnapshotAt(15));
  });

  test('getSnapshotBeforeFirstSnapshot', function() {
    var instance = new tracing.trace_model.ObjectInstance(
        {}, '0x1000', 'cat', 'n', 10);
    var s15 = instance.addSnapshot(15, 'a');
    instance.wasDeleted(40);

    assertEquals(s15, instance.getSnapshotAt(10));
  });

  test('getSnapshotAfterLastSnapshot', function() {
    var instance = new tracing.trace_model.ObjectInstance(
        {}, '0x1000', 'cat', 'n', 10);
    var s15 = instance.addSnapshot(15, 'a');
    instance.wasDeleted(40);

    assertEquals(s15, instance.getSnapshotAt(20));
  });
});
