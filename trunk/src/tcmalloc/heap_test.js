// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tcmalloc.heap');

tvcm.unittest.testSuite('tcmalloc.heap_test', function() {
  var HeapSnapshot = tcmalloc.HeapSnapshot;

  // Tests total allocation count.
  test('totals', function() {
    var snapshot = new HeapSnapshot({}, 1, [
      {
        'current_allocs': 10,
        'total_allocs': 100,
        'current_bytes': 10000,
        'trace': '',
        'total_bytes': 100000
      },
      {
        'current_allocs': 2,
        'total_allocs': 22,
        'current_bytes': 200,
        'trace': 'TestObject::TestMethod ',
        'total_bytes': 2200
      }
    ]);
    snapshot.preInitialize();
    snapshot.initialize();

    // Base class got the timestamp.
    assertEquals(1, snapshot.ts);

    // The first entry in the list is for totals.
    assertEquals(10, snapshot.total_.currentAllocs);
    assertEquals(10000, snapshot.total_.currentBytes);
  });

  // Tests multi-level trace stacks.
  test('multiLevel', function() {
    var snapshot = new HeapSnapshot({}, 1, [
      {
        'current_allocs': 10,
        'total_allocs': 100,
        'current_bytes': 10000,
        'trace': '',
        'total_bytes': 100000
      },
      {
        'current_allocs': 2,
        'total_allocs': 22,
        'current_bytes': 200,
        'trace': 'TestObject::TestMethod ',
        'total_bytes': 2200
      },
      {
        'current_allocs': 3,
        'total_allocs': 33,
        'current_bytes': 300,
        'trace': 'TestObject2::TestMethod2  ',
        'total_bytes': 3300
      },
      {
        'current_allocs': 5,
        'total_allocs': 55,
        'current_bytes': 500,
        'trace': 'TestObject2::TestMethod2 TestObject3::TestMethod3 ',
        'total_bytes': 5500
      }
    ]);
    snapshot.preInitialize();
    snapshot.initialize();

    // Our heap has two top-level stacks.
    var heap = snapshot.heap_;
    var childKeys = Object.keys(heap.children);
    assertEquals(2, childKeys.length);
    // Both methods exist as children.
    assertNotEquals(-1, childKeys.indexOf('TestObject::TestMethod'));
    assertNotEquals(-1, childKeys.indexOf('TestObject2::TestMethod2'));

    // Verify the first trace entry stack.
    var trace = heap.children['TestObject::TestMethod'];
    assertEquals(2, trace.currentAllocs);
    assertEquals(200, trace.currentBytes);
    // One child for "(here)".
    assertEquals(1, Object.keys(trace.children).length);
    assertNotNull(trace.children['(here)']);

    // Verify the second trace entry stack.
    trace = heap.children['TestObject2::TestMethod2'];
    // Memory should have summed up.
    assertEquals(8, trace.currentAllocs);
    assertEquals(800, trace.currentBytes);
    // Two children, "(here)" and another stack.
    assertEquals(2, Object.keys(trace.children).length);
    assertNotNull(trace.children['TestObject3::TestMethod3']);
    assertNotNull(trace.children['(here)']);

    trace = trace.children['TestObject3::TestMethod3'];
    assertEquals(5, trace.currentAllocs);
    assertEquals(500, trace.currentBytes);
    assertEquals(1, Object.keys(trace.children).length);
  });
});
