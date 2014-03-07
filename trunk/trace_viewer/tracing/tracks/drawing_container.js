// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.requireStylesheet('tracing.tracks.drawing_container');

tvcm.require('tracing.tracks.track');
tvcm.require('tvcm.raf');
tvcm.require('tvcm.ui');

tvcm.exportTo('tracing.tracks', function() {
  var DrawType = {
    SLICE: 1,
    INSTANT_EVENT: 2,
    BACKGROUND: 3,
    GRID: 4,
    FLOW_ARROWS: 5,
    MARKERS: 6
  };

  var DrawingContainer = tvcm.ui.define('drawing-container',
                                        tracing.tracks.Track);

  DrawingContainer.prototype = {
    __proto__: tracing.tracks.Track.prototype,

    decorate: function(viewport) {
      tracing.tracks.Track.prototype.decorate.call(this, viewport);
      this.classList.add('drawing-container');

      this.canvas_ = document.createElement('canvas');
      this.canvas_.className = 'drawing-container-canvas';
      this.canvas_.style.left = tracing.constants.HEADING_WIDTH + 'px';
      this.appendChild(this.canvas_);

      this.ctx_ = this.canvas_.getContext('2d');

      this.viewportChange_ = this.viewportChange_.bind(this);
      this.viewport.addEventListener('change', this.viewportChange_);
    },

    // Needed to support the calls in TimelineTrackView.
    get canvas() {
      return this.canvas_;
    },

    context: function() {
      return this.ctx_;
    },

    viewportChange_: function() {
      this.invalidate();
    },

    invalidate: function() {
      if (this.rafPending_)
        return;
      this.rafPending_ = true;

      tvcm.requestPreAnimationFrame(function() {
        this.rafPending_ = false;
        this.updateCanvasSizeIfNeeded_();

        tvcm.requestAnimationFrameInThisFrameIfPossible(function() {
          this.drawTrackContents_();
        }, this);
      }, this);
    },

    drawTrackContents_: function() {
      this.ctx_.clearRect(0, 0, this.canvas_.width, this.canvas_.height);

      var typesToDraw = [
        DrawType.BACKGROUND,
        DrawType.GRID,
        DrawType.INSTANT_EVENT,
        DrawType.SLICE,
        DrawType.MARKERS,
        DrawType.FLOW_ARROWS
      ];

      for (var idx in typesToDraw) {
        for (var i = 0; i < this.children.length; ++i) {
          if (!(this.children[i] instanceof tracing.tracks.Track))
            continue;
          this.children[i].drawTrack(typesToDraw[idx]);
        }
      }

      var pixelRatio = window.devicePixelRatio || 1;
      var bounds = this.canvas_.getBoundingClientRect();
      var dt = this.viewport.currentDisplayTransform;
      var viewLWorld = dt.xViewToWorld(0);
      var viewRWorld = dt.xViewToWorld(
          bounds.width * pixelRatio);

      this.viewport.drawGridLines(this.ctx_, viewLWorld, viewRWorld);
    },

    updateCanvasSizeIfNeeded_: function() {
      var visibleChildTracks =
          tvcm.asArray(this.children).filter(this.visibleFilter_);

      var thisBounds = this.getBoundingClientRect();

      var firstChildTrackBounds = visibleChildTracks[0].getBoundingClientRect();
      var lastChildTrackBounds =
          visibleChildTracks[visibleChildTracks.length - 1].
              getBoundingClientRect();

      var innerWidth = firstChildTrackBounds.width -
          tracing.constants.HEADING_WIDTH;
      var innerHeight = lastChildTrackBounds.bottom - firstChildTrackBounds.top;

      var pixelRatio = window.devicePixelRatio || 1;
      if (this.canvas_.width != innerWidth * pixelRatio) {
        this.canvas_.width = innerWidth * pixelRatio;
        this.canvas_.style.width = innerWidth + 'px';
      }

      if (this.canvas_.height != innerHeight * pixelRatio) {
        this.canvas_.height = innerHeight * pixelRatio;
        this.canvas_.style.height = innerHeight + 'px';
      }

      var canvasTop =
          firstChildTrackBounds.top - thisBounds.top + this.scrollTop;
      if (this.canvas_.style.top + 'px' !== canvasTop)
        this.canvas_.style.top = canvasTop + 'px';
    },

    visibleFilter_: function(element) {
      if (!(element instanceof tracing.tracks.Track))
        return false;
      return window.getComputedStyle(element).display !== 'none';
    },

    addClosestEventToSelection: function(
        worldX, worldMaxDist, loY, hiY, selection) {
      for (var i = 0; i < this.children.length; ++i) {
        if (!(this.children[i] instanceof tracing.tracks.Track))
          continue;
        var trackClientRect = this.children[i].getBoundingClientRect();
        var a = Math.max(loY, trackClientRect.top);
        var b = Math.min(hiY, trackClientRect.bottom);
        if (a <= b) {
          this.children[i].addClosestEventToSelection(
              worldX, worldMaxDist, loY, hiY, selection);
        }
      }

      tracing.tracks.Track.prototype.addClosestEventToSelection.
          apply(this, arguments);
    },

    addEventsToTrackMap: function(eventToTrackMap) {
      for (var i = 0; i < this.children.length; ++i) {
        if (!(this.children[i] instanceof tracing.tracks.Track))
          continue;
        this.children[i].addEventsToTrackMap(eventToTrackMap);
      }
    }
  };

  return {
    DrawingContainer: DrawingContainer,
    DrawType: DrawType
  };
});
