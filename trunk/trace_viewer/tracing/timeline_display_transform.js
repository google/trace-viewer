// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.utils');

tvcm.exportTo('tracing', function() {
  function TimelineDisplayTransform(opt_that) {
    if (opt_that) {
      this.set(opt_that);
      return;
    }
    this.scaleX = 1;
    this.panX = 0;
    this.panY = 0;
  }

  TimelineDisplayTransform.prototype = {
    set: function(that) {
      this.scaleX = that.scaleX;
      this.panX = that.panX;
      this.panY = that.panY;
    },

    clone: function() {
      return new TimelineDisplayTransform(this);
    },

    equals: function(that) {
      var eq = true;
      if (that === undefined || that === null)
        return false;
      eq &= this.panX === that.panX;
      eq &= this.panY === that.panY;
      eq &= this.scaleX === that.scaleX;
      return !!eq;
    },

    almostEquals: function(that) {
      var eq = true;
      if (that === undefined || that === null)
        return false;
      eq &= Math.abs(this.panX - that.panX) < 0.001;
      eq &= Math.abs(this.panY - that.panY) < 0.001;
      eq &= Math.abs(this.scaleX - that.scaleX) < 0.001;
      return !!eq;
    },

    incrementPanXInViewUnits: function(xDeltaView) {
      this.panX += this.xViewVectorToWorld(xDeltaView);
    },

    xPanWorldPosToViewPos: function(worldX, viewX, viewWidth) {
      if (typeof viewX == 'string') {
        if (viewX === 'left') {
          viewX = 0;
        } else if (viewX === 'center') {
          viewX = viewWidth / 2;
        } else if (viewX === 'right') {
          viewX = viewWidth - 1;
        } else {
          throw new Error('viewX must be left|center|right or number.');
        }
      }
      this.panX = (viewX / this.scaleX) - worldX;
    },

    xPanWorldBoundsIntoView: function(worldMin, worldMax, viewWidth) {
      if (this.xWorldToView(worldMin) < 0)
        this.xPanWorldPosToViewPos(worldMin, 'left', viewWidth);
      else if (this.xWorldToView(worldMax) > viewWidth)
        this.xPanWorldPosToViewPos(worldMax, 'right', viewWidth);
    },

    xSetWorldBounds: function(worldMin, worldMax, viewWidth) {
      var worldWidth = worldMax - worldMin;
      var scaleX = viewWidth / worldWidth;
      var panX = -worldMin;
      this.setPanAndScale(panX, scaleX);
    },

    setPanAndScale: function(p, s) {
      this.scaleX = s;
      this.panX = p;
    },

    xWorldToView: function(x) {
      return (x + this.panX) * this.scaleX;
    },

    xWorldVectorToView: function(x) {
      return x * this.scaleX;
    },

    xViewToWorld: function(x) {
      return (x / this.scaleX) - this.panX;
    },

    xViewVectorToWorld: function(x) {
      return x / this.scaleX;
    },

    applyTransformToCanvas: function(ctx) {
      ctx.transform(this.scaleX, 0, 0, 1, this.panX * this.scaleX, 0);
    }
  };

  return {
    TimelineDisplayTransform: TimelineDisplayTransform
  };
});
