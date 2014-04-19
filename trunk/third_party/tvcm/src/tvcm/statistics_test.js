// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.statistics');

tvcm.unittest.testSuite('tvcm.statistics_test', function() {
  var Statistics = tvcm.Statistics;

  test('sumBasic', function() {
    assertEquals(6, Statistics.sum([1, 2, 3]));
  });
  test('sumWithFunctor', function() {
    var ctx = {};
    var ary = [1, 2, 3];
    assertEquals(12, Statistics.sum(ary, function(x, i) {
      assertEquals(this, ctx);
      assertEquals(ary[i], x);
      return x * 2;
    }, ctx));
  });

  test('minMaxWithFunctor', function() {
    var ctx = {};
    var ary = [1, 2, 3];
    function func(x, i) {
      assertEquals(this, ctx);
      assertEquals(ary[i], x);
      return x;
    }
    assertEquals(3, Statistics.max(ary, func, ctx));
    assertEquals(1, Statistics.min(ary, func, ctx));

    var range = Statistics.range(ary, func, ctx);
    assertFalse(range.isEmpty);
    assertEquals(1, range.min);
    assertEquals(3, range.max);
  });

  test('maxExtrema', function() {
    assertEquals(-Infinity, Statistics.max([]));
    assertEquals(Infinity, Statistics.min([]));
  });

  test('mean', function() {
    assertEquals(2, Statistics.mean([1, 2, 3]));
  });

  test('varianceAndStdDev', function() {
    var ctx = {};
    var ary = [{x: 2},
               {x: 4},
               {x: 4},
               {x: 2}];
    var v = Statistics.mean(ary,
                            function(d) {
                              assertEquals(ctx, this);
                              return d.x;
                            }, ctx);
    assertEquals(3, v);
  });

  test('percentile', function() {
    var ctx = {};
    var ary = [{x: 0},
               {x: 1},
               {x: 2},
               {x: 3},
               {x: 4},
               {x: 5},
               {x: 6},
               {x: 7},
               {x: 8},
               {x: 9}];
    function func(d, i) {
      assertEquals(ctx, this);
      return d.x;
    }
    assertEquals(0, Statistics.percentile(ary, 0, func, ctx));
    assertEquals(4, Statistics.percentile(ary, .5, func, ctx));
    assertEquals(6, Statistics.percentile(ary, .75, func, ctx));
    assertEquals(9, Statistics.percentile(ary, 1, func, ctx));
  });

});
