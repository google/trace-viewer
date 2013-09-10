// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('base.sorted_array_utils');

base.unittest.testSuite('base.sorted_array_utils', function() {
  var ArrayOfIntervals = function(array) {
    this.array = array;
  }

  ArrayOfIntervals.prototype = {

    get: function(index) {
      return this.array[index];
    },

    findLowElementIndex: function(ts) {
      return base.findLowIndexInSortedArray(
          this.array,
          function(x) { return x.lo; },
          ts);
    },

    findLowIntervalIndex: function(ts) {
      return base.findLowIndexInSortedIntervals(
          this.array,
          function(x) { return x.lo; },
          function(x) { return x.hi - x.lo; },
          ts);
    },

    findIntersectingIntervals: function(tsA, tsB) {
      var array = this.array;
      var result = [];
      base.iterateOverIntersectingIntervals(
          this.array,
          function(x) { return x.lo; },
          function(x) { return x.hi - x.lo; },
          tsA,
          tsB,
          function(x) { result.push(array.indexOf(x)); });
      return result;
    },

    findClosestElement: function(ts, tsDiff) {
      return base.findClosestElementInSortedArray(
          this.array,
          function(x) { return x.lo; },
          ts,
          tsDiff);
    },

    findClosestInterval: function(ts, tsDiff) {
      return base.findClosestIntervalInSortedIntervals(
          this.array,
          function(x) { return x.lo; },
          function(x) { return x.hi; },
          ts,
          tsDiff);
    }
  };

  test('findLowElementIndex', function() {
    var array = new ArrayOfIntervals([
      {lo: 10, hi: 15},
      {lo: 20, hi: 30}
    ]);

    assertEquals(0, array.findLowElementIndex(-100));
    assertEquals(0, array.findLowElementIndex(0));
    assertEquals(0, array.findLowElementIndex(10));

    assertEquals(1, array.findLowElementIndex(10.1));
    assertEquals(1, array.findLowElementIndex(15));
    assertEquals(1, array.findLowElementIndex(20));

    assertEquals(2, array.findLowElementIndex(20.1));
    assertEquals(2, array.findLowElementIndex(21));
    assertEquals(2, array.findLowElementIndex(100));
  });

  test('findLowIntervalIndex', function() {
    var array = new ArrayOfIntervals([
      {lo: 10, hi: 15},
      {lo: 20, hi: 30}
    ]);

    assertEquals(-1, array.findLowIntervalIndex(0));
    assertEquals(-1, array.findLowIntervalIndex(9.9));

    assertEquals(0, array.findLowIntervalIndex(10));
    assertEquals(0, array.findLowIntervalIndex(12));
    assertEquals(0, array.findLowIntervalIndex(14.9));

    // These two are a little odd... the return is correct in that
    // it was not found, but its neither below, nor above. Whatever.
    assertEquals(2, array.findLowIntervalIndex(15));
    assertEquals(2, array.findLowIntervalIndex(19.9));

    assertEquals(1, array.findLowIntervalIndex(20));
    assertEquals(1, array.findLowIntervalIndex(21));
    assertEquals(1, array.findLowIntervalIndex(29.99));

    assertEquals(2, array.findLowIntervalIndex(30));
    assertEquals(2, array.findLowIntervalIndex(40));
  });

  test('findIntersectingIntervals', function() {
    var array = new ArrayOfIntervals([
      {lo: 10, hi: 15},
      {lo: 20, hi: 30}
    ]);

    assertArrayEquals([], array.findIntersectingIntervals(0, 0));
    assertArrayEquals([], array.findIntersectingIntervals(100, 0));
    assertArrayEquals([], array.findIntersectingIntervals(0, 10));

    assertArrayEquals([0], array.findIntersectingIntervals(0, 10.1));
    assertArrayEquals([0], array.findIntersectingIntervals(5, 15));
    assertArrayEquals([0], array.findIntersectingIntervals(15, 20));

    assertArrayEquals([], array.findIntersectingIntervals(15.1, 20));

    assertArrayEquals([1], array.findIntersectingIntervals(15.1, 20.1));
    assertArrayEquals([1], array.findIntersectingIntervals(20, 30));
    assertArrayEquals([1], array.findIntersectingIntervals(30, 100));

    assertArrayEquals([0, 1], array.findIntersectingIntervals(0, 100));
    assertArrayEquals([0, 1], array.findIntersectingIntervals(15, 20.1));
  });

  test('findClosestElement', function() {
    var array = new ArrayOfIntervals([
      {lo: 10, hi: 15},
      {lo: 20, hi: 30}
    ]);

    // Test the helper method first.
    assertEquals(array.get(-1), undefined);
    assertEquals(array.get(0), array.array[0]);
    assertEquals(array.get(1), array.array[1]);
    assertEquals(array.get(2), undefined);

    assertEquals(null, array.findClosestElement(0, 0));
    assertEquals(null, array.findClosestElement(0, 9.9));
    assertEquals(null, array.findClosestElement(10, -10));

    assertEquals(array.get(0), array.findClosestElement(0, 10));
    assertEquals(array.get(0), array.findClosestElement(8, 5));
    assertEquals(array.get(0), array.findClosestElement(10, 0));
    assertEquals(array.get(0), array.findClosestElement(12, 2));

    assertEquals(null, array.findClosestElement(15, 3));
    assertNotEquals(null, array.findClosestElement(15, 5));

    assertEquals(array.get(1), array.findClosestElement(19, 1));
    assertEquals(array.get(1), array.findClosestElement(20, 0));
    assertEquals(array.get(1), array.findClosestElement(30, 15));

    assertEquals(null, array.findClosestElement(30, 9.9));
    assertEquals(null, array.findClosestElement(100, 50));
  });

  test('findClosestInterval', function() {
    var array = new ArrayOfIntervals([
      {lo: 10, hi: 15},
      {lo: 20, hi: 30}
    ]);

    assertEquals(null, array.findClosestInterval(0, 0));
    assertEquals(null, array.findClosestInterval(0, 9.9));
    assertEquals(null, array.findClosestInterval(0, -100));

    assertEquals(array.get(0), array.findClosestInterval(0, 10));
    assertEquals(array.get(0), array.findClosestInterval(10, 0));
    assertEquals(array.get(0), array.findClosestInterval(12, 3));
    assertEquals(array.get(0), array.findClosestInterval(12, 100));

    assertEquals(array.get(0), array.findClosestInterval(13, 3));
    assertEquals(array.get(0), array.findClosestInterval(13, 20));
    assertEquals(array.get(0), array.findClosestInterval(15, 0));

    assertEquals(null, array.findClosestInterval(17.5, 0));
    assertEquals(null, array.findClosestInterval(17.5, 2.4));
    assertNotEquals(null, array.findClosestInterval(17.5, 2.5));
    assertNotEquals(null, array.findClosestInterval(17.5, 10));

    assertEquals(array.get(1), array.findClosestInterval(19, 2));
    assertEquals(array.get(1), array.findClosestInterval(20, 0));
    assertEquals(array.get(1), array.findClosestInterval(24, 100));
    assertEquals(array.get(1), array.findClosestInterval(26, 100));

    assertEquals(array.get(1), array.findClosestInterval(30, 0));
    assertEquals(array.get(1), array.findClosestInterval(35, 10));
    assertEquals(array.get(1), array.findClosestInterval(50, 100));

    assertEquals(null, array.findClosestInterval(50, 19));
    assertEquals(null, array.findClosestInterval(100, 50));
    assertEquals(null, array.findClosestInterval(50, -100));
  });
});
