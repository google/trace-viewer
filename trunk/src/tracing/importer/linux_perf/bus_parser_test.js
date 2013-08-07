// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('tracing.test_utils');
base.require('tracing.importer.linux_perf_importer');

base.unittest.testSuite('tracing.importer.linux_perf.bus_parser', function() {
  test('exynos5Bus', function() {
    var lines = [
      's3c-fb-vsync-85    [001] d..2  8116.730115: memory_bus_usage: ' +
          'bus=RIGHT rw_bytes=0 r_bytes=0 w_bytes=0 cycles=2681746 ns=16760792',

      's3c-fb-vsync-85    [001] d..2  8116.730118: memory_bus_usage: ' +
          'bus=CPU rw_bytes=2756608 r_bytes=2267328 w_bytes=491328 ' +
          'cycles=6705198 ns=16763375',

      's3c-fb-vsync-85    [001] d..2  8116.746788: memory_bus_usage: ' +
          'bus=DDR_C rw_bytes=2736128 r_bytes=2260864 w_bytes=479248 ' +
          'cycles=6670677 ns=16676375',

      's3c-fb-vsync-85    [001] d..2  8116.746790: memory_bus_usage: ' +
          'bus=DDR_R1 rw_bytes=31457280 r_bytes=31460912 w_bytes=0 ' +
          'cycles=6670521 ns=16676500',

      's3c-fb-vsync-85    [001] d..2  8116.746792: memory_bus_usage: ' +
          'bus=DDR_L rw_bytes=16953344 r_bytes=16731088 w_bytes=223664 ' +
          'cycles=6669885 ns=16674833',

      's3c-fb-vsync-85    [001] d..2  8116.746793: memory_bus_usage: ' +
          'bus=RIGHT rw_bytes=0 r_bytes=0 w_bytes=0 cycles=2667378 ns=16671250',

      's3c-fb-vsync-85    [001] d..2  8116.746798: memory_bus_usage: ' +
          'bus=CPU rw_bytes=2797568 r_bytes=2309424 w_bytes=491968 ' +
          'cycles=6672156 ns=16680458',

      's3c-fb-vsync-85    [001] d..2  8116.763521: memory_bus_usage: ' +
          'bus=DDR_C rw_bytes=2408448 r_bytes=1968448 w_bytes=441456 ' +
          'cycles=6689562 ns=16723458',

      's3c-fb-vsync-85    [001] d..2  8116.763523: memory_bus_usage: ' +
          'bus=DDR_R1 rw_bytes=31490048 r_bytes=31493360 w_bytes=0 ' +
          'cycles=6690012 ns=16725083',

      's3c-fb-vsync-85    [001] d..2  8116.763525: memory_bus_usage: ' +
          'bus=DDR_L rw_bytes=16941056 r_bytes=16719136 w_bytes=223472 ' +
          'cycles=6690156 ns=16725375'

    ];
    var m = new tracing.TraceModel(lines.join('\n'), false);
    assertFalse(m.hasImportWarnings);

    var counters = m.getAllCounters();
    assertEquals(10, counters.length);

    assertEquals(2, counters[0].series[0].samples.length);
  });
});
