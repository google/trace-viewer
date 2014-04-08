// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.range');

tvcm.exportTo('tracing', function() {

  /**
   * @constructor
   */
  function SnapIndicator(y, height) {
    this.y = y;
    this.height = height;
  }

  /**
   * The interesting part of the world.
   *
   * @constructor
   */
  function TimelineInterestRange(vp) {
    this.viewport_ = vp;

    this.range_ = new tvcm.Range();

    this.leftSelected_ = false;
    this.rightSelected_ = false;

    this.leftSnapIndicator_ = undefined;
    this.rightSnapIndicator_ = undefined;
  }

  TimelineInterestRange.prototype = {
    get isEmpty() {
      return this.range_.isEmpty;
    },

    reset: function() {
      this.range_.reset();
      this.leftSelected_ = false;
      this.rightSelected_ = false;
      this.leftSnapIndicator_ = undefined;
      this.rightSnapIndicator_ = undefined;
      this.viewport_.dispatchChangeEvent();
    },

    get min() {
      return this.range_.min;
    },

    set min(min) {
      this.range_.min = min;
      this.viewport_.dispatchChangeEvent();
    },

    get max() {
      return this.range_.max;
    },

    set max(max) {
      this.range_.max = max;
      this.viewport_.dispatchChangeEvent();
    },

    set: function(range) {
      this.range_.reset();
      this.range_.addRange(range);
      this.viewport_.dispatchChangeEvent();
    },

    setMinAndMax: function(min, max) {
      this.range_.min = min;
      this.range_.max = max;
      this.viewport_.dispatchChangeEvent();
    },

    get range() {
      return this.range_.range;
    },

    asRangeObject: function() {
      var range = new tvcm.Range();
      range.addRange(this.range_);
      return range;
    },

    get leftSelected() {
      return this.leftSelected_;
    },

    set leftSelected(leftSelected) {
      if (this.leftSelected_ == leftSelected)
        return;
      this.leftSelected_ = leftSelected;
      this.viewport_.dispatchChangeEvent();
    },

    get rightSelected() {
      return this.rightSelected_;
    },

    set rightSelected(rightSelected) {
      if (this.rightSelected_ == rightSelected)
        return;
      this.rightSelected_ = rightSelected;
      this.viewport_.dispatchChangeEvent();
    },

    get leftSnapIndicator() {
      return this.leftSnapIndicator_;
    },

    set leftSnapIndicator(leftSnapIndicator) {
      this.leftSnapIndicator_ = leftSnapIndicator;
      this.viewport_.dispatchChangeEvent();
    },

    get rightSnapIndicator() {
      return this.rightSnapIndicator_;
    },

    set rightSnapIndicator(rightSnapIndicator) {
      this.rightSnapIndicator_ = rightSnapIndicator;
      this.viewport_.dispatchChangeEvent();
    },

    draw: function(ctx, viewLWorld, viewRWorld) {
      if (this.range_.isEmpty)
        return;
      var dt = this.viewport_.currentDisplayTransform;

      var markerLWorld = this.min;
      var markerRWorld = this.max;

      var markerLView = Math.round(dt.xWorldToView(markerLWorld));
      var markerRView = Math.round(dt.xWorldToView(markerRWorld));

      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      if (markerLWorld > viewLWorld) {
        ctx.fillRect(dt.xWorldToView(viewLWorld), 0,
            markerLView, ctx.canvas.height);
      }

      if (markerRWorld < viewRWorld) {
        ctx.fillRect(markerRView, 0,
            dt.xWorldToView(viewRWorld), ctx.canvas.height);
      }

      var pixelRatio = window.devicePixelRatio || 1;
      ctx.lineWidth = Math.round(pixelRatio);
      if (this.range_.range > 0) {
        this.drawLine_(ctx, viewLWorld, viewRWorld,
                       ctx.canvas.height, this.min, this.leftSelected_);
        this.drawLine_(ctx, viewLWorld, viewRWorld,
                       ctx.canvas.height, this.max, this.rightSelected_);
      } else {
        this.drawLine_(ctx, viewLWorld, viewRWorld,
                       ctx.canvas.height, this.min,
                       this.leftSelected_ || this.rightSelected_);
      }
      ctx.lineWidth = 1;
    },

    drawLine_: function(ctx, viewLWorld, viewRWorld, height, ts, selected) {
      if (ts < viewLWorld || ts >= viewRWorld)
        return;

      var dt = this.viewport_.currentDisplayTransform;
      var viewX = Math.round(dt.xWorldToView(ts));

      // Apply subpixel translate to get crisp lines.
      // http://www.mobtowers.com/html5-canvas-crisp-lines-every-time/
      ctx.save();
      ctx.translate((Math.round(ctx.lineWidth) % 2) / 2, 0);

      ctx.beginPath();
      tracing.drawLine(ctx, viewX, 0, viewX, height);
      if (selected)
        ctx.strokeStyle = 'rgb(255, 0, 0)';
      else
        ctx.strokeStyle = 'rgb(0, 0, 0)';
      ctx.stroke();

      ctx.restore();
    },

    drawIndicators: function(ctx, viewLWorld, viewRWorld) {
      if (this.leftSnapIndicator_) {
        this.drawIndicator_(ctx, viewLWorld, viewRWorld,
                            this.range_.min,
                            this.leftSnapIndicator_,
                            this.leftSelected_);
      }
      if (this.rightSnapIndicator_) {
        this.drawIndicator_(ctx, viewLWorld, viewRWorld,
                            this.range_.max,
                            this.rightSnapIndicator_,
                            this.rightSelected_);
      }
    },

    drawIndicator_: function(ctx, viewLWorld, viewRWorld,
                             xWorld, si, selected) {
      var dt = this.viewport_.currentDisplayTransform;

      var viewX = Math.round(dt.xWorldToView(xWorld));

      // Apply subpixel translate to get crisp lines.
      // http://www.mobtowers.com/html5-canvas-crisp-lines-every-time/
      ctx.save();
      ctx.translate((Math.round(ctx.lineWidth) % 2) / 2, 0);

      var pixelRatio = window.devicePixelRatio || 1;
      var viewY = si.y * devicePixelRatio;
      var viewHeight = si.height * devicePixelRatio;
      var arrowSize = 4 * pixelRatio;

      if (selected)
        ctx.fillStyle = 'rgb(255, 0, 0)';
      else
        ctx.fillStyle = 'rgb(0, 0, 0)';
      tracing.drawTriangle(ctx,
          viewX - arrowSize * 0.75, viewY,
          viewX + arrowSize * 0.75, viewY,
          viewX, viewY + arrowSize);
      ctx.fill();
      tracing.drawTriangle(ctx,
          viewX - arrowSize * 0.75, viewY + viewHeight,
          viewX + arrowSize * 0.75, viewY + viewHeight,
          viewX, viewY + viewHeight - arrowSize);
      ctx.fill();

      ctx.restore();
    }
  };

  return {
    SnapIndicator: SnapIndicator,
    TimelineInterestRange: TimelineInterestRange
  };
});
