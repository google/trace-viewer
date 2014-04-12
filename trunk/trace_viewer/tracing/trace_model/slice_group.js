// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Provides the SliceGroup class.
 */
tvcm.require('tvcm.range');
tvcm.require('tracing.trace_model.slice');
tvcm.require('tracing.color_scheme');
tvcm.require('tracing.filter');

tvcm.exportTo('tracing.trace_model', function() {
  var Slice = tracing.trace_model.Slice;

  /**
   * A group of Slices, plus code to create them from B/E events, as
   * well as arrange them into subRows.
   *
   * Do not mutate the slices array directly. Modify it only by
   * SliceGroup mutation methods.
   *
   * @constructor
   * @param {function(new:Slice, category, title, colorId, start, args)=}
   *     opt_sliceConstructor The constructor to use when creating slices.
   */
  function SliceGroup(opt_sliceConstructor) {
    var sliceConstructor = opt_sliceConstructor || Slice;
    this.sliceConstructor = sliceConstructor;

    this.openPartialSlices_ = [];

    this.slices = [];
    this.bounds = new tvcm.Range();
    this.topLevelSlices = [];
  }

  SliceGroup.prototype = {
    __proto__: Object.prototype,

    /**
     * @return {Number} The number of slices in this group.
     */
    get length() {
      return this.slices.length;
    },

    /**
     * Helper function that pushes the provided slice onto the slices array.
     * @param {Slice} slice The slice to be added to the slices array.
     */
    pushSlice: function(slice) {
      this.slices.push(slice);
      return slice;
    },

    /**
     * Helper function that pushes the provided slice onto the slices array.
     * @param {Array.<Slice>} slices An array of slices to be added.
     */
    pushSlices: function(slices) {
      this.slices.push.apply(this.slices, slices);
    },

    /**
     * Push an instant event into the slice list.
     * @param {tracing.trace_model.InstantEvent} instantEvent The instantEvent.
     */
    pushInstantEvent: function(instantEvent) {
      this.slices.push(instantEvent);
    },

    /**
     * Opens a new slice in the group's slices.
     *
     * Calls to beginSlice and
     * endSlice must be made with non-monotonically-decreasing timestamps.
     *
     * @param {String} category Category name of the slice to add.
     * @param {String} title Title of the slice to add.
     * @param {Number} ts The timetsamp of the slice, in milliseconds.
     * @param {Object.<string, Object>=} opt_args Arguments associated with
     * the slice.
     */
    beginSlice: function(category, title, ts, opt_args, opt_tts) {
      if (this.openPartialSlices_.length) {
        var prevSlice = this.openPartialSlices_[
            this.openPartialSlices_.length - 1];
        if (ts < prevSlice.start)
          throw new Error('Slices must be added in increasing timestamp order');
      }

      var colorId = tvcm.ui.getStringColorId(title);
      var slice = new this.sliceConstructor(category, title, colorId, ts,
                                            opt_args ? opt_args : {}, null,
                                            opt_tts);
      this.openPartialSlices_.push(slice);
      slice.didNotFinish = true;
      this.pushSlice(slice);

      return slice;
    },

    isTimestampValidForBeginOrEnd: function(ts) {
      if (!this.openPartialSlices_.length)
        return true;
      var top = this.openPartialSlices_[this.openPartialSlices_.length - 1];
      return ts >= top.start;
    },

    /**
     * @return {Number} The number of beginSlices for which an endSlice has not
     * been issued.
     */
    get openSliceCount() {
      return this.openPartialSlices_.length;
    },

    get mostRecentlyOpenedPartialSlice() {
      if (!this.openPartialSlices_.length)
        return undefined;
      return this.openPartialSlices_[this.openPartialSlices_.length - 1];
    },

    /**
     * Ends the last begun slice in this group and pushes it onto the slice
     * array.
     *
     * @param {Number} ts Timestamp when the slice ended.
     * @return {Slice} slice.
     */
    endSlice: function(ts, opt_tts) {
      if (!this.openSliceCount)
        throw new Error('endSlice called without an open slice');

      var slice = this.openPartialSlices_[this.openSliceCount - 1];
      this.openPartialSlices_.splice(this.openSliceCount - 1, 1);
      if (ts < slice.start)
        throw new Error('Slice ' + slice.title +
                        ' end time is before its start.');

      slice.duration = ts - slice.start;
      slice.didNotFinish = false;

      if (opt_tts && slice.cpuStart !== undefined)
        slice.cpuDuration = opt_tts - slice.cpuStart;

      return slice;
    },

    /**
     * Push a complete event as a Slice into the slice list.
     * The timestamp can be in any order.
     *
     * @param {String} category Category name of the slice to add.
     * @param {String} title Title of the slice to add.
     * @param {Number} ts The timetsamp of the slice, in milliseconds.
     * @param {Number} duration The duration of the slice, in milliseconds.
     * @param {Object.<string, Object>=} opt_args Arguments associated with
     * the slice.
     */
    pushCompleteSlice: function(category, title, ts, duration, tts,
                                cpuDuration, opt_args) {
      var colorId = tvcm.ui.getStringColorId(title);
      var slice = new this.sliceConstructor(category, title, colorId, ts,
                                            opt_args ? opt_args : {},
                                            duration, tts, cpuDuration);
      if (duration === undefined)
        slice.didNotFinish = true;
      this.pushSlice(slice);
      return slice;
    },

    /**
     * Closes any open slices.
     * @param {Number=} opt_maxTimestamp The end time to use for the closed
     * slices. If not provided,
     * the max timestamp for this slice is provided.
     */
    autoCloseOpenSlices: function(opt_maxTimestamp) {
      if (!opt_maxTimestamp) {
        this.updateBounds();
        opt_maxTimestamp = this.bounds.max;
      }
      for (var sI = 0; sI < this.slices.length; sI++) {
        var slice = this.slices[sI];
        if (slice.didNotFinish)
          slice.duration = opt_maxTimestamp - slice.start;
      }
      this.openPartialSlices_ = [];
    },

    /**
     * Shifts all the timestamps inside this group forward by the amount
     * specified.
     */
    shiftTimestampsForward: function(amount) {
      for (var sI = 0; sI < this.slices.length; sI++) {
        var slice = this.slices[sI];
        slice.start = (slice.start + amount);
      }
    },

    /**
     * Updates the bounds for this group based on the slices it contains.
     */
    updateBounds: function() {
      this.bounds.reset();
      for (var i = 0; i < this.slices.length; i++) {
        this.bounds.addValue(this.slices[i].start);
        this.bounds.addValue(this.slices[i].end);
      }
    },

    copySlice: function(slice) {
      var newSlice = new this.sliceConstructor(slice.category, slice.title,
          slice.colorId, slice.start,
          slice.args, slice.duration, slice.cpuStart, slice.cpuDuration);
      newSlice.didNotFinish = slice.didNotFinish;
      return newSlice;
    },

    iterateAllEvents: function(callback, opt_this) {
      this.slices.forEach(callback, opt_this);
    },

    /**
     * Construct subSlices for this group.
     * Populate the group topLevelSlices, parent slices get a subSlices[],
     * a selfThreadTime and a selfTime, child slices get a parentSlice
     * reference.
     */
    createSubSlices: function() {
      function addSliceIfBounds(root, child) {
        // Because we know that the start time of child is >= the start time
        // of all other slices seen so far, we can just check the last slice
        // of each row for bounding.
        if (root.bounds(child)) {
          if (root.subSlices && root.subSlices.length > 0) {
            if (addSliceIfBounds(root.subSlices[root.subSlices.length - 1],
                                 child))
              return true;
          }
          if (!root.selfTime)
            root.selfTime = root.duration;
          if (!root.cpuSelfTime && root.cpuDuration)
            root.cpuSelfTime = root.cpuDuration;
          child.parentSlice = root;
          if (!root.subSlices)
            root.subSlices = [];
          root.subSlices.push(child);
          root.selfTime -= child.duration;
          if (child.cpuDuration)
            root.cpuSelfTime -= child.cpuDuration;
          return true;
        }
        return false;
      }

      if (!this.slices.length)
        return;

      var ops = [];
      for (var i = 0; i < this.slices.length; i++) {
        if (this.slices[i].subSlices)
          this.slices[i].subSlices.splice(0,
                                          this.slices[i].subSlices.length);
        ops.push(i);
      }

      var groupSlices = this.slices;
      ops.sort(function(ix, iy) {
        var x = groupSlices[ix];
        var y = groupSlices[iy];
        if (x.start != y.start)
          return x.start - y.start;

        // Elements get inserted into the slices array in order of when the
        // slices start. Because slices must be properly nested, we break
        // start-time ties by assuming that the elements appearing earlier
        // in the slices array (and thus ending earlier) start earlier.
        return ix - iy;
      });

      var rootSlice = this.slices[ops[0]];
      this.topLevelSlices = [];
      this.topLevelSlices.push(rootSlice);
      for (var i = 1; i < ops.length; i++) {
        var slice = this.slices[ops[i]];
        if (!addSliceIfBounds(rootSlice, slice)) {
          rootSlice = slice;
          this.topLevelSlices.push(rootSlice);
        }
      }
    }
  };

  /**
   * Merge two slice groups.
   *
   * If the two groups do not nest properly some of the slices of groupB will
   * be split to accomodate the improper nesting.  This is done to accomodate
   * combined kernel and userland call stacks on Android.  Because userland
   * tracing is done by writing to the trace_marker file, the kernel calls
   * that get invoked as part of that write may not be properly nested with
   * the userland call trace.  For example the following sequence may occur:
   *
   *     kernel enter sys_write        (the write to trace_marker)
   *     user   enter some_function
   *     kernel exit  sys_write
   *     ...
   *     kernel enter sys_write        (the write to trace_marker)
   *     user   exit  some_function
   *     kernel exit  sys_write
   *
   * This is handled by splitting the sys_write call into two slices as
   * follows:
   *
   *     | sys_write |            some_function            | sys_write (cont.) |
   *                 | sys_write (cont.) |     | sys_write |
   *
   * The colorId of both parts of the split slices are kept the same, and the
   * " (cont.)" suffix is appended to the later parts of a split slice.
   *
   * The two input SliceGroups are not modified by this, and the merged
   * SliceGroup will contain a copy of each of the input groups' slices (those
   * copies may be split).
   */
  SliceGroup.merge = function(groupA, groupB) {
    // This is implemented by traversing the two slice groups in reverse
    // order.  The slices in each group are sorted by ascending end-time, so
    // we must do the traversal from back to front in order to maintain the
    // sorting.
    //
    // We traverse the two groups simultaneously, merging as we go.  At each
    // iteration we choose the group from which to take the next slice based
    // on which group's next slice has the greater end-time.  During this
    // traversal we maintain a stack of currently "open" slices for each input
    // group.  A slice is considered "open" from the time it gets reached in
    // our input group traversal to the time we reach an slice in this
    // traversal with an end-time before the start time of the "open" slice.
    //
    // Each time a slice from groupA is opened or closed (events corresponding
    // to the end-time and start-time of the input slice, respectively) we
    // split all of the currently open slices from groupB.

    if (groupA.openPartialSlices_.length > 0) {
      throw new Error('groupA has open partial slices');
    }
    if (groupB.openPartialSlices_.length > 0) {
      throw new Error('groupB has open partial slices');
    }

    var result = new SliceGroup();

    var slicesA = groupA.slices;
    var slicesB = groupB.slices;
    var idxA = 0;
    var idxB = 0;
    var openA = [];
    var openB = [];

    var splitOpenSlices = function(when) {
      for (var i = 0; i < openB.length; i++) {
        var oldSlice = openB[i];
        var oldEnd = oldSlice.end;
        if (when < oldSlice.start || oldEnd < when) {
          throw new Error('slice should not be split');
        }

        var newSlice = result.copySlice(oldSlice);
        newSlice.start = when;
        newSlice.duration = oldEnd - when;
        if (newSlice.title.indexOf(' (cont.)') == -1)
          newSlice.title += ' (cont.)';
        oldSlice.duration = when - oldSlice.start;
        openB[i] = newSlice;
        result.pushSlice(newSlice);
      }
    };

    var closeOpenSlices = function(upTo) {
      while (openA.length > 0 || openB.length > 0) {
        var nextA = openA[openA.length - 1];
        var nextB = openB[openB.length - 1];
        var endA = nextA && nextA.end;
        var endB = nextB && nextB.end;

        if ((endA === undefined || endA > upTo) &&
            (endB === undefined || endB > upTo)) {
          return;
        }

        if (endB === undefined || endA < endB) {
          splitOpenSlices(endA);
          openA.pop();
        } else {
          openB.pop();
        }
      }
    };

    while (idxA < slicesA.length || idxB < slicesB.length) {
      var sA = slicesA[idxA];
      var sB = slicesB[idxB];
      var nextSlice, isFromB;

      if (sA === undefined || (sB !== undefined && sA.start > sB.start)) {
        nextSlice = result.copySlice(sB);
        isFromB = true;
        idxB++;
      } else {
        nextSlice = result.copySlice(sA);
        isFromB = false;
        idxA++;
      }

      closeOpenSlices(nextSlice.start);

      result.pushSlice(nextSlice);

      if (isFromB) {
        openB.push(nextSlice);
      } else {
        splitOpenSlices(nextSlice.start);
        openA.push(nextSlice);
      }
    }

    closeOpenSlices();

    return result;
  };

  return {
    SliceGroup: SliceGroup
  };
});
