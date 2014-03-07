// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tracing.test_utils');
tvcm.require('tracing.importer.linux_perf_importer');

tvcm.unittest.testSuite('tracing.importer.linux_perf.gesture_parser_test',
                        function() {
      test('gestureImport', function() {
        var lines = [
          '<...>-1837  [000] ...1 875292.741648: tracing_mark_write: ' +
              'log: start: TimerLogOutputs',  // 0
          '<...>-1837  [000] ...1 875292.741651: tracing_mark_write: ' +
              'log: end: TimerLogOutputs',
          '<...>-1837  [000] ...1 875292.742796: tracing_mark_write: ' +
              'log: start: LogTimerCallback',
          '<...>-1837  [000] ...1 875292.742802: tracing_mark_write: ' +
              'log: end: LogTimerCallback',
          '<...>-1837  [000] ...1 875292.742805: tracing_mark_write: ' +
              'HandleTimer: start: LoggingFilterInterpreter',  // 2
          '<...>-1837  [000] ...1 875292.742809: tracing_mark_write: ' +
              'HandleTimer: start: AppleTrackpadFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742814: tracing_mark_write: ' +
              'HandleTimer: start: Cr48ProfileSensorFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742818: tracing_mark_write: ' +
              'HandleTimer: start: T5R2CorrectingFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742822: tracing_mark_write: ' +
              'HandleTimer: start: StuckButtonInhibitorFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742825: tracing_mark_write: ' +
              'HandleTimer: start: IntegralGestureFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742829: tracing_mark_write: ' +
              'HandleTimer: start: ScalingFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742833: tracing_mark_write: ' +
              'HandleTimer: start: SplitCorrectingFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742836: tracing_mark_write: ' +
              'HandleTimer: start: AccelFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742840: tracing_mark_write: ' +
              'HandleTimer: start: SensorJumpFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742843: tracing_mark_write: ' +
              'HandleTimer: start: BoxFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742846: tracing_mark_write: ' +
              'HandleTimer: start: LookaheadFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742853: tracing_mark_write: ' +
              'SyncInterpret: start: IirFilterInterpreter',  // 14
          '<...>-1837  [000] ...1 875292.742861: tracing_mark_write: ' +
              'SyncInterpret: start: PalmClassifyingFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742872: tracing_mark_write: ' +
              'SyncInterpret: start: ClickWiggleFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742881: tracing_mark_write: ' +
              'SyncInterpret: start: FlingStopFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742887: tracing_mark_write: ' +
              'SyncInterpret: start: ImmediateInterpreter',
          '<...>-1837  [000] ...1 875292.742906: tracing_mark_write: ' +
              'SyncInterpret: end: ImmediateInterpreter',
          '<...>-1837  [000] ...1 875292.742910: tracing_mark_write: ' +
              'SyncInterpret: end: FlingStopFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742914: tracing_mark_write: ' +
              'SyncInterpret: end: ClickWiggleFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742917: tracing_mark_write: ' +
              'SyncInterpret: end: PalmClassifyingFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742921: tracing_mark_write: ' +
              'SyncInterpret: end: IirFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742926: tracing_mark_write: ' +
              'HandleTimer: end: LookaheadFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742929: tracing_mark_write: ' +
              'HandleTimer: end: BoxFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742932: tracing_mark_write: ' +
              'HandleTimer: end: SensorJumpFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742937: tracing_mark_write: ' +
              'HandleTimer: end: AccelFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742940: tracing_mark_write: ' +
              'HandleTimer: end: SplitCorrectingFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742944: tracing_mark_write: ' +
              'HandleTimer: end: ScalingFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742949: tracing_mark_write: ' +
              'HandleTimer: end: IntegralGestureFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742952: tracing_mark_write: ' +
              'HandleTimer: end: StuckButtonInhibitorFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742956: tracing_mark_write: ' +
              'HandleTimer: end: T5R2CorrectingFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742959: tracing_mark_write: ' +
              'HandleTimer: end: Cr48ProfileSensorFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742962: tracing_mark_write: ' +
              'HandleTimer: end: AppleTrackpadFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742966: tracing_mark_write: ' +
              'HandleTimer: end: LoggingFilterInterpreter',
          '<...>-1837  [000] ...1 875292.742969: tracing_mark_write: ' +
              'log: start: TimerLogOutputs',
          '<...>-1837  [000] ...1 875292.742973: tracing_mark_write: ' +
              'log: end: TimerLogOutputs',
          '<...>-1837  [000] ...1 875292.795219: tracing_mark_write: ' +
              'log: start: LogHardwareState',
          '<...>-1837  [000] ...1 875292.795231: tracing_mark_write: ' +
              'log: end: LogHardwareState'
        ];
        var m = new tracing.TraceModel(lines.join('\n'), false);
        assertFalse(m.hasImportWarnings);
        var threads = m.getAllThreads();
        assertEquals(1, threads.length);

        var gestureThread = threads[0];
        assertEquals('gesture', gestureThread.name);
        assertEquals(21, gestureThread.sliceGroup.length);
        assertEquals('touchpad_gesture',
                     gestureThread.sliceGroup.slices[0].category);
        assertEquals('GestureLog',
                     gestureThread.sliceGroup.slices[0].title);
        assertEquals('touchpad_gesture',
                     gestureThread.sliceGroup.slices[2].category);
        assertEquals('HandleTimer',
                     gestureThread.sliceGroup.slices[2].title);
        assertEquals('touchpad_gesture',
                     gestureThread.sliceGroup.slices[14].category);
        assertEquals('SyncInterpret',
                     gestureThread.sliceGroup.slices[14].title);
      });

      test('unusualStart', function() {
        var lines = [
          'X-30368 [000] ...1 1819362.481867: tracing_mark_write: ' +
              'SyncInterpret: start: IirFilterInterpreter',
          'X-30368 [000] ...1 1819362.481881: tracing_mark_write: ' +
              'SyncInterpret: start: PalmClassifyingFilterInterpreter',
          'X-30368 [000] ...1 1819362.481894: tracing_mark_write: ' +
              'SyncInterpret: start: ClickWiggleFilterInterpreter',
          'X-30368 [000] ...1 1819362.481905: tracing_mark_write: ' +
              'SyncInterpret: start: FlingStopFilterInterpreter',
          'X-30368 [000] ...1 1819362.481912: tracing_mark_write: ' +
              'SyncInterpret: start: ImmediateInterpreter',
          'X-30368 [000] ...1 1819362.481933: tracing_mark_write: ' +
              'SyncInterpret: end: ImmediateInterpreter',
          'X-30368 [000] ...1 1819362.481938: tracing_mark_write: ' +
              'SyncInterpret: end: FlingStopFilterInterpreter',
          'X-30368 [000] ...1 1819362.481943: tracing_mark_write: ' +
              'SyncInterpret: end: ClickWiggleFilterInterpreter',
          'X-30368 [000] ...1 1819362.481947: tracing_mark_write: ' +
              'SyncInterpret: end: PalmClassifyingFilterInterpreter',
          'X-30368 [000] ...1 1819362.481952: tracing_mark_write: ' +
              'SyncInterpret: end: IirFilterInterpreter',
          'X-30368 [000] ...1 1819362.481958: tracing_mark_write: ' +
              'HandleTimer: end: LookaheadFilterInterpreter',
          'X-30368 [000] ...1 1819362.481962: tracing_mark_write: ' +
              'HandleTimer: end: BoxFilterInterpreter',
          'X-30368 [000] ...1 1819362.481967: tracing_mark_write: ' +
              'HandleTimer: end: SensorJumpFilterInterpreter',
          'X-30368 [000] ...1 1819362.481973: tracing_mark_write: ' +
              'HandleTimer: end: AccelFilterInterpreter',
          'X-30368 [000] ...1 1819362.481977: tracing_mark_write: ' +
              'HandleTimer: end: SplitCorrectingFilterInterpreter',
          'X-30368 [000] ...1 1819362.481982: tracing_mark_write: ' +
              'HandleTimer: end: ScalingFilterInterpreter',
          'X-30368 [000] ...1 1819362.481988: tracing_mark_write: ' +
              'HandleTimer: end: IntegralGestureFilterInterpreter',
          'X-30368 [000] ...1 1819362.481993: tracing_mark_write: ' +
              'HandleTimer: end: StuckButtonInhibitorFilterInterpreter',
          'X-30368 [000] ...1 1819362.481998: tracing_mark_write: ' +
              'HandleTimer: end: T5R2CorrectingFilterInterpreter',
          'X-30368 [000] ...1 1819362.482033: tracing_mark_write: ' +
              'HandleTimer: end: Cr48ProfileSensorFilterInterpreter',
          'X-30368 [000] ...1 1819362.482038: tracing_mark_write: ' +
              'HandleTimer: end: AppleTrackpadFilterInterpreter',
          'X-30368 [000] ...1 1819362.482043: tracing_mark_write: ' +
              'HandleTimer: end: LoggingFilterInterpreter',
          'X-30368 [000] ...1 1819362.482047: tracing_mark_write: ' +
              'log: start: TimerLogOutputs',
          'X-30368 [000] ...1 1819362.482053: tracing_mark_write: ' +
              'log: end: TimerLogOutputs'
        ];
        var m = new tracing.TraceModel(lines.join('\n'), false);
        assertFalse(m.hasImportWarnings);
        var threads = m.getAllThreads();
        assertEquals(1, threads.length);
      });

      test('importError', function() {
        var lines = [
          'X-30368 [000] ...1 1819362.481912: tracing_mark_write: ' +
              'SyncInterpret: start: ImmediateInterpreter',
          'X-30368 [000] ...1 1819362.481958: tracing_mark_write: ' +
              'HandleTimer: end: LookaheadFilterInterpreter',
          'X-30368 [000] ...1 1819362.481962: tracing_mark_write: ' +
              'HandleTimer: end: BoxFilterInterpreter',
          'X-30368 [000] ...1 1819362.481967: tracing_mark_write: ' +
              'HandleTimer: end: SensorJumpFilterInterpreter',
          'X-30368 [000] ...1 1819362.481973: tracing_mark_write: ' +
              'HandleTimer: end: AccelFilterInterpreter',
          'X-30368 [000] ...1 1819362.481977: tracing_mark_write: ' +
              'HandleTimer: end: SplitCorrectingFilterInterpreter',
          'X-30368 [000] ...1 1819362.481982: tracing_mark_write: ' +
              'HandleTimer: end: ScalingFilterInterpreter',
          'X-30368 [000] ...1 1819362.481988: tracing_mark_write: ' +
              'HandleTimer: end: IntegralGestureFilterInterpreter'
        ];
        var m = new tracing.TraceModel(lines.join('\n'), false);
        assertTrue(m.hasImportWarnings);
        assertEquals(7, m.importWarnings.length);
      });
    });
