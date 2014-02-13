// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.unittest');
tvcm.require('tracing.test_utils');
tvcm.require('tracing.filter');

tvcm.unittest.testSuite('tracing.filter_test', function() {
  var TitleFilter = tracing.TitleFilter;
  var ExactTitleFilter = tracing.ExactTitleFilter;

  test('titleFilter', function() {
    assertThrows(function() {
      new TitleFilter();
    });
    assertThrows(function() {
      new TitleFilter('');
    });

    var s0 = tracing.test_utils.newSliceNamed('a', 1, 3);
    assertTrue(new TitleFilter('a').matchSlice(s0));
    assertFalse(new TitleFilter('x').matchSlice(s0));

    var s1 = tracing.test_utils.newSliceNamed('ba', 1, 3);
    assertTrue(new TitleFilter('a').matchSlice(s1));
    assertTrue(new TitleFilter('ba').matchSlice(s1));
    assertFalse(new TitleFilter('x').matchSlice(s1));

    var s2 = tracing.test_utils.newSliceNamed('Ca', 1, 3);
    assertTrue(new TitleFilter('A').matchSlice(s2));
    assertTrue(new TitleFilter('cA').matchSlice(s2));
    assertFalse(new TitleFilter('X').matchSlice(s2));
  });

  test('exactTitleFilter', function() {
    assertThrows(function() {
      new ExactTitleFilter();
    });
    assertThrows(function() {
      new ExactTitleFilter('');
    });

    var s0 = tracing.test_utils.newSliceNamed('a', 1, 3);
    assertTrue(new ExactTitleFilter('a').matchSlice(s0));
    assertFalse(new ExactTitleFilter('b').matchSlice(s0));
    assertFalse(new ExactTitleFilter('A').matchSlice(s0));

    var s1 = tracing.test_utils.newSliceNamed('abc', 1, 3);
    assertTrue(new ExactTitleFilter('abc').matchSlice(s1));
    assertFalse(new ExactTitleFilter('Abc').matchSlice(s1));
    assertFalse(new ExactTitleFilter('bc').matchSlice(s1));
    assertFalse(new ExactTitleFilter('a').matchSlice(s1));
  });
});
