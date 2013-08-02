// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('base.unittest');

base.unittest.testSuite('base.unittest', function() {
  test('dpiAware', function() {
    var currentDevicePixelRatio = window.devicePixelRatio;
    var alternateDevicePixelRatio =
        currentDevicePixelRatio > 1 ? currentDevicePixelRatio : 2;

    var dpi = [];
    var names = [];
    var suite = function() {
      test('dpiTest', function() {
        dpi.push(window.devicePixelRatio);
        names.push(this.name);
      }, {dpiAware: true});
    };

    var ts = new base.unittest.TestSuite_('test', suite);
    ts.displayInfo();
    ts.runTests([]);

    assertEquals(2, ts.testCount);
    assertArrayEquals([1, alternateDevicePixelRatio], dpi.sort());
    assertArrayEquals(['dpiTest_hiDPI', 'dpiTest_loDPI'], names.sort());

    // Verify we reset back to the default value.
    assertEquals(currentDevicePixelRatio, window.devicePixelRatio);
  });
});
