// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.requireStylesheet('tracing.tracks.trace_model_track');

base.require('base.measuring_stick');
base.require('tracing.tracks.container_track');
base.require('tracing.tracks.kernel_track');
base.require('tracing.tracks.process_track');
base.require('tracing.draw_helpers');
base.require('ui');

base.exportTo('tracing.tracks', function() {

  /**
   * Visualizes a Model by building ProcessTracks and
   * CpuTracks.
   * @constructor
   */
  var TraceModelTrack = ui.define(
      'trace-model-track', tracing.tracks.ContainerTrack);

  TraceModelTrack.prototype = {

    __proto__: tracing.tracks.ContainerTrack.prototype,

    decorate: function(viewport) {
      tracing.tracks.ContainerTrack.prototype.decorate.call(this, viewport);
      this.classList.add('model-track');
    },

    detach: function() {
      tracing.tracks.ContainerTrack.prototype.detach.call(this);
    },

    get model() {
      return this.model_;
    },

    set model(model) {
      this.model_ = model;
      this.updateContents_();
    },

    get hasVisibleContent() {
      return this.children.length > 0;
    },

    applyCategoryFilter_: function() {
      this.updateContents_();
    },

    updateContents_: function() {
      this.textContent = '';
      if (!this.model_ || !this.categoryFilter)
        return;

      var categoryFilter = this.categoryFilter;

      this.appendKernelTrack_();

      // Get a sorted list of processes.
      var processes = this.model_.getAllProcesses();
      processes.sort(tracing.trace_model.Process.compare);

      for (var i = 0; i < processes.length; ++i) {
        var process = processes[i];
        if (!categoryFilter.matchProcess(process))
          return;

        var track = new tracing.tracks.ProcessTrack(this.viewport);
        track.categoryFilter = categoryFilter;
        track.process = process;
        if (!track.hasVisibleContent)
          continue;

        this.appendChild(track);
      }
      this.memoizeSlices_();
    },

    memoizeSlices_: function() {
      if (!this.model_ || !this.categoryFilter)
        return;

      this.viewport_.clearSliceMemoization();

      var tracks = this.children;
      for (var i = 0; i < tracks.length; ++i)
        tracks[i].memoizeSlices_();

      if (this.instantEvents === undefined)
        return;

      var vp = this.viewport_;
      this.instantEvents.forEach(function(ev) {
        vp.sliceMemoization(ev, this);
      }.bind(this));
    },

    appendKernelTrack_: function() {
      var kernel = this.model.kernel;
      if (!this.categoryFilter.matchProcess(kernel))
        return;
      var track = new tracing.tracks.KernelTrack(this.viewport);
      track.categoryFilter = this.categoryFilter;
      track.kernel = this.model.kernel;
      if (!track.hasVisibleContent)
        return;
      this.appendChild(track);
    },

    drawTrack: function(type) {
      var ctx = this.context();

      var pixelRatio = window.devicePixelRatio || 1;
      var bounds = this.getBoundingClientRect();
      var canvasBounds = ctx.canvas.getBoundingClientRect();

      ctx.save();
      ctx.translate(0, pixelRatio * (bounds.top - canvasBounds.top));

      var viewLWorld = this.viewport.xViewToWorld(0);
      var viewRWorld = this.viewport.xViewToWorld(bounds.width * pixelRatio);

      switch (type) {
        case tracing.tracks.DrawType.GRID:
          this.viewport.drawMarkLines(ctx);
          // The model is the only thing that draws grid lines.
          ctx.restore();
          return;

        case tracing.tracks.DrawType.FLOW_ARROWS:
          if (!this.model_.flowEvents ||
              this.model_.flowEvents.length === 0) {
            ctx.restore();
            return;
          }

          this.drawFlowArrows_(viewLWorld, viewRWorld);
          ctx.restore();
          return;

        case tracing.tracks.DrawType.INSTANT_EVENT:
          if (!this.model_.instantEvents ||
              this.model_.instantEvents.length === 0)
            break;

          tracing.drawSlices(
              ctx,
              this.viewport,
              viewLWorld,
              viewRWorld,
              bounds.height,
              this.model_.instantEvents);

          break;
      }
      ctx.restore();

      tracing.tracks.ContainerTrack.prototype.drawTrack.call(this, type);
    },

    drawFlowArrows_: function(viewLWorld, viewRWorld) {
      var ctx = this.context();
      this.viewport.applyTransformToCanvas(ctx);

      var pixWidth = this.viewport.xViewVectorToWorld(1);

      ctx.strokeStyle = '#000';
      ctx.lineWidth = pixWidth > 1.0 ? 1 : pixWidth;

      var events = this.model_.flowEvents;
      var lowEvent = base.findLowIndexInSortedArray(
          events,
          function(event) { return event.start + event.duration; },
          viewLWorld);

      var pixelRatio = window.devicePixelRatio || 1;
      var canvasBounds = ctx.canvas.getBoundingClientRect();

      for (var i = lowEvent; i < events.length; ++i) {
        var event = events[i];
        if (event.isFlowEnd())
          continue;

        var startEvent = event;
        var endEvent = event.nextEvent;

        var startTrack = this.viewport.trackForSlice(startEvent);
        var endTrack = this.viewport.trackForSlice(endEvent);

        // If we didn't draw one end, because it's off screen, we can't draw
        // the flow arrow, so skip it.
        if (endTrack === undefined || startTrack === undefined)
          continue;

        var startBounds = startTrack.getBoundingClientRect();
        var endBounds = endTrack.getBoundingClientRect();

        var startY =
            (startBounds.top - canvasBounds.top + (startBounds.height / 2));
        var endY = (endBounds.top - canvasBounds.top + (endBounds.height / 2));

        var pixelStartY = pixelRatio * startY;
        var pixelEndY = pixelRatio * endY;

        // Skip lines that will be, essentially, vertical.
        var minWidth = 2 * pixWidth;
        var distance =
            Math.abs((startEvent.start + startEvent.duration) - endEvent.start);
        if (distance <= minWidth)
          continue;

        var half =
            (endEvent.start - (startEvent.start + startEvent.duration)) / 2;
        var width = pixWidth;
        if (startEvent.duration > 0) {
          w = Math.max(startEvent.duration, 0.001);
          if (w < pixWidth)
            w = pixWidth;
        }

        ctx.beginPath();
        ctx.moveTo(startEvent.start + startEvent.duration, pixelStartY);
        ctx.bezierCurveTo(
            startEvent.start + startEvent.duration + half, pixelStartY,
            startEvent.start + startEvent.duration + half, pixelEndY,
            endEvent.start, pixelEndY);
        ctx.stroke();
      }
    },

    addIntersectingItemsInRangeToSelectionInWorldSpace: function(
        loWX, hiWX, viewPixWidthWorld, selection) {
      function onPickHit(instantEvent) {
        var hit = selection.addSlice(this, instantEvent);
        this.decorateHit(hit);
      }
      base.iterateOverIntersectingIntervals(this.model_.instantEvents,
          function(x) { return x.start; },
          function(x) { return x.duration; },
          loWX, hiWX,
          onPickHit.bind(this));

      tracing.tracks.ContainerTrack.prototype.
          addIntersectingItemsInRangeToSelectionInWorldSpace.
          apply(this, arguments);
    }
  };

  return {
    TraceModelTrack: TraceModelTrack
  };
});
