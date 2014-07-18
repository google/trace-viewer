// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tracing.test_utils');
tvcm.require('tracing.find_control');

tvcm.unittest.testSuite('tracing.find_control_test', function() {
  test('instantiate', function() {
    var ctl = new tracing.FindControl();
    ctl.controller = {
      findNext: function() {
      },

      findPrevious: function() {
      },

      reset: function() {},

      filterHits: ['a', 'b'],

      currentHitIndex: 0
    };

    this.addHTMLOutput(ctl);
  });

});
