// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Code for the timeline viewport.
 */
base.require('range');
base.require('event_target');
base.exportTo('tracing', function() {

  function TimelineSelectionSliceHit(track, slice) {
    this.track = track;
    this.slice = slice;
  }
  TimelineSelectionSliceHit.prototype = {
    get selected() {
      return this.slice.selected;
    },
    set selected(v) {
      this.slice.selected = v;
    }
  };

  function TimelineSelectionCounterSampleHit(track, counter, sampleIndex) {
    this.track = track;
    this.counter = counter;
    this.sampleIndex = sampleIndex;
  }
  TimelineSelectionCounterSampleHit.prototype = {
    get selected() {
      return this.track.selectedSamples[this.sampleIndex] == true;
    },
    set selected(v) {
      if (v)
        this.track.selectedSamples[this.sampleIndex] = true;
      else
        this.track.selectedSamples[this.sampleIndex] = false;
      this.track.invalidate();
    }
  };


  /**
   * Represents a selection within a Timeline and its associated set of tracks.
   * @constructor
   */
  function TimelineSelection() {
    this.bounds_dirty_ = true;
    this.bounds_ = new base.Range();
    this.length_ = 0;
  }
  TimelineSelection.prototype = {
    __proto__: Object.prototype,

    get bounds() {
      if (this.bounds_dirty_) {
        this.bounds_.reset();
        for (var i = 0; i < this.length_; i++) {
          var hit = this[i];
          if (hit.slice) {
            this.bounds_.addValue(hit.slice.start);
            this.bounds_.addValue(hit.slice.end);
          }
        }
        this.bounds_dirty_ = false;
      }
      return this.bounds_;
    },

    get duration() {
      if (this.bounds_.isEmpty)
        return 0;
      return this.bounds_.max - this.bounds_.min;
    },

    get length() {
      return this.length_;
    },

    clear: function() {
      for (var i = 0; i < this.length_; ++i)
        delete this[i];
      this.length_ = 0;
      this.bounds_dirty_ = true;
    },

    pushHit: function(hit) {
      this.push_(hit);
    },

    push_: function(hit) {
      this[this.length_++] = hit;
      this.bounds_dirty_ = true;
      return hit;
    },

    addSlice: function(track, slice) {
      return this.push_(new TimelineSelectionSliceHit(track, slice));
    },

    addCounterSample: function(track, counter, sampleIndex) {
      return this.push_(
          new TimelineSelectionCounterSampleHit(
          track, counter, sampleIndex));
    },

    subSelection: function(index, count) {
      count = count || 1;

      var selection = new TimelineSelection();
      selection.bounds_dirty_ = true;
      if (index < 0 || index + count > this.length_)
        throw new Error('Index out of bounds');

      for (var i = index; i < index + count; i++)
        selection.push_(this[i]);

      return selection;
    },

    getCounterSampleHitsAsSelection: function() {
      var selection = new TimelineSelection();
      for (var i = 0; i < this.length_; i++)
        if (this[i] instanceof TimelineSelectionCounterSampleHit)
          selection.push_(this[i]);
      return selection;
    },

    getSliceHitsAsSelection: function() {
      var selection = new TimelineSelection();
      for (var i = 0; i < this.length_; i++)
        if (this[i] instanceof TimelineSelectionSliceHit)
          selection.push_(this[i]);
      return selection;
    },

    getNumSliceHits: function() {
      var numHits = 0;
      for (var i = 0; i < this.length_; i++)
        if (this[i] instanceof TimelineSelectionSliceHit)
          numHits++;
      return numHits;
    },

    getNumCounterHits: function() {
      var numHits = 0;
      for (var i = 0; i < this.length_; i++)
        if (this[i] instanceof TimelineSelectionCounterSampleHit)
          numHits++;
      return numHits;
    },

    map: function(fn) {
      for (var i = 0; i < this.length_; i++)
        fn(this[i]);
    },

    /**
     * Helper for selection previous or next.
     * @param {boolean} forwardp If true, select one forward (next).
     *   Else, select previous.
     * @return {boolean} true if current selection changed.
     */
    getShiftedSelection: function(offset) {
      var newSelection = new TimelineSelection();
      for (var i = 0; i < this.length_; i++) {
        var hit = this[i];
        hit.track.addItemNearToProvidedHitToSelection(
            hit, offset, newSelection);
      }

      if (newSelection.length == 0)
        return undefined;
      return newSelection;
    }
  };

  return {
    TimelineSelectionSliceHit: TimelineSelectionSliceHit,
    TimelineSelectionCounterSampleHit: TimelineSelectionCounterSampleHit,
    TimelineSelection: TimelineSelection
  };
});
