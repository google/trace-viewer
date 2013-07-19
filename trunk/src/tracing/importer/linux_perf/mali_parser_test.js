// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('tracing.test_utils');
base.require('tracing.importer.linux_perf_importer');

base.unittest.testSuite('tracing.importer.linux_perf.mali_parser', function() {
  test('maliDDKImport', function() {
    var linesNoThread = [
      // Row 1 open
      '           chrome-1780  [001] ...1   28.562633: tracing_mark_write: ' +
          'mali_driver: cros_trace_print_enter: ' +
          'gles/src/dispatch/mali_gles_dispatch_entrypoints.c992: ' +
          'glTexSubImage2D',
      // Row 2 open
      '           chrome-1780  [001] ...1   28.562655: tracing_mark_write: ' +
          'mali_driver: cros_trace_print_enter: ' +
          'gles/src/texture/mali_gles_texture_api.c996: ' +
          'gles_texture_tex_sub_image_2d',
      // Row 3 open
      '            chrome-1780  [001] ...1   28.562671: tracing_mark_write: ' +
          'mali_driver: cros_trace_print_enter: ' +
          'gles/src/texture/mali_gles_texture_slave.c295: ' +
          'gles_texturep_slave_map_master',
      // Row 3 close
      '           chrome-1780  [001] ...1   28.562684: tracing_mark_write: ' +
          'mali_driver: cros_trace_print_exit: ' +
          'gles/src/texture/mali_gles_texture_slave.c295: ',
      // Row 3 open
      '           chrome-1780  [001] ...1   28.562700: tracing_mark_write: ' +
          'mali_driver: cros_trace_print_enter: ' +
          'gles/src/texture/mali_gles_texture_slave.c1505: ' +
          'gles2_texturep_upload_2d',
      // Row 4 open
      '           chrome-1780  [001] ...1   28.562726: tracing_mark_write: ' +
          'mali_driver: cros_trace_print_enter: ' +
          'gles/src/texture/mali_gles_texture_slave.c1612: ' +
          'gles2_texturep_upload_2d: pixel array: wait for dependencies',
      // Row 5 open
      '           chrome-1780  [001] ...1   28.562742: tracing_mark_write: ' +
          'mali_driver: cros_trace_print_enter: ' +
          'cobj/src/mali_cobj_surface_operations.c1693: ' +
          'cobj_convert_pixels_to_surface',
      // Row 6 open
      '           chrome-1780  [001] ...1   28.562776: tracing_mark_write: ' +
          'mali_driver: cros_trace_print_enter: ' +
          'cobj/src/mali_cobj_surface_operations.c1461: ' +
          'cobj_convert_pixels',
      // Row 7 open
      '           chrome-1780  [001] ...1   28.562791: tracing_mark_write: ' +
          'mali_driver: cros_trace_print_enter: ' +
          'cobj/src/mali_cobj_surface_operations.c1505: ' +
          'cobj_convert_pixels: fast-path linear copy',
      // Row 8 open
      '           chrome-1780  [001] ...1   28.562808: tracing_mark_write: ' +
          'mali_driver: cros_trace_print_enter: ' +
          'cobj/src/mali_cobj_surface_operations.c1511: ' +
          'cobj_convert_pixels: reorder-only',
      // Row 8 close
      '           chrome-1780  [001] ...1   28.563383: tracing_mark_write: ' +
          'mali_driver: cros_trace_print_exit: ' +
          'cobj/src/mali_cobj_surface_operations.c1511',
      // Row 7 close
      '           chrome-1780  [001] ...1   28.563397: tracing_mark_write: ' +
          'mali_driver: cros_trace_print_exit: ' +
          'cobj/src/mali_cobj_surface_operations.c1505',
      // Row 6 close
      '           chrome-1780  [001] ...1   28.563409: tracing_mark_write: ' +
          'mali_driver: cros_trace_print_exit: ' +
          'cobj/src/mali_cobj_surface_operations.c1461',
      // Row 5 close
      '           chrome-1780  [001] ...1   28.563438: tracing_mark_write: ' +
          'mali_driver: cros_trace_print_exit: ' +
          'cobj/src/mali_cobj_surface_operations.c1693',
      // Row 4 close
      '           chrome-1780  [001] ...1   28.563451: tracing_mark_write: ' +
          'mali_driver: cros_trace_print_exit: ' +
          'gles/src/texture/mali_gles_texture_slave.c1612',
      // Row 3 close
      '           chrome-1780  [001] ...1   28.563462: tracing_mark_write: ' +
          'mali_driver: cros_trace_print_exit: ' +
          'gles/src/texture/mali_gles_texture_slave.c1505',
      // Row 2 close
      '           chrome-1780  [001] ...1   28.563475: tracing_mark_write: ' +
          'mali_driver: cros_trace_print_exit: ' +
          'gles/src/texture/mali_gles_texture_api.c996',
      // Row 1 close
      '           chrome-1780  [001] ...1   28.563486: tracing_mark_write: ' +
          'mali_driver: cros_trace_print_exit: ' +
          'gles/src/dispatch/mali_gles_dispatch_entrypoints.c992'
    ];

    var linesWithThread = [
      // Row 1 open
      '           chrome-1780  [001] ...1   28.562633: tracing_mark_write: ' +
          'mali_driver: (mali-1878934320) cros_trace_print_enter: ' +
          'gles/src/dispatch/mali_gles_dispatch_entrypoints.c@992: ' +
          'glTexSubImage2D',
      // Row 2 open
      '           chrome-1780  [001] ...1   28.562655: tracing_mark_write: ' +
          'mali_driver: (mali-1878934320) cros_trace_print_enter: ' +
          'gles/src/texture/mali_gles_texture_api.c@996: ' +
          'gles_texture_tex_sub_image_2d',
      // Row 3 open
      '            chrome-1780  [001] ...1   28.562671: tracing_mark_write: ' +
          'mali_driver: (mali-1878934320) cros_trace_print_enter: ' +
          'gles/src/texture/mali_gles_texture_slave.c@295: ' +
          'gles_texturep_slave_map_master',
      // Row 3 close
      '           chrome-1780  [001] ...1   28.562684: tracing_mark_write: ' +
          'mali_driver: (mali-1878934320) cros_trace_print_exit: ' +
          'gles/src/texture/mali_gles_texture_slave.c@295: ',
      // Row 3 open
      '           chrome-1780  [001] ...1   28.562700: tracing_mark_write: ' +
          'mali_driver: (mali-1878934320) cros_trace_print_enter: ' +
          'gles/src/texture/mali_gles_texture_slave.c@1505: ' +
          'gles2_texturep_upload_2d',
      // Row 4 open
      '           chrome-1780  [001] ...1   28.562726: tracing_mark_write: ' +
          'mali_driver: (mali-1878934320) cros_trace_print_enter: ' +
          'gles/src/texture/mali_gles_texture_slave.c@1612: ' +
          'gles2_texturep_upload_2d: pixel array: wait for dependencies',
      // Row 5 open
      '           chrome-1780  [001] ...1   28.562742: tracing_mark_write: ' +
          'mali_driver: (mali-1878934320) cros_trace_print_enter: ' +
          'cobj/src/mali_cobj_surface_operations.c@1693: ' +
          'cobj_convert_pixels_to_surface',
      // Row 6 open
      '           chrome-1780  [001] ...1   28.562776: tracing_mark_write: ' +
          'mali_driver: (mali-1878934320) cros_trace_print_enter: ' +
          'cobj/src/mali_cobj_surface_operations.c@1461: ' +
          'cobj_convert_pixels',
      // Row 7 open
      '           chrome-1780  [001] ...1   28.562791: tracing_mark_write: ' +
          'mali_driver: (mali-1878934320) cros_trace_print_enter: ' +
          'cobj/src/mali_cobj_surface_operations.c@1505: ' +
          'cobj_convert_pixels: fast-path linear copy',
      // Row 8 open
      '           chrome-1780  [001] ...1   28.562808: tracing_mark_write: ' +
          'mali_driver: (mali-1878934320) cros_trace_print_enter: ' +
          'cobj/src/mali_cobj_surface_operations.c@1511: ' +
          'cobj_convert_pixels: reorder-only',
      // Row 8 close
      '           chrome-1780  [001] ...1   28.563383: tracing_mark_write: ' +
          'mali_driver: (mali-1878934320) cros_trace_print_exit: ' +
          'cobj/src/mali_cobj_surface_operations.c@1511',
      // Row 7 close
      '           chrome-1780  [001] ...1   28.563397: tracing_mark_write: ' +
          'mali_driver: (mali-1878934320) cros_trace_print_exit: ' +
          'cobj/src/mali_cobj_surface_operations.c@1505',
      // Row 6 close
      '           chrome-1780  [001] ...1   28.563409: tracing_mark_write: ' +
          'mali_driver: (mali-1878934320) cros_trace_print_exit: ' +
          'cobj/src/mali_cobj_surface_operations.c@1461',
      // Row 5 close
      '           chrome-1780  [001] ...1   28.563438: tracing_mark_write: ' +
          'mali_driver: (mali-1878934320) cros_trace_print_exit: ' +
          'cobj/src/mali_cobj_surface_operations.c@1693',
      // Row 4 close
      '           chrome-1780  [001] ...1   28.563451: tracing_mark_write: ' +
          'mali_driver: (mali-1878934320) cros_trace_print_exit: ' +
          'gles/src/texture/mali_gles_texture_slave.c@1612',
      // Row 3 close
      '           chrome-1780  [001] ...1   28.563462: tracing_mark_write: ' +
          'mali_driver: (mali-1878934320) cros_trace_print_exit: ' +
          'gles/src/texture/mali_gles_texture_slave.c@1505',
      // Row 2 close
      '           chrome-1780  [001] ...1   28.563475: tracing_mark_write: ' +
          'mali_driver: (mali-1878934320) cros_trace_print_exit: ' +
          'gles/src/texture/mali_gles_texture_api.c@996',
      // Row 1 close
      '           chrome-1780  [001] ...1   28.563486: tracing_mark_write: ' +
          'mali_driver: (mali-1878934320) cros_trace_print_exit: ' +
          'gles/src/dispatch/mali_gles_dispatch_entrypoints.c@992'
    ];
    var traceNoThread =
        new tracing.TraceModel(linesNoThread.join('\n'), false);
    var traceWithThread =
        new tracing.TraceModel(linesWithThread.join('\n'), false);
    assertEquals(0, traceNoThread.importErrors.length);
    assertEquals(0, traceWithThread.importErrors.length);

    var threadsNoThread = traceNoThread.getAllThreads();
    var threadsWithThread = traceWithThread.getAllThreads();
    assertEquals(1, threadsNoThread.length);
    assertEquals(1, threadsWithThread.length);

    var maliThreadNoThread = threadsNoThread[0];
    var maliThreadWithThread = threadsWithThread[0];
    assertEquals('mali', maliThreadNoThread.tid);
    assertEquals('mali-1878934320', maliThreadWithThread.tid);
    assertEquals(9, maliThreadNoThread.sliceGroup.length);
    assertEquals(9, maliThreadWithThread.sliceGroup.length);
  });

  test('DVFSFrequencyImport', function() {
    var lines = [
      '     kworker/u:0-5     [001] ....  1174.839552: mali_dvfs_set_clock: ' +
                     'frequency=266',
      '     kworker/u:0-5     [000] ....  1183.840486: mali_dvfs_set_clock: ' +
                     'frequency=400'
    ];
    var m = new tracing.TraceModel(lines.join('\n'), false);
    assertEquals(0, m.importErrors.length);

    var counters = m.getAllCounters();
    assertEquals(1, counters.length);

    var c0 = counters[0];
    assertEquals(c0.name, 'DVFS Frequency');
    assertEquals(2, c0.series[0].samples.length);
  });

  test('DVFSVoltageImport', function() {
    var lines = [
      '    kworker/u:0-5     [001] ....  1174.839562: mali_dvfs_set_voltage: ' +
                     'voltage=937500',
      '    kworker/u:0-5     [000] ....  1183.840009: mali_dvfs_set_voltage: ' +
                     'voltage=1100000'
    ];
    var m = new tracing.TraceModel(lines.join('\n'), false);
    assertEquals(0, m.importErrors.length);

    var counters = m.getAllCounters();
    assertEquals(1, counters.length);

    var c0 = counters[0];
    assertEquals(c0.name, 'DVFS Voltage');
    assertEquals(2, c0.series[0].samples.length);
  });

  test('DVFSUtilizationImport', function() {
    var lines = [
      '     kworker/u:0-5     [001] ....  1174.839552: mali_dvfs_event: ' +
                     'utilization=7',
      '     kworker/u:0-5     [000] ....  1183.840486: mali_dvfs_event: ' +
                     'utilization=37'
    ];
    var m = new tracing.TraceModel(lines.join('\n'), false);
    assertEquals(0, m.importErrors.length);

    var counters = m.getAllCounters();
    assertEquals(1, counters.length);

    var c0 = counters[0];
    assertEquals(c0.name, 'DVFS Utilization');
    assertEquals(2, c0.series[0].samples.length);
  });

  test('maliHWCImport', function() {
    var lines = [
      '     kworker/u:0-5     [000] ....    78.896588: ' +
                     'mali_hwc_ACTIVE: val=238',
      '     kworker/u:0-5     [000] ....    79.046889: ' +
                     'mali_hwc_ARITH_CYCLES_L0: val=1967',
      '     kworker/u:0-5     [000] ....    79.046888: ' +
                     'mali_hwc_ARITH_CYCLES_REG: val=136',
      '     kworker/u:0-5     [000] ....    79.046890: ' +
                     'mali_hwc_ARITH_FRAG_DEPEND: val=19676',
      '     kworker/u:0-5     [000] ....    79.046886: ' +
                     'mali_hwc_ARITH_WORDS: val=255543',
      '     kworker/u:0-5     [000] ....    79.046920: ' +
                     'mali_hwc_AXI_BEATS_READ: val=257053',
      '     kworker/u:0-5     [000] ....    78.896594: ' +
                     'mali_hwc_AXI_TLB_STALL: val=1',
      '     kworker/u:0-5     [000] ....    78.946646: ' +
                     'mali_hwc_AXI_TLB_TRANSACTION: val=4',
      '     kworker/u:0-5     [000] ....    79.046853: ' +
                     'mali_hwc_BACK_FACING: val=104',
      '     kworker/u:0-5     [000] ....    79.046880: ' +
                     'mali_hwc_COMPUTE_ACTIVE: val=17462',
      '     kworker/u:0-5     [000] ....    79.046884: ' +
                     'mali_hwc_COMPUTE_CYCLES_DESC: val=3933',
      '     kworker/u:0-5     [000] ....    79.046881: ' +
                     'mali_hwc_COMPUTE_TASKS: val=15',
      '     kworker/u:0-5     [000] ....    79.046883: ' +
                     'mali_hwc_COMPUTE_THREADS: val=60',
      '     kworker/u:0-5     [000] ....    79.046860: ' +
                     'mali_hwc_FRAG_ACTIVE: val=690986',
      '     kworker/u:0-5     [000] ....    79.046864: ' +
                     'mali_hwc_FRAG_CYCLE_DESC: val=13980',
      '     kworker/u:0-5     [000] ....    79.046876: ' +
                     'mali_hwc_FRAG_CYCLE_NO_TILE: val=3539',
      '     kworker/u:0-5     [000] ....    79.046865: ' +
                     'mali_hwc_FRAG_CYCLES_PLR: val=1499',
      '     kworker/u:0-5     [000] ....    79.046869: ' +
                     'mali_hwc_FRAG_CYCLES_RAST: val=1999',
      '     kworker/u:0-5     [000] ....    79.046868: ' +
                     'mali_hwc_FRAG_CYCLES_TRISETUP: val=22353',
      '     kworker/u:0-5     [000] ....    79.046867: ' +
                     'mali_hwc_FRAG_CYCLES_VERT: val=20763',
      '     kworker/u:0-5     [000] ....    79.046872: ' +
                     'mali_hwc_FRAG_DUMMY_THREADS: val=1968',
      '     kworker/u:0-5     [000] ....    79.046877: ' +
                     'mali_hwc_FRAG_NUM_TILES: val=1840',
      '     kworker/u:0-5     [000] ....    79.046862: ' +
                     'mali_hwc_FRAG_PRIMATIVES: val=3752',
      '     kworker/u:0-5     [000] ....    79.046863: ' +
                     'mali_hwc_FRAG_PRIMATIVES_DROPPED: val=18',
      '     kworker/u:0-5     [000] ....    79.046874: ' +
                     'mali_hwc_FRAG_QUADS_EZS_TEST: val=117925',
      '     kworker/u:0-5     [000] ....    79.046873: ' +
                     'mali_hwc_FRAG_QUADS_RAST: val=117889',
      '     kworker/u:0-5     [000] ....    79.046870: ' +
                     'mali_hwc_FRAG_THREADS: val=471507',
      '     kworker/u:0-5     [000] ....    79.046879: ' +
                     'mali_hwc_FRAG_TRANS_ELIM: val=687',
      '     kworker/u:0-5     [000] ....    80.315162: ' +
                     'mali_hwc_FRONT_FACING: val=56',
      '     kworker/u:0-5     [000] ....    78.896582: ' +
                     'mali_hwc_GPU_ACTIVE: val=1316',
      '     kworker/u:0-5     [000] ....    78.896584: ' +
                     'mali_hwc_IRQ_ACTIVE: val=17',
      '     kworker/u:0-5     [000] ....    79.046834: ' +
                     'mali_hwc_JS0_ACTIVE: val=709444',
      '     kworker/u:0-5     [000] ....    79.046831: ' +
                     'mali_hwc_JS0_JOBS: val=2',
      '     kworker/u:0-5     [000] ....    79.046832: ' +
                     'mali_hwc_JS0_TASKS: val=7263',
      '     kworker/u:0-5     [000] ....    79.046836: ' +
                     'mali_hwc_JS0_WAIT_DEPEND: val=665876',
      '     kworker/u:0-5     [000] ....    79.046835: ' +
                     'mali_hwc_JS0_WAIT_ISSUE: val=910',
      '     kworker/u:0-5     [000] ....    79.046840: ' +
                     'mali_hwc_JS1_ACTIVE: val=153980',
      '     kworker/u:0-5     [000] ....    79.046838: ' +
                     'mali_hwc_JS1_JOBS: val=133',
      '     kworker/u:0-5     [000] ....    79.046839: ' +
                     'mali_hwc_JS1_TASKS: val=128',
      '     kworker/u:0-5     [000] ....    79.046843: ' +
                     'mali_hwc_JS1_WAIT_FINISH: val=74404',
      '     kworker/u:0-5     [000] ....    79.046842: ' +
                     'mali_hwc_JS1_WAIT_ISSUE: val=10146',
      '     kworker/u:0-5     [000] ....    78.896603: ' +
                     'mali_hwc_L2_ANY_LOOKUP: val=22',
      '     kworker/u:0-5     [000] ....    79.046942: ' +
                     'mali_hwc_L2_CLEAN_MISS: val=116',
      '     kworker/u:0-5     [000] ....    79.063515: ' +
                     'mali_hwc_L2_EXT_AR_STALL: val=9',
      '     kworker/u:0-5     [000] ....    78.963384: ' +
                     'mali_hwc_L2_EXT_BARRIER: val=1',
      '     kworker/u:0-5     [000] ....    79.063516: ' +
                     'mali_hwc_L2_EXT_R_BUF_FULL: val=43',
      '     kworker/u:0-5     [000] ....    78.896611: ' +
                     'mali_hwc_L2_EXT_READ: val=4',
      '     kworker/u:0-5     [000] ....    78.896612: ' +
                     'mali_hwc_L2_EXT_READ_LINE: val=4',
      '     kworker/u:0-5     [000] ....    79.046956: ' +
                     'mali_hwc_L2_EXT_R_RAW: val=1',
      '     kworker/u:0-5     [000] ....    79.063518: ' +
                     'mali_hwc_L2_EXT_R_W_HAZARD: val=15',
      '     kworker/u:0-5     [000] ....    78.963381: ' +
                     'mali_hwc_L2_EXT_WRITE: val=25',
      '     kworker/u:0-5     [000] ....    79.046952: ' +
                     'mali_hwc_L2_EXT_WRITE_LINE: val=63278',
      '     kworker/u:0-5     [000] ....    78.963382: ' +
                     'mali_hwc_L2_EXT_WRITE_SMALL: val=1',
      '     kworker/u:0-5     [000] ....    79.814532: ' +
                     'mali_hwc_L2_EXT_W_STALL: val=9',
      '     kworker/u:0-5     [000] ....    78.896602: ' +
                     'mali_hwc_L2_READ_BEATS: val=16',
      '     kworker/u:0-5     [000] ....    78.896607: ' +
                     'mali_hwc_L2_READ_HIT: val=11',
      '     kworker/u:0-5     [000] ....    78.896604: ' +
                     'mali_hwc_L2_READ_LOOKUP: val=19',
      '     kworker/u:0-5     [000] ....    78.896606: ' +
                     'mali_hwc_L2_READ_REPLAY: val=2',
      '     kworker/u:0-5     [000] ....    79.046940: ' +
                     'mali_hwc_L2_READ_SNOOP: val=24',
      '     kworker/u:0-5     [000] ....    79.046959: ' +
                     'mali_hwc_L2_REPLAY_FULL: val=6629',
      '     kworker/u:0-5     [000] .N..    80.565684: ' +
                     'mali_hwc_L2_SNOOP_FULL: val=5',
      '     kworker/u:0-5     [000] ....    79.046937: ' +
                     'mali_hwc_L2_SREAD_LOOKUP: val=241',
      '     kworker/u:0-5     [000] ....    79.046944: ' +
                     'mali_hwc_L2_SWRITE_LOOKUP: val=133',
      '     kworker/u:0-5     [000] ....    78.896614: ' +
                     'mali_hwc_L2_TAG_HAZARD: val=4',
      '     kworker/u:0-5     [000] ....    78.963368: ' +
                     'mali_hwc_L2_WRITE_BEATS: val=96',
      '     kworker/u:0-5     [000] ....    79.046947: ' +
                     'mali_hwc_L2_WRITE_HIT: val=78265',
      '     kworker/u:0-5     [000] ....    78.896608: ' +
                     'mali_hwc_L2_WRITE_LOOKUP: val=3',
      '     kworker/u:0-5     [000] ....    79.046946: ' +
                     'mali_hwc_L2_WRITE_REPLAY: val=15879',
      '     kworker/u:0-5     [000] ....    79.046912: ' +
                     'mali_hwc_LSC_LINE_FETCHES: val=15',
      '     kworker/u:0-5     [000] ....    79.046909: ' +
                     'mali_hwc_LSC_READ_HITS: val=2961',
      '     kworker/u:0-5     [000] ....    79.046911: ' +
                     'mali_hwc_LSC_READ_MISSES: val=22',
      '     kworker/u:0-5     [000] ....    79.046914: ' +
                     'mali_hwc_LSC_SNOOPS: val=10',
      '     kworker/u:0-5     [000] ....    79.046893: ' +
                     'mali_hwc_LS_ISSUES: val=524219',
      '     kworker/u:0-5     [000] ....    79.046894: ' +
                     'mali_hwc_LS_REISSUES_MISS: val=439',
      '     kworker/u:0-5     [000] ....    79.046895: ' +
                     'mali_hwc_LS_REISSUES_VD: val=52007',
      '     kworker/u:0-5     [000] ....    79.046919: ' +
                     'mali_hwc_LS_TLB_HIT: val=3043',
      '     kworker/u:0-5     [000] ....    79.046918: ' +
                     'mali_hwc_LS_TLB_MISS: val=5',
      '     kworker/u:0-5     [000] ....    79.046891: ' +
                     'mali_hwc_LS_WORDS: val=471514',
      '     kworker/u:0-5     [000] ....    79.046925: ' +
                     'mali_hwc_MMU_HIT: val=771',
      '     kworker/u:0-5     [000] ....    79.046924: ' +
                     'mali_hwc_MMU_NEW_MISS: val=494',
      '     kworker/u:0-5     [000] ....    79.046922: ' +
                     'mali_hwc_MMU_REPLAY_MISS: val=841',
      '     kworker/u:0-5     [000] ....    79.046921: ' +
                     'mali_hwc_MMU_TABLE_WALK: val=3119',
      '     kworker/u:0-5     [000] ....    79.046848: ' +
                     'mali_hwc_POINTS: val=5',
      '     kworker/u:0-5     [000] ....    79.046856: ' +
                     'mali_hwc_PRIM_CLIPPED: val=70',
      '     kworker/u:0-5     [000] ....    79.046855: ' +
                     'mali_hwc_PRIM_CULLED: val=26',
      '     kworker/u:0-5     [000] ....    79.046854: ' +
                     'mali_hwc_PRIM_VISIBLE: val=109',
      '     kworker/u:0-5     [000] ....    79.046898: ' +
                     'mali_hwc_TEX_BUBBLES: val=24874',
      '     kworker/u:0-5     [000] ....    79.046905: ' +
                     'mali_hwc_TEX_RECIRC_DESC: val=5937',
      '     kworker/u:0-5     [000] ....    79.046904: ' +
                     'mali_hwc_TEX_RECIRC_FMISS: val=209450',
      '     kworker/u:0-5     [000] ....    78.896592: ' +
                     'mali_hwc_TEX_RECIRC_MULTI: val=238',
      '     kworker/u:0-5     [000] ....    79.046908: ' +
                     'mali_hwc_TEX_RECIRC_PMISS: val=9672',
      '     kworker/u:0-5     [000] ....    79.046903: ' +
                     'mali_hwc_TEX_THREADS: val=660900',
      '     kworker/u:0-5     [000] ....    79.046897: ' +
                     'mali_hwc_TEX_WORDS: val=471193',
      '     kworker/u:0-5     [000] ....    79.046901: ' +
                     'mali_hwc_TEX_WORDS_DESC: val=707',
      '     kworker/u:0-5     [000] ....    79.046900: ' +
                     'mali_hwc_TEX_WORDS_L0: val=32',
      '     kworker/u:0-5     [000] ....    79.046846: ' +
                     'mali_hwc_TRIANGLES: val=130',
      '     kworker/u:0-5     [000] ....    79.046885: ' +
                     'mali_hwc_TRIPIPE_ACTIVE: val=691001',
      '     kworker/u:0-5     [000] ....    78.896600: ' +
                     'mali_hwc_UTLB_NEW_MISS: val=6',
      '     kworker/u:0-5     [000] ....    78.896599: ' +
                     'mali_hwc_UTLB_REPLAY_FULL: val=248',
      '     kworker/u:0-5     [000] ....    78.896597: ' +
                     'mali_hwc_UTLB_REPLAY_MISS: val=1',
      '     kworker/u:0-5     [000] ....    78.896596: ' +
                     'mali_hwc_UTLB_STALL: val=1',
      '     kworker/u:0-5     [000] ....    79.046850: ' +
                     'mali_hwc_VCACHE_HIT: val=311',
      '     kworker/u:0-5     [000] ....    79.046851: ' +
                     'mali_hwc_VCACHE_MISS: val=70'
    ];
    var m = new tracing.TraceModel(lines.join('\n'), false);
    assertEquals(0, m.importErrors.length);

    var counters = m.getAllCounters();
    assertEquals(103, counters.length);

    // all counters should have 1 sample
    for (var tI = 0; tI < counters.length; tI++) {
      var counter = counters[tI];
      assertEquals(1, counter.series[0].samples.length);
    }
    // TODO(sleffler) verify counter names? (not sure if it's worth the effort)
  });
});
