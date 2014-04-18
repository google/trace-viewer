// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.ui.pie_chart');

tvcm.testSuite('tvcm.ui.pie_chart_test', function() {
  test('simple', function() {
    var chart = new tvcm.ui.PieChart();
    chart.width = 400;
    chart.height = 200;
    assertEquals('400', chart.getAttribute('width'));
    assertEquals('200', chart.getAttribute('height'));
    chart.chartTitle = 'Chart title';
    var data = [
      {label: 'a', value: 100},
      {label: 'b', value: 200},
      {label: 'c', value: 300}
    ];
    chart.data = data;
    chart.highlightedLegendKey = 'a';
    chart.pushTempHighlightedLegendKey('b');
    chart.highlightedLegendKey = 'c';
    assertEquals('b', chart.currentHighlightedLegendKey);
    chart.popTempHighlightedLegendKey('b');
    assertEquals('c', chart.highlightedLegendKey);
    this.addHTMLOutput(chart);
  });

  test('withValueText', function() {
    var chart = new tvcm.ui.PieChart();
    chart.width = 400;
    chart.height = 200;
    chart.chartTitle = 'Chart title';
    var data = [
      {label: 'a', value: 100, valueText: '100ms'},
      {label: 'b', value: 200, valueText: '200ms'},
      {label: 'c', value: 300, valueText: '300ms'}
    ];
    chart.data = data;
    this.addHTMLOutput(chart);
  });

  test('lotsOfValues', function() {
    var chart = new tvcm.ui.PieChart();
    chart.chartTitle = 'Chart title';
    var data = [
      {label: 'a', value: 100},
      {label: 'bb', value: 200},
      {label: 'cccc', value: 300},
      {label: 'dd', value: 50},
      {label: 'eeeee', value: 250},
      {label: 'fffffff', value: 120},
      {label: 'ggg', value: 90},
      {label: 'hhhh', value: 175},
      {label: 'toolongiiiiiiiiiiiiiiiiiiiiiiiii', value: 325},
      {label: 'jjjjjj', value: 140},
      {label: 'kkkkkkkkk', value: 170},
      {label: 'lll', value: 220}
    ];
    chart.data = data;
    this.addHTMLOutput(chart);

    var minSize = chart.getMinSize();
    chart.setSize(chart.getMinSize());
  });

  test('denseValues', function() {
    var chart = new tvcm.ui.PieChart();
    chart.chartTitle = 'Chart title';
    var data = [
      {
        valueText: '2.855ms',
        value: 2.854999999999997,
        label: '156959'
      },
      {
        valueText: '9.949ms',
        value: 9.948999999999998,
        label: '16131'
      },
      {
        valueText: '42.314ms',
        value: 42.314000000000725,
        label: '51511'
      },
      {
        valueText: '31.069ms',
        value: 31.06900000000028,
        label: 'AudioOutputDevice'
      },
      {
        valueText: '1.418ms',
        value: 1.418,
        label: 'BrowserBlockingWorker2/50951'
      },
      {
        valueText: '0.044ms',
        value: 0.044,
        label: 'BrowserBlockingWorker3/50695'
      },
      {
        valueText: '18.526ms',
        value: 18.52599999999993,
        label: 'Chrome_ChildIOThread'
      },
      {
        valueText: '2.888ms',
        value: 2.888,
        label: 'Chrome_FileThread'
      },
      {
        valueText: '0.067ms',
        value: 0.067,
        label: 'Chrome_HistoryThread'
      },
      {
        valueText: '25.421ms',
        value: 25.421000000000046,
        label: 'Chrome_IOThread'
      },
      {
        valueText: '0.019ms',
        value: 0.019,
        label: 'Chrome_ProcessLauncherThread'
      },
      {
        valueText: '643.088ms',
        value: 643.087999999995,
        label: 'Compositor'
      },
      {
        valueText: '4.05ms',
        value: 4.049999999999973,
        label: 'CompositorRasterWorker1/22031'
      },
      {
        valueText: '50.04ms',
        value: 50.040000000000106,
        label: 'CrBrowserMain'
      },
      {
        valueText: '1256.513ms',
        value: 1256.5130000000042,
        label: 'CrGpuMain'
      },
      {
        valueText: '5502.195ms',
        value: 5502.19499999999,
        label: 'CrRendererMain'
      },
      {
        valueText: '15.553ms',
        value: 15.552999999999862,
        label: 'FFmpegDemuxer'
      },
      {
        valueText: '63.706ms',
        value: 63.706000000001524,
        label: 'Media'
      },
      {
        valueText: '2.742ms',
        value: 2.7419999999999987,
        label: 'PowerSaveBlocker'
      },
      {
        valueText: '0.115ms',
        value: 0.11500000000000005,
        label: 'Watchdog'
      }
    ];
    chart.data = data;
    this.addHTMLOutput(chart);

    var minSize = chart.getMinSize();
    chart.setSize(chart.getMinSize());
  });
});
