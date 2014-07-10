// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.ui.line_chart');

tvcm.testSuite('tvcm.ui.line_chart_test', function() {
  test('singleSeries', function() {
    var chart = new tvcm.ui.LineChart();
    chart.width = 400;
    chart.height = 200;
    chart.chartTitle = 'Chart title';
    var data = [
      {x: 10, y: 100},
      {x: 20, y: 110},
      {x: 30, y: 100},
      {x: 40, y: 50}
    ];
    chart.data = data;
    this.addHTMLOutput(chart);
  });

  test('twoSeries', function() {
    var chart = new tvcm.ui.LineChart();

    chart.width = 400;
    chart.height = 200;
    chart.chartTitle = 'Chart title';
    var data = [
      {x: 10, value1: 100, value2: 50},
      {x: 20, value1: 110, value2: 75},
      {x: 30, value1: 100, value2: 125},
      {x: 40, value1: 50, value2: 125}
    ];
    chart.data = data;

    var r = new tvcm.Range();
    r.addValue(20);
    r.addValue(40);
    chart.brushedRange = r;

    this.addHTMLOutput(chart);
  });

  test('brushRangeFromIndices', function() {
    var chart = new tvcm.ui.LineChart();
    var data = [
      {x: 10, value: 50},
      {x: 30, value: 60},
      {x: 70, value: 70},
      {x: 80, value: 80},
      {x: 120, value: 90}
    ];
    chart.data = data;
    var r = new tvcm.Range();

    // Range min should be 10.
    r = chart.computeBrushRangeFromIndices(-2, 1);
    assertEquals(10, r.min);

    // Range max should be 120.
    r = chart.computeBrushRangeFromIndices(3, 10);
    assertEquals(120, r.max);

    // Range should be [10, 120]
    r = chart.computeBrushRangeFromIndices(-2, 10);
    assertEquals(10, r.min);
    assertEquals(120, r.max);

    // Range should be [20, 100]
    r = chart.computeBrushRangeFromIndices(1, 3);
    assertEquals(20, r.min);
    assertEquals(100, r.max);
  });

  test('interactiveBrushing', function() {
    var chart = new tvcm.ui.LineChart();
    chart.width = 400;
    chart.height = 200;
    chart.chartTitle = 'Chart title';
    var data = [
      {x: 10, value: 50},
      {x: 20, value: 60},
      {x: 30, value: 80},
      {x: 40, value: 20},
      {x: 50, value: 30},
      {x: 60, value: 20},
      {x: 70, value: 15},
      {x: 80, value: 20}
    ];
    chart.data = data;

    var mouseDownIndex = undefined;
    var curMouseIndex = undefined;

    function updateBrushedRange() {
      if (mouseDownIndex === undefined) {
        chart.brushedRange = new tvcm.Range();
        return;
      }
      chart.brushedRange = chart.computeBrushRangeFromIndices(
          mouseDownIndex, curMouseIndex);
    }

    chart.addEventListener('item-mousedown', function(e) {
      mouseDownIndex = e.index;
      curMouseIndex = e.index;
      updateBrushedRange();
    });
    chart.addEventListener('item-mousemove', function(e) {
      if (e.button == undefined)
        return;
      curMouseIndex = e.index;
      updateBrushedRange();
    });
    chart.addEventListener('item-mouseup', function(e) {
      curMouseIndex = e.index;
      updateBrushedRange();
    });
    this.addHTMLOutput(chart);
  });
});
