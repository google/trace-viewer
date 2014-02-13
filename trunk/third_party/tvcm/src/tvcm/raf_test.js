// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.raf');

tvcm.unittest.testSuite('tvcm.raf_test', function() {
  var fakeNow = undefined;
  function withFakeWindowPerformanceNow(func) {
    var oldNow = window.performance.now;
    try {
      window.performance.now = function() { return fakeNow; };
      func();
    } finally {
      window.performance.now = oldNow;
    }
  }

  test('runIdleTaskWhileIdle', function() {
    withFakeWindowPerformanceNow(function() {
      tvcm.forcePendingRAFTasksToRun(100000);  // Clear current RAF task queue.

      var rafRan = false;
      tvcm.requestAnimationFrame(function() {
        rafRan = true;
      });
      var idleRan = false;
      tvcm.requestIdleCallback(function() {
        idleRan = true;
      });
      fakeNow = 0;
      tvcm.forcePendingRAFTasksToRun(fakeNow);
      assertFalse(idleRan);
      assertTrue(rafRan);
      tvcm.forcePendingRAFTasksToRun(fakeNow);
      assertTrue(idleRan);
    });
  });

  test('twoShortIdleCallbacks', function() {
    withFakeWindowPerformanceNow(function() {
      tvcm.forcePendingRAFTasksToRun(100000);  // Clear current RAF task queue.

      var idle1Ran = false;
      var idle2Ran = false;
      tvcm.requestIdleCallback(function() {
        fakeNow += 1;
        idle1Ran = true;
      });
      tvcm.requestIdleCallback(function() {
        fakeNow += 1;
        idle2Ran = true;
      });
      fakeNow = 0;
      tvcm.forcePendingRAFTasksToRun(fakeNow);
      assertTrue(idle1Ran);
      assertTrue(idle2Ran);
    });
  });


  test('oneLongOneShortIdleCallback', function() {
    withFakeWindowPerformanceNow(function() {
      tvcm.forcePendingRAFTasksToRun(100000);  // Clear current RAF task queue.

      var idle1Ran = false;
      var idle2Ran = false;
      tvcm.requestIdleCallback(function() {
        fakeNow += 100;
        idle1Ran = true;
      });
      tvcm.requestIdleCallback(function() {
        fakeNow += 1;
        idle2Ran = true;
      });
      fakeNow = 0;
      tvcm.forcePendingRAFTasksToRun(fakeNow);
      assertTrue(idle1Ran);
      assertFalse(idle2Ran);

      // Reset idle1Ran to verify that it dosn't run again.
      idle1Ran = false;

      // Now run. idle2 should now run.
      tvcm.forcePendingRAFTasksToRun(fakeNow);
      assertFalse(idle1Ran);
      assertTrue(idle2Ran);
    });
  });

  test('buggyPerformanceNowDoesNotBlockIdleTasks', function() {
    withFakeWindowPerformanceNow(function() {
      tvcm.forcePendingRAFTasksToRun();  // Clear current RAF task queue.

      var idle1Ran = false;
      var idle2Ran = false;
      tvcm.requestIdleCallback(function() {
        fakeNow += 100;
        idle1Ran = true;
      });
      tvcm.requestIdleCallback(function() {
        fakeNow += 1;
        idle2Ran = true;
      });
      fakeNow = 10000;
      tvcm.forcePendingRAFTasksToRun(0);
      assertTrue(idle1Ran);
      assertFalse(idle2Ran);

      // Reset idle1Ran to verify that it dosn't run again.
      idle1Ran = false;

      // Now run. idle2 should now run.
      tvcm.forcePendingRAFTasksToRun(0);
      assertFalse(idle1Ran);
      assertTrue(idle2Ran);
    });
  });

});
