// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('tracing.tracks.track');
base.require('tracing.filter');
base.require('ui');

base.exportTo('tracing.tracks', function() {

  /**
   * A generic track that contains other tracks as its children.
   * @constructor
   */
  var ContainerTrack = ui.define('container-track', tracing.tracks.Track);
  ContainerTrack.prototype = {
    __proto__: tracing.tracks.Track.prototype,

    decorate: function(viewport) {
      tracing.tracks.Track.prototype.decorate.call(this, viewport);
      this.categoryFilter_ = new tracing.Filter();
      this.headingWidth_ = undefined;
      this.tracks_ = [];
    },

    detach: function() {
      this.detachAllChildren();
    },

    detachAllChildren: function() {
      for (var i = 0; i < this.tracks_.length; i++)
        this.tracks_[i].detach();
      this.tracks_ = [];
      this.textContent = '';
    },

    get firstCanvas() {
      for (var i = 0; i < this.tracks_.length; i++)
        if (this.tracks_[i].visible)
          return this.tracks_[i].firstCanvas;
        return undefined;
    },

    get tracks() {
      return this.tracks_;
    },

    // The number of tracks actually displayed.
    get numVisibleTracks() {
      if (!this.visible)
        return 0;
      return this.numVisibleChildTracks;
    },

    // The number of tracks that would be displayed if this track were visible.
    get numVisibleChildTracks() {
      var sum = 0;
      for (var i = 0; i < this.tracks_.length; ++i) {
        sum += this.tracks_[i].numVisibleTracks;
      }
      return sum;
    },

    get headingWidth() {
      return this.headingWidth_;
    },

    set headingWidth(w) {
      this.headingWidth_ = w;
      for (var i = 0; i < this.tracks_.length; ++i) {
        this.tracks_[i].headingWidth = w;
      }
    },

    get categoryFilter() {
      return this.categoryFilter_;
    },

    set categoryFilter(v) {
      this.categoryFilter_ = v;
      for (var i = 0; i < this.tracks_.length; ++i) {
        this.tracks_[i].categoryFilter = v;
      }
      this.applyCategoryFilter_();
      this.updateFirstVisibleChildCSS();
    },

    applyCategoryFilter_: function() {
    },

    addTrack_: function(track) {
      track.headingWidth = this.headingWidth_;
      track.categoryFilter = this.categoryFilter;

      this.tracks_.push(track);
      this.appendChild(track);
      return track;
    },

    updateFirstVisibleChildCSS: function() {
      var isFirst = true;
      for (var i = 0; i < this.tracks_.length; ++i) {
        var track = this.tracks_[i];
        if (isFirst && track.visible) {
          track.classList.add('first-visible-child');
          isFirst = false;
        } else {
          track.classList.remove('first-visible-child');
        }
      }
    },

    /**
     * Adds items intersecting the given range to a selection.
     * @param {number} loVX Lower X bound of the interval to search, in
     *     viewspace.
     * @param {number} hiVX Upper X bound of the interval to search, in
     *     viewspace.
     * @param {number} loY Lower Y bound of the interval to search, in
     *     viewspace space.
     * @param {number} hiY Upper Y bound of the interval to search, in
     *     viewspace space.
     * @param {Selection} selection Selection to which to add hits.
     */
    addIntersectingItemsInRangeToSelection: function(
        loVX, hiVX, loY, hiY, selection) {
      for (var i = 0; i < this.tracks_.length; i++) {
        var trackClientRect = this.tracks_[i].getBoundingClientRect();
        var a = Math.max(loY, trackClientRect.top);
        var b = Math.min(hiY, trackClientRect.bottom);
        if (a <= b)
          this.tracks_[i].addIntersectingItemsInRangeToSelection(
              loVX, hiVX, loY, hiY, selection);
      }
    },

    addAllObjectsMatchingFilterToSelection: function(filter, selection) {
      for (var i = 0; i < this.tracks_.length; i++)
        this.tracks_[i].addAllObjectsMatchingFilterToSelection(
            filter, selection);
    }
  };

  return {
    ContainerTrack: ContainerTrack
  };
});
