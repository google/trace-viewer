// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('tracing.tracks.heading_track');
base.require('tracing.color_scheme');
base.require('ui');

base.exportTo('tracing.tracks', function() {

  /**
   * A track that displays traces as stacked bars.
   * @constructor
   * @extends {HeadingTrack}
   */

  var StackedBarsTrack = ui.define(
      'stacked-bars-track', tracing.tracks.HeadingTrack);

  StackedBarsTrack.prototype = {

    __proto__: tracing.tracks.HeadingTrack.prototype,

    decorate: function(viewport) {
      tracing.tracks.HeadingTrack.prototype.decorate.call(this, viewport);
      this.classList.add('stacked-bars-track');
      this.objectInstance_ = null;
    },

    addEventsToTrackMap: function(eventToTrackMap) {
      var objectSnapshots = this.objectInstance_.snapshots;
      objectSnapshots.forEach(function(obj) {
        eventToTrackMap.addEvent(obj, this);
      }, this);
    },

    /**
     * Used to hit-test clicks in the graph.
     */
    addIntersectingItemsInRangeToSelectionInWorldSpace: function(
        loWX, hiWX, viewPixWidthWorld, selection) {
      function onSnapshot(snapshot) {
        selection.push(snapshot);
      }

      var snapshots = this.objectInstance_.snapshots;
      var maxBounds = this.objectInstance_.parent.model.bounds.max;

      base.iterateOverIntersectingIntervals(
          snapshots,
          function(x) { return x.ts; },
          function(x, i) {
            if (i == snapshots.length - 1) {
              if (snapshots.length == 1)
                return maxBounds;

              return snapshots[i].ts - snapshots[i - 1].ts;
            }

            return snapshots[i + 1].ts - snapshots[i].ts;
          },
          loWX, hiWX,
          onSnapshot);
    },

    /**
     * Add the item to the left or right of the provided item, if any, to the
     * selection.
     * @param {slice} The current slice.
     * @param {Number} offset Number of slices away from the object to look.
     * @param {Selection} selection The selection to add an event to,
     * if found.
     * @return {boolean} Whether an event was found.
     * @private
     */
    addItemNearToProvidedEventToSelection: function(event, offset, selection) {
      if (!(event instanceof tracing.trace_model.ObjectSnapshot))
        throw new Error('Unrecognized event');
      var objectSnapshots = this.objectInstance_.snapshots;
      var index = objectSnapshots.indexOf(event);
      var newIndex = index + offset;
      if (newIndex >= 0 && newIndex < objectSnapshots.length) {
        selection.push(objectSnapshots[newIndex]);
        return true;
      }
      return false;
    },

    addAllObjectsMatchingFilterToSelection: function(filter, selection) {
    },

    addClosestEventToSelection: function(worldX, worldMaxDist, loY, hiY,
                                         selection) {
      var snapshot = base.findClosestElementInSortedArray(
          this.objectInstance_.snapshots,
          function(x) { return x.ts; },
          worldX,
          worldMaxDist);

      if (!snapshot)
        return;

      selection.push(snapshot);
    }
  };

  return {
    StackedBarsTrack: StackedBarsTrack
  };
});
