// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('tracing.test_utils');
base.require('tracing.importer.linux_perf_importer');

base.unittest.testSuite('tracing.importer.linux_perf.sched_parser', function() {
  test('schedSwitchRE', function() {
    var re = tracing.importer.linux_perf._SchedParserTestExports.schedSwitchRE;
    var x = re.exec('prev_comm=swapper prev_pid=0 prev_prio=120 prev_state=R ' +
        '==> next_comm=SurfaceFlinger next_pid=178 next_prio=112');
    assertNotNull(x);
    assertEquals('swapper', x[1]);
    assertEquals('0', x[2]);
    assertEquals('120', x[3]);
    assertEquals('R', x[4]);
    assertEquals('SurfaceFlinger', x[5]);
    assertEquals('178', x[6]);
    assertEquals('112', x[7]);

    var x = re.exec('prev_comm=.android.chrome prev_pid=1562 prev_prio=120 prev_state=R ==> next_comm=Binder Thread # next_pid=195 next_prio=120'); // @suppress longLineCheck
    assertNotNull(x);
    assertEquals('.android.chrome', x[1]);
    assertEquals('Binder Thread #', x[5]);

    var x = re.exec('prev_comm=Binder Thread # prev_pid=1562 prev_prio=120 prev_state=R ==> next_comm=.android.chrome next_pid=195 next_prio=120'); // @suppress longLineCheck
    assertNotNull(x);
    assertEquals('Binder Thread #', x[1]);
    assertEquals('.android.chrome', x[5]);

    // explict test for prev_state of D|W
    var x = re.exec('prev_comm=.android.chrome prev_pid=1562 prev_prio=120 ' +
        'prev_state=D|W ==> next_comm=Binder Thread # next_pid=195 ' +
        'next_prio=120');
    assertNotNull(x);
    assertEquals('D|W', x[4]);
  });

  test('schedWakeupRE', function() {
    var re = tracing.importer.linux_perf._SchedParserTestExports.schedWakeupRE;
    var x = re.exec(
        'comm=SensorService pid=207 prio=112 success=1 target_cpu=000');
    assertNotNull(x);
    assertEquals('SensorService', x[1]);
    assertEquals('207', x[2]);
    assertEquals('112', x[3]);
    assertEquals('1', x[4]);
    assertEquals('000', x[5]);
  });

  test('importOneSequenceWithSchedWakeUp', function() {
    var lines = [
      'ndroid.launcher-584   [001] d..3 12622.506890: sched_switch: prev_comm=ndroid.launcher prev_pid=584 prev_prio=120 prev_state=R+ ==> next_comm=Binder_1 next_pid=217 next_prio=120', // @suppress longLineCheck
      '       Binder_1-217   [001] d..3 12622.506918: sched_switch: prev_comm=Binder_1 prev_pid=217 prev_prio=120 prev_state=D ==> next_comm=ndroid.launcher next_pid=584 next_prio=120', // @suppress longLineCheck
      'ndroid.launcher-584   [001] d..4 12622.506936: sched_wakeup: comm=Binder_1 pid=217 prio=120 success=1 target_cpu=001', // @suppress longLineCheck
      'ndroid.launcher-584   [001] d..3 12622.506950: sched_switch: prev_comm=ndroid.launcher prev_pid=584 prev_prio=120 prev_state=R+ ==> next_comm=Binder_1 next_pid=217 next_prio=120', // @suppress longLineCheck
      '       Binder_1-217   [001] ...1 12622.507057: tracing_mark_write: B|128|queueBuffer', // @suppress longLineCheck
      '       Binder_1-217   [001] ...1 12622.507175: tracing_mark_write: E',
      '       Binder_1-217   [001] d..3 12622.507253: sched_switch: prev_comm=Binder_1 prev_pid=217 prev_prio=120 prev_state=S ==> next_comm=ndroid.launcher next_pid=584 next_prio=120' // @suppress longLineCheck
    ];

    var m = new tracing.TraceModel(lines.join('\n'), false);
    assertFalse(m.hasImportWarnings);

    var thread = m.findAllThreadsNamed('Binder_1')[0];
    var timeSlices = thread.timeSlices;
    assertEquals(4, timeSlices.length);

    var runningSlice = timeSlices[0];
    assertEquals('Running', runningSlice.title);
    assertAlmostEquals(12622506.890, runningSlice.start);
    assertAlmostEquals(.918 - .890, runningSlice.duration);

    var sleepSlice = timeSlices[1];
    assertEquals('Uninterruptible Sleep', sleepSlice.title);
    assertAlmostEquals(12622506.918, sleepSlice.start);
    assertAlmostEquals(.936 - .918, sleepSlice.duration);

    var wakeupSlice = timeSlices[2];
    assertEquals('Runnable', wakeupSlice.title);
    assertAlmostEquals(12622506.936, wakeupSlice.start);
    assertAlmostEquals(.950 - .936, wakeupSlice.duration);
    assertEquals(584, wakeupSlice.args['wakeup from tid']);

    var runningSlice2 = timeSlices[3];
    assertEquals('Running', runningSlice2.title);
    assertAlmostEquals(12622506.950, runningSlice2.start);
    assertAlmostEquals(7.253 - 6.950, runningSlice2.duration);
  });

  test('importWithUnknownSleepState', function() {
    var lines = [
      'ndroid.launcher-584   [001] d..3 12622.506890: sched_switch: prev_comm=ndroid.launcher prev_pid=584 prev_prio=120 prev_state=R+ ==> next_comm=Binder_1 next_pid=217 next_prio=120', // @suppress longLineCheck
      '       Binder_1-217   [001] d..3 12622.506918: sched_switch: prev_comm=Binder_1 prev_pid=217 prev_prio=120 prev_state=F|O ==> next_comm=ndroid.launcher next_pid=584 next_prio=120', // @suppress longLineCheck
      'ndroid.launcher-584   [001] d..4 12622.506936: sched_wakeup: comm=Binder_1 pid=217 prio=120 success=1 target_cpu=001', // @suppress longLineCheck
      'ndroid.launcher-584   [001] d..3 12622.506950: sched_switch: prev_comm=ndroid.launcher prev_pid=584 prev_prio=120 prev_state=R+ ==> next_comm=Binder_1 next_pid=217 next_prio=120', // @suppress longLineCheck
      '       Binder_1-217   [001] ...1 12622.507057: tracing_mark_write: B|128|queueBuffer', // @suppress longLineCheck
      '       Binder_1-217   [001] ...1 12622.507175: tracing_mark_write: E',
      '       Binder_1-217   [001] d..3 12622.507253: sched_switch: prev_comm=Binder_1 prev_pid=217 prev_prio=120 prev_state=F|O ==> next_comm=ndroid.launcher next_pid=584 next_prio=120' // @suppress longLineCheck
    ];

    var m;
    assertDoesNotThrow(function() {
      m = new tracing.TraceModel(lines.join('\n'), false);
    });
    assertTrue(m.hasImportWarnings);
    assertEquals('Unrecognized sleep state: F|O', m.importWarnings[0].message);

    var thread = m.findAllThreadsNamed('Binder_1')[0];
    var timeSlices = thread.timeSlices;

    assertEquals('UNKNOWN', timeSlices[1].title);
  });

  test('importWithUninterruptibleSleep', function() {
    var lines = [
      'ndroid.launcher-584   [001] d..3 12622.506890: sched_switch: ' +
          'prev_comm=ndroid.launcher prev_pid=584 ' +
          'prev_prio=120 prev_state=R+ ' +
          '==> next_comm=Binder_1 next_pid=217 next_prio=120',

      '       Binder_1-217   [001] d..3 12622.506918: sched_switch: ' +
          'prev_comm=Binder_1 prev_pid=217 prev_prio=120 prev_state=D|K ' +
          '==> next_comm=ndroid.launcher next_pid=584 next_prio=120',

      'ndroid.launcher-584   [001] d..4 12622.506936: sched_wakeup: ' +
          'comm=Binder_1 pid=217 prio=120 success=1 target_cpu=001',

      'ndroid.launcher-584   [001] d..3 12622.506950: sched_switch: ' +
          'prev_comm=ndroid.launcher prev_pid=584 ' +
          'prev_prio=120 prev_state=R+ ' +
          '==> next_comm=Binder_1 next_pid=217 next_prio=120',

      '       Binder_1-217   [001] ...1 12622.507057: tracing_mark_write: ' +
          'B|128|queueBuffer',

      '       Binder_1-217   [001] ...1 12622.507175: tracing_mark_write: E',

      '       Binder_1-217   [001] d..3 12622.507253: sched_switch: ' +
          'prev_comm=Binder_1 prev_pid=217 prev_prio=120 prev_state=S ' +
          '==> next_comm=ndroid.launcher next_pid=584 next_prio=120'
    ];

    var m = new tracing.TraceModel(lines.join('\n'), false);
    assertFalse(m.hasImportWarnings);

    var thread = m.findAllThreadsNamed('Binder_1')[0];
    var timeSlices = thread.timeSlices;
    assertEquals(4, timeSlices.length);

    var wakeKillSlice = timeSlices[1];
    assertEquals('Uninterruptible Sleep | WakeKill', wakeKillSlice.title);
    assertAlmostEquals(12622506.918, wakeKillSlice.start);
    assertAlmostEquals(.936 - .918, wakeKillSlice.duration);
  });
});
