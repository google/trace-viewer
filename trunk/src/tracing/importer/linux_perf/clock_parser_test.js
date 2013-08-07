// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('tracing.test_utils');
base.require('tracing.importer.linux_perf_importer');

base.unittest.testSuite('tracing.importer.linux_perf.clock_parser', function() {
  test('clock', function() {
    var lines = [
      'cfinteractive-23    [000] d..2  8113.233768: clock_set_rate: ' +
          'fout_apll state=500000000 cpu_id=0',

      'cfinteractive-23    [000] d..2  8113.249509: clock_set_rate: ' +
          'fout_apll state=300000000 cpu_id=0',

      'cfinteractive-23    [000] d..2  8113.289796: clock_set_rate: ' +
          'fout_apll state=400000000 cpu_id=0',

      'cfinteractive-23    [000] d..2  8113.294568: clock_set_rate: ' +
          'fout_apll state=500000000 cpu_id=0',

      'cfinteractive-23    [000] d..2  8113.309509: clock_set_rate: ' +
          'fout_apll state=800000000 cpu_id=0',

      'cfinteractive-23    [000] d..2  8113.388732: clock_set_rate: ' +
          'fout_apll state=200000000 cpu_id=0',

      'cfinteractive-23    [000] d..2  8113.410182: clock_set_rate: ' +
          'fout_apll state=300000000 cpu_id=0',

      'cfinteractive-23    [000] d..2  8113.414872: clock_set_rate: ' +
          'fout_apll state=600000000 cpu_id=0',

      'cfinteractive-23    [000] d..2  8113.494455: clock_set_rate: ' +
          'fout_apll state=200000000 cpu_id=0',

      'cfinteractive-23    [000] d..2  8113.515254: clock_set_rate: ' +
          'fout_apll state=500000000 cpu_id=0'
    ];

    var m = new tracing.TraceModel(lines.join('\n'), false);
    assertFalse(m.hasImportWarnings);

    var counters = m.getAllCounters();
    assertEquals(1, counters.length);

    assertEquals(10, counters[0].series[0].samples.length);
  });
});
