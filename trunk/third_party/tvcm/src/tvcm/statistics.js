// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.range');

tvcm.exportTo('tvcm', function() {

  function identity(d) {
    return d;
  }

  function Statistics() {
  }

  Statistics.sum = function(ary, opt_func, opt_this) {
    var func = opt_func || identity;
    var ret = 0;
    for (var i = 0; i < ary.length; i++)
      ret += func.call(opt_this, ary[i], i);
    return ret;
  };

  Statistics.mean = function(ary, opt_func, opt_this) {
    return Statistics.sum(ary, opt_func, opt_this) / ary.length;
  };

  Statistics.variance = function(ary, opt_func, opt_this) {
    var func = opt_func || identity;
    var mean = Statistics.mean(ary, func, opt_this);
    var sumOfSuaredDistances = Statistics.sum(
        ary,
        function(d, i) {
          var v = func.call(this, d, i) - mean;
          return v * v;
        },
        opt_this);
    return sumOfSuaredDistances / (ary.length - 1);
  };

  Statistics.variance = function(ary, opt_func, opt_this) {
    return Math.sqrt(
        Statistics.variance(ary, opt_func, opt_this));
  };

  Statistics.max = function(ary, opt_func, opt_this) {
    var func = opt_func || identity;
    var ret = -Infinity;
    for (var i = 0; i < ary.length; i++)
      ret = Math.max(ret, func.call(opt_this, ary[i], i));
    return ret;
  };

  Statistics.min = function(ary, opt_func, opt_this) {
    var func = opt_func || identity;
    var ret = Infinity;
    for (var i = 0; i < ary.length; i++)
      ret = Math.min(ret, func.call(opt_this, ary[i], i));
    return ret;
  };

  Statistics.range = function(ary, opt_func, opt_this) {
    var func = opt_func || identity;
    var ret = new tvcm.Range();
    for (var i = 0; i < ary.length; i++)
      ret.addValue(func.call(opt_this, ary[i], i));
    return ret;
  }

  Statistics.percentile = function(ary, percent, opt_func, opt_this) {
    if (!(percent >= 0 && percent <= 1))
      throw new Error('percent must be [0,1]');

    var func = opt_func || identity;
    var tmp = new Array(ary.length);
    for (var i = 0; i < ary.length; i++)
      tmp[i] = func.call(opt_this, ary[i], i);
    tmp.sort();
    var idx = Math.floor((ary.length - 1) * percent);
    return tmp[idx];
  };

  return {
    Statistics: Statistics
  };
});
