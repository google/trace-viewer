// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.requireStylesheet('tcmalloc.heap_instance_track');

tvcm.require('tracing.tracks.stacked_bars_track');
tvcm.require('tracing.tracks.object_instance_track');
tvcm.require('tracing.color_scheme');
tvcm.require('tvcm.sorted_array_utils');
tvcm.require('tvcm.ui');

tvcm.exportTo('tcmalloc', function() {

  var EventPresenter = tracing.EventPresenter;

  /**
   * A track that displays heap memory data.
   * @constructor
   * @extends {StackedBarsTrack}
   */

  var HeapInstanceTrack = tvcm.ui.define(
      'heap-instance-track', tracing.tracks.StackedBarsTrack);

  HeapInstanceTrack.prototype = {

    __proto__: tracing.tracks.StackedBarsTrack.prototype,

    decorate: function(viewport) {
      tracing.tracks.StackedBarsTrack.prototype.decorate.call(this, viewport);
      this.classList.add('heap-instance-track');
      this.objectInstance_ = null;
    },

    set objectInstances(objectInstances) {
      if (!objectInstances) {
        this.objectInstance_ = [];
        return;
      }
      if (objectInstances.length != 1)
        throw new Error('Bad object instance count.');
      this.objectInstance_ = objectInstances[0];
      this.maxBytes_ = this.computeMaxBytes_(
          this.objectInstance_.snapshots);
    },

    computeMaxBytes_: function(snapshots) {
      var maxBytes = 0;
      for (var i = 0; i < snapshots.length; i++) {
        var snapshot = snapshots[i];
        // Sum all the current allocations in this snapshot.
        var traceNames = Object.keys(snapshot.heap_.children);
        var sumBytes = 0;
        for (var j = 0; j < traceNames.length; j++) {
          sumBytes += snapshot.heap_.children[traceNames[j]].currentBytes;
        }
        // Keep track of the maximum across all snapshots.
        if (sumBytes > maxBytes)
          maxBytes = sumBytes;
      }
      return maxBytes;
    },

    get height() {
      return window.getComputedStyle(this).height;
    },

    set height(height) {
      this.style.height = height;
    },

    draw: function(type, viewLWorld, viewRWorld) {
      switch (type) {
        case tracing.tracks.DrawType.SLICE:
          this.drawSlices_(viewLWorld, viewRWorld);
          break;
      }
    },

    drawSlices_: function(viewLWorld, viewRWorld) {
      var ctx = this.context();
      var pixelRatio = window.devicePixelRatio || 1;

      var bounds = this.getBoundingClientRect();
      var width = bounds.width * pixelRatio;
      var height = bounds.height * pixelRatio;

      // Culling parameters.
      var dt = this.viewport.currentDisplayTransform;

      // Scale by the size of the largest snapshot.
      var maxBytes = this.maxBytes_;

      var objectSnapshots = this.objectInstance_.snapshots;
      var lowIndex = tvcm.findLowIndexInSortedArray(
          objectSnapshots,
          function(snapshot) {
            return snapshot.ts;
          },
          viewLWorld);
      // Assure that the stack with the left edge off screen still gets drawn
      if (lowIndex > 0)
        lowIndex -= 1;

      for (var i = lowIndex; i < objectSnapshots.length; ++i) {
        var snapshot = objectSnapshots[i];

        var left = snapshot.ts;
        if (left > viewRWorld)
          break;
        var leftView = dt.xWorldToView(left);
        if (leftView < 0)
          leftView = 0;

        // Compute the edges for the column graph bar.
        var right;
        if (i != objectSnapshots.length - 1) {
          right = objectSnapshots[i + 1].ts;
        } else {
          // If this is the last snaphot of multiple snapshots, use the width of
          // the previous snapshot for the width.
          if (objectSnapshots.length > 1)
            right = objectSnapshots[i].ts + (objectSnapshots[i].ts -
                    objectSnapshots[i - 1].ts);
          else
            // If there's only one snapshot, use max bounds as the width.
            right = this.objectInstance_.parent.model.bounds.max;
        }

        var rightView = dt.xWorldToView(right);
        if (rightView > width)
          rightView = width;

        // Floor the bounds to avoid a small gap between stacks.
        leftView = Math.floor(leftView);
        rightView = Math.floor(rightView);

        // Draw a stacked bar graph. Largest item is stored first in the
        // heap data structure, so iterate backwards. Likewise draw from
        // the bottom of the bar upwards.
        var currentY = height;
        var keys = Object.keys(snapshot.heap_.children);
        for (var k = keys.length - 1; k >= 0; k--) {
          var trace = snapshot.heap_.children[keys[k]];
          if (this.objectInstance_.selectedTraces &&
              this.objectInstance_.selectedTraces.length > 0 &&
              this.objectInstance_.selectedTraces[0] == keys[k]) {
            // A trace selected in the analysis view is bright yellow.
            ctx.fillStyle = 'rgb(239, 248, 206)';
          } else
            ctx.fillStyle = EventPresenter.getBarSnapshotColor(snapshot, k);

          var barHeight = height * trace.currentBytes / maxBytes;
          ctx.fillRect(leftView, currentY - barHeight,
                       Math.max(rightView - leftView, 1), barHeight);
          currentY -= barHeight;
        }
      }
      ctx.lineWidth = 1;
    }
  };

  tracing.tracks.ObjectInstanceTrack.register(
      'memory::Heap', HeapInstanceTrack);

  return {
    HeapInstanceTrack: HeapInstanceTrack
  };
});
