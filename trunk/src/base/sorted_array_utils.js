// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Helper functions for doing intersections and iteration
 * over sorted arrays and intervals.
 *
 */
base.exportTo('base', function() {
  /**
   * Finds the first index in the array whose value is >= loVal.
   *
   * The key for the search is defined by the mapFn. This array must
   * be prearranged such that ary.map(mapFn) would also be sorted in
   * ascending order.
   *
   * @param {Array} ary An array of arbitrary objects.
   * @param {function():*} mapFn Callback that produces a key value
   *     from an element in ary.
   * @param {number} loVal Value for which to search.
   * @return {Number} Offset o into ary where all ary[i] for i <= o
   *     are < loVal, or ary.length if loVal is greater than all elements in
   *     the array.
   */
  function findLowIndexInSortedArray(ary, mapFn, loVal) {
    if (ary.length == 0)
      return 1;

    var low = 0;
    var high = ary.length - 1;
    var i, comparison;
    var hitPos = -1;
    while (low <= high) {
      i = Math.floor((low + high) / 2);
      comparison = mapFn(ary[i]) - loVal;
      if (comparison < 0) {
        low = i + 1; continue;
      } else if (comparison > 0) {
        high = i - 1; continue;
      } else {
        hitPos = i;
        high = i - 1;
      }
    }
    // return where we hit, or failing that the low pos
    return hitPos != -1 ? hitPos : low;
  }

  /**
   * Finds an index in an array of intervals that either
   * intersects the provided loVal, or if no intersection is found,
   * the index of the first interval whose start is > loVal.
   *
   * The array of intervals is defined implicitly via two mapping functions
   * over the provided ary. mapLoFn determines the lower value of the interval,
   * mapWidthFn the width. Intersection is lower-inclusive, e.g. [lo,lo+w).
   *
   * The array of intervals formed by this mapping must be non-overlapping and
   * sorted in ascending order by loVal.
   *
   * @param {Array} ary An array of objects that can be converted into sorted
   *     nonoverlapping ranges [x,y) using the mapLoFn and mapWidth.
   * @param {function():*} mapLoFn Callback that produces the low value for the
   *     interval represented by an  element in the array.
   * @param {function():*} mapWidthFn Callback that produces the width for the
   *     interval represented by an  element in the array.
   * @param {number} loVal The low value for the search.
   * @return {Number} An index in the array that intersects or is first-above
   *     loVal, -1 if none found and loVal is below than all the intervals,
   *     ary.length if loVal is greater than all the intervals.
   */
  function findLowIndexInSortedIntervals(ary, mapLoFn, mapWidthFn, loVal) {
    var first = findLowIndexInSortedArray(ary, mapLoFn, loVal);
    if (first == 0) {
      if (loVal >= mapLoFn(ary[0]) &&
          loVal < mapLoFn(ary[0]) + mapWidthFn(ary[0], 0)) {
        return 0;
      } else {
        return -1;
      }
    } else if (first < ary.length) {
      if (loVal >= mapLoFn(ary[first]) &&
          loVal < mapLoFn(ary[first]) + mapWidthFn(ary[first], first)) {
        return first;
      } else if (loVal >= mapLoFn(ary[first - 1]) &&
                 loVal < mapLoFn(ary[first - 1]) +
                 mapWidthFn(ary[first - 1], first - 1)) {
        return first - 1;
      } else {
        return ary.length;
      }
    } else if (first == ary.length) {
      if (loVal >= mapLoFn(ary[first - 1]) &&
          loVal < mapLoFn(ary[first - 1]) +
          mapWidthFn(ary[first - 1], first - 1)) {
        return first - 1;
      } else {
        return ary.length;
      }
    } else {
      return ary.length;
    }
  }

  /**
   * Calls cb for all intervals in the implicit array of intervals
   * defnied by ary, mapLoFn and mapHiFn that intersect the range
   * [loVal,hiVal)
   *
   * This function uses the same scheme as findLowIndexInSortedArray
   * to define the intervals. The same restrictions on sortedness and
   * non-overlappingness apply.
   *
   * @param {Array} ary An array of objects that can be converted into sorted
   * nonoverlapping ranges [x,y) using the mapLoFn and mapWidth.
   * @param {function():*} mapLoFn Callback that produces the low value for the
   * interval represented by an element in the array.
   * @param {function():*} mapLoFn Callback that produces the width for the
   * interval represented by an element in the array.
   * @param {number} The low value for the search, inclusive.
   * @param {number} loVal The high value for the search, non inclusive.
   * @param {function():*} cb The function to run for intersecting intervals.
   */
  function iterateOverIntersectingIntervals(ary, mapLoFn, mapWidthFn, loVal,
                                            hiVal, cb) {
    if (ary.length == 0)
      return;

    if (loVal > hiVal) return;

    var i = findLowIndexInSortedArray(ary, mapLoFn, loVal);
    if (i == -1) {
      return;
    }
    if (i > 0) {
      var hi = mapLoFn(ary[i - 1]) + mapWidthFn(ary[i - 1], i - 1);
      if (hi >= loVal) {
        cb(ary[i - 1]);
      }
    }
    if (i == ary.length) {
      return;
    }

    for (var n = ary.length; i < n; i++) {
      var lo = mapLoFn(ary[i]);
      if (lo >= hiVal)
        break;
      cb(ary[i]);
    }
  }

  /**
   * Non iterative version of iterateOverIntersectingIntervals.
   *
   * @return {Array} Array of elements in ary that intersect loVal, hiVal.
   */
  function getIntersectingIntervals(ary, mapLoFn, mapWidthFn, loVal, hiVal) {
    var tmp = [];
    iterateOverIntersectingIntervals(ary, mapLoFn, mapWidthFn, loVal, hiVal,
                                     function(d) {
                                       tmp.push(d);
                                     });
    return tmp;
  }

  /**
   * Finds the element in the array whose value is closest to |val|.
   *
   * The same restrictions on sortedness as for findLowIndexInSortedArray apply.
   *
   * @param {Array} ary An array of arbitrary objects.
   * @param {function():*} mapFn Callback that produces a key value
   *     from an element in ary.
   * @param {number} val Value for which to search.
   * @param {number} maxDiff Maximum allowed difference in value between |val|
   *     and an element's value.
   * @return {object} Object in the array whose value is closest to |val|, or
   *     null if no object is within range.
   */
  function findClosestElementInSortedArray(ary, mapFn, val, maxDiff) {
    if (ary.length === 0)
      return null;

    var aftIdx = findLowIndexInSortedArray(ary, mapFn, val);
    var befIdx = aftIdx > 0 ? aftIdx - 1 : 0;

    if (aftIdx === ary.length)
      aftIdx -= 1;

    var befDiff = Math.abs(val - mapFn(ary[befIdx]));
    var aftDiff = Math.abs(val - mapFn(ary[aftIdx]));

    if (befDiff > maxDiff && aftDiff > maxDiff)
      return null;

    var idx = befDiff < aftDiff ? befIdx : aftIdx;
    return ary[idx];
  }

  /**
   * Finds the closest interval in the implicit array of intervals
   * defined by ary, mapLoFn and mapHiFn.
   *
   * This function uses the same scheme as findLowIndexInSortedArray
   * to define the intervals. The same restrictions on sortedness and
   * non-overlappingness apply.
   *
   * @param {Array} ary An array of objects that can be converted into sorted
   *     nonoverlapping ranges [x,y) using the mapLoFn and mapHiFn.
   * @param {function():*} mapLoFn Callback that produces the low value for the
   *     interval represented by an element in the array.
   * @param {function():*} mapHiFn Callback that produces the high for the
   *     interval represented by an element in the array.
   * @param {number} val The value for the search.
   * @param {number} maxDiff Maximum allowed difference in value between |val|
   *     and an interval's low or high value.
   * @return {interval} Interval in the array whose high or low value is closest
   *     to |val|, or null if no interval is within range.
   */
  function findClosestIntervalInSortedIntervals(ary, mapLoFn, mapHiFn, val,
                                                maxDiff) {
    if (ary.length === 0)
      return null;

    var idx = findLowIndexInSortedArray(ary, mapLoFn, val);
    if (idx > 0)
      idx -= 1;

    var hiInt = ary[idx];
    var loInt = hiInt;

    if (val > mapHiFn(hiInt) && idx + 1 < ary.length)
      loInt = ary[idx + 1];

    var loDiff = Math.abs(val - mapLoFn(loInt));
    var hiDiff = Math.abs(val - mapHiFn(hiInt));

    if (loDiff > maxDiff && hiDiff > maxDiff)
      return null;

    if (loDiff < hiDiff)
      return loInt;
    else
      return hiInt;
  }

  return {
    findLowIndexInSortedArray: findLowIndexInSortedArray,
    findLowIndexInSortedIntervals: findLowIndexInSortedIntervals,
    iterateOverIntersectingIntervals: iterateOverIntersectingIntervals,
    getIntersectingIntervals: getIntersectingIntervals,
    findClosestElementInSortedArray: findClosestElementInSortedArray,
    findClosestIntervalInSortedIntervals: findClosestIntervalInSortedIntervals
  };
});
