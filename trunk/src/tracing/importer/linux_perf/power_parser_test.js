// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('tracing.test_utils');
base.require('tracing.importer.linux_perf_importer');

base.unittest.testSuite('tracing.importer.linux_perf.power_parser', function() {
  test('powerFrequencyImport', function() {
    var lines = [
      ' kworker/0:3-6880  [000]  2784.783015: power_frequency: ' +
                 'type=2 state=1000000 cpu_id=0',
      ' kworker/1:2-7269  [001]  2784.788993: power_frequency: ' +
                 'type=2 state=800000 cpu_id=1',
      ' kworker/1:2-7269  [001]  2784.993120: power_frequency: ' +
                 'type=2 state=1300000 cpu_id=1'
    ];
    var m = new tracing.TraceModel(lines.join('\n'), false);
    assertEquals(0, m.importErrors.length);

    var c0 = m.kernel.cpus[0];
    assertEquals(0, c0.slices.length);
    assertEquals(1, c0.counters['Clock Frequency'].series[0].samples.length);

    var c1 = m.kernel.cpus[1];
    assertEquals(0, c1.slices.length);
    assertEquals(2, c1.counters['Clock Frequency'].series[0].samples.length);
  });

  test('cpuFrequencyImport', function() {
    var lines = [
      '     kworker/1:0-9665  [001] 15051.007301: cpu_frequency: ' +
                     'state=800000 cpu_id=1',
      '     kworker/1:0-9665  [001] 15051.010278: cpu_frequency: ' +
                     'state=1300000 cpu_id=1',
      '     kworker/0:2-7972  [000] 15051.010278: cpu_frequency: ' +
                     'state=1000000 cpu_id=0',
      '     kworker/0:2-7972  [000] 15051.020304: cpu_frequency: ' +
                     'state=800000 cpu_id=0'
    ];
    var m = new tracing.TraceModel(lines.join('\n'), false);
    assertEquals(0, m.importErrors.length);

    var c0 = m.kernel.cpus[0];
    assertEquals(0, c0.slices.length);
    assertEquals(2, c0.counters['Clock Frequency'].series[0].samples.length);

    var c1 = m.kernel.cpus[1];
    assertEquals(0, c1.slices.length);
    assertEquals(2, c1.counters['Clock Frequency'].series[0].samples.length);
  });

  test('cpuIdleImport', function() {
    var lines = [
      '          <idle>-0     [000] 15050.992883: cpu_idle: ' +
          'state=1 cpu_id=0',
      '          <idle>-0     [000] 15050.993027: cpu_idle: ' +
          'state=4294967295 cpu_id=0',
      '          <idle>-0     [001] 15050.993132: cpu_idle: ' +
          'state=1 cpu_id=1',
      '          <idle>-0     [001] 15050.993276: cpu_idle: ' +
          'state=4294967295 cpu_id=1',
      '          <idle>-0     [001] 15050.993279: cpu_idle: ' +
          'state=3 cpu_id=1',
      '          <idle>-0     [001] 15050.993457: cpu_idle: ' +
          'state=4294967295 cpu_id=1'
    ];
    var m = new tracing.TraceModel(lines.join('\n'), false);
    assertEquals(0, m.importErrors.length);

    var c0 = m.kernel.cpus[0];
    assertEquals(0, c0.slices.length);
    assertEquals(2, c0.counters['C-State'].series[0].samples.length);

    var c1 = m.kernel.cpus[1];
    assertEquals(0, c1.slices.length);
    assertEquals(4, c1.counters['C-State'].series[0].samples.length);
  });
});
