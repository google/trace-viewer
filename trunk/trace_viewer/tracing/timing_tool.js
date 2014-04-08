// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.range');
tvcm.require('tvcm.ui');
tvcm.require('tracing.constants');
tvcm.require('tracing.selection');
tvcm.require('tracing.trace_model.slice');

/**
 * @fileoverview Provides the TimingTool class.
 */
tvcm.exportTo('tracing', function() {

  var constants = tracing.constants;

  /**
   * Tool for taking time measurements in the TimelineTrackView using
   * Viewportmarkers.
   * @constructor
   */
  function TimingTool(viewport, targetElement) {
    this.viewport_ = viewport;

    // Prepare the event handlers to be added and removed repeatedly.
    this.onMouseMove_ = this.onMouseMove_.bind(this);
    this.onDblClick_ = this.onDblClick_.bind(this);
    this.targetElement_ = targetElement;

    // Valid only during mousedown.
    this.isMovingLeftEdge_ = false;
  };

  TimingTool.prototype = {

    onEnterTiming: function(e) {
      this.targetElement_.addEventListener('mousemove', this.onMouseMove_);
      this.targetElement_.addEventListener('dblclick', this.onDblClick_);
    },

    onBeginTiming: function(e) {
      var pt = this.getSnappedToEventPosition_(e);
      this.mouseDownAt_(pt.x, pt.y);

      this.updateSnapIndicators_(pt);
    },

    updateSnapIndicators_: function(pt) {
      if (!pt.snapped)
        return;
      var ir = this.viewport_.interestRange;
      if (ir.min === pt.x)
        ir.leftSnapIndicator = new tracing.SnapIndicator(pt.y, pt.height);
      if (ir.max === pt.x)
        ir.rightSnapIndicator = new tracing.SnapIndicator(pt.y, pt.height);
    },

    onUpdateTiming: function(e) {
      var pt = this.getSnappedToEventPosition_(e);
      this.mouseMoveAt_(pt.x, pt.y, true);
      this.updateSnapIndicators_(pt);
    },

    onEndTiming: function(e) {
      this.mouseUp_();
    },

    onExitTiming: function(e) {
      this.targetElement_.removeEventListener('mousemove', this.onMouseMove_);
      this.targetElement_.removeEventListener('dblclick', this.onDblClick_);
    },

    onMouseMove_: function(e) {
      if (e.button)
        return;
      var worldX = this.getWorldXFromEvent_(e);
      this.mouseMoveAt_(worldX, e.clientY, false);
    },

    onDblClick_: function(e) {
      // TODO(nduca): Implement dobuleclicking.
      console.error('not implemented');
    },

    ////////////////////////////////////////////////////////////////////////////

    mouseDownAt_: function(worldX, y) {
      var ir = this.viewport_.interestRange;
      var dt = this.viewport_.currentDisplayTransform;

      var pixelRatio = window.devicePixelRatio || 1;
      var nearnessThresholdWorld = dt.xViewVectorToWorld(6 * pixelRatio);

      if (ir.isEmpty) {
        ir.setMinAndMax(worldX, worldX);
        ir.rightSelected = true;
        this.isMovingLeftEdge_ = false;
        return;
      }


      // Left edge test.
      if (Math.abs(worldX - ir.min) < nearnessThresholdWorld) {
        ir.leftSelected = true;
        ir.min = worldX;
        this.isMovingLeftEdge_ = true;
        return;
      }

      // Right edge test.
      if (Math.abs(worldX - ir.max) < nearnessThresholdWorld) {
        ir.rightSelected = true;
        ir.max = worldX;
        this.isMovingLeftEdge_ = false;
        return;
      }

      ir.setMinAndMax(worldX, worldX);
      ir.rightSelected = true;
      this.isMovingLeftEdge_ = false;
    },

    mouseMoveAt_: function(worldX, y, mouseDown) {
      var ir = this.viewport_.interestRange;

      if (mouseDown) {
        this.updateMovingEdge_(worldX);
        return;
      }

      var ir = this.viewport_.interestRange;
      var dt = this.viewport_.currentDisplayTransform;

      var pixelRatio = window.devicePixelRatio || 1;
      var nearnessThresholdWorld = dt.xViewVectorToWorld(6 * pixelRatio);

      // Left edge test.
      if (Math.abs(worldX - ir.min) < nearnessThresholdWorld) {
        ir.leftSelected = true;
        ir.rightSelected = false;
        return;
      }

      // Right edge test.
      if (Math.abs(worldX - ir.max) < nearnessThresholdWorld) {
        ir.leftSelected = false;
        ir.rightSelected = true;
        return;
      }

      ir.leftSelected = false;
      ir.rightSelected = false;
      return;
    },

    updateMovingEdge_: function(newWorldX) {
      var ir = this.viewport_.interestRange;
      var a = ir.min;
      var b = ir.max;
      if (this.isMovingLeftEdge_)
        a = newWorldX;
      else
        b = newWorldX;

      if (a <= b)
        ir.setMinAndMax(a, b);
      else
        ir.setMinAndMax(b, a);

      if (ir.min == newWorldX) {
        this.isMovingLeftEdge_ = true;
        ir.leftSelected = true;
        ir.rightSelected = false;
      } else {
        this.isMovingLeftEdge_ = false;
        ir.leftSelected = false;
        ir.rightSelected = true;
      }
    },

    mouseUp_: function() {
      var dt = this.viewport_.currentDisplayTransform;
      var ir = this.viewport_.interestRange;

      ir.leftSelected = false;
      ir.rightSelected = false;

      var pixelRatio = window.devicePixelRatio || 1;
      var minWidthValue = dt.xViewVectorToWorld(2 * pixelRatio);
      if (ir.range < minWidthValue)
        ir.reset();
    },

    getWorldXFromEvent_: function(e) {
      var pixelRatio = window.devicePixelRatio || 1;
      var modelTrackContainer = this.viewport_.modelTrackContainer;
      var viewX = (e.clientX -
                   modelTrackContainer.offsetLeft -
                   constants.HEADING_WIDTH) * pixelRatio;
      return this.viewport_.currentDisplayTransform.xViewToWorld(viewX);
    },


    /**
     * Get the closest position of an event within a vertical range of the mouse
     * position if possible, otherwise use the position of the mouse pointer.
     * @param {MouseEvent} e Mouse event with the current mouse coordinates.
     * @return {
     *   {Number} x, The x coordinate in world space.
     *   {Number} y, The y coordinate in world space.
     *   {Number} height, The height of the event.
     *   {boolean} snapped Whether the coordinates are from a snapped event or
     *     the mouse position.
     * }
     */
    getSnappedToEventPosition_: function(e) {
      var pixelRatio = window.devicePixelRatio || 1;
      var EVENT_SNAP_RANGE = 16 * pixelRatio;

      var modelTrackContainer = this.viewport_.modelTrackContainer;
      var modelTrackContainerRect = modelTrackContainer.getBoundingClientRect();

      var viewport = this.viewport_;
      var dt = viewport.currentDisplayTransform;
      var worldMaxDist = dt.xViewVectorToWorld(EVENT_SNAP_RANGE);

      var worldX = this.getWorldXFromEvent_(e);
      var mouseY = e.clientY;

      var selection = new tracing.Selection();

      // Look at the track under mouse position first for better performance.
      modelTrackContainer.addClosestEventToSelection(
          worldX, worldMaxDist, mouseY, mouseY, selection);

      // Look at all tracks visible on screen.
      if (!selection.length) {
        modelTrackContainer.addClosestEventToSelection(
            worldX, worldMaxDist,
            modelTrackContainerRect.top, modelTrackContainerRect.bottom,
            selection);
      }

      var minDistX = worldMaxDist;
      var minDistY = Infinity;
      var pixWidth = dt.xViewVectorToWorld(1);

      // Create result object with the mouse coordinates.
      var result = {
        x: worldX,
        y: mouseY - modelTrackContainerRect.top,
        height: 0,
        snapped: false
      };

      var eventBounds = new tvcm.Range();
      for (var i = 0; i < selection.length; i++) {
        var event = selection[i];
        var track = viewport.trackForEvent(event);
        var trackRect = track.getBoundingClientRect();

        eventBounds.reset();
        event.addBoundsToRange(eventBounds);
        var eventX;
        if (Math.abs(eventBounds.min - worldX) <
            Math.abs(eventBounds.max - worldX)) {
          eventX = eventBounds.min;
        } else {
          eventX = eventBounds.max;
        }

        var distX = eventX - worldX;

        var eventY = trackRect.top;
        var eventHeight = trackRect.height;
        var distY = Math.abs(eventY + eventHeight / 2 - mouseY);

        // Prefer events with a closer y position if their x difference is below
        // the width of a pixel.
        if ((distX <= minDistX || Math.abs(distX - minDistX) < pixWidth) &&
            distY < minDistY) {
          minDistX = distX;
          minDistY = distY;

          // Retrieve the event position from the hit.
          result.x = eventX;
          result.y = eventY +
              modelTrackContainer.scrollTop - modelTrackContainerRect.top;
          result.height = eventHeight;
          result.snapped = true;
        }
      }

      return result;
    }
  };

  return {
    TimingTool: TimingTool
  };
});
