// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('tracing.tracks.container_track');
base.require('tracing.tracks.slice_track');
base.require('tracing.filter');
base.require('tracing.trace_model');
base.require('base.ui');

base.exportTo('tracing.tracks', function() {

  /**
   * Visualizes a Cpu using a series of of SliceTracks.
   * @constructor
   */
  var CpuTrack =
      base.ui.define('cpu-track', tracing.tracks.ContainerTrack);
  CpuTrack.prototype = {
    __proto__: tracing.tracks.ContainerTrack.prototype,

    decorate: function(viewport) {
      tracing.tracks.ContainerTrack.prototype.decorate.call(this, viewport);
      this.classList.add('cpu-track');
    },

    get cpu() {
      return this.cpu_;
    },

    set cpu(cpu) {
      this.cpu_ = cpu;
      this.updateContents_();
    },

    get tooltip() {
      return this.tooltip_;
    },

    set tooltip(value) {
      this.tooltip_ = value;
      this.updateContents_();
    },

    get hasVisibleContent() {
      return this.children.length > 0;
    },

    updateContents_: function() {
      this.detach();
      if (!this.cpu_)
        return;
      var slices = this.cpu_.slices;
      if (slices.length) {
        var track = new tracing.tracks.SliceTrack(this.viewport);
        track.slices = slices;
        track.heading = this.cpu_.userFriendlyName + ':';
        this.appendChild(track);
      }

      for (var counterName in this.cpu_.counters) {
        var counter = this.cpu_.counters[counterName];
        track = new tracing.tracks.CounterTrack(this.viewport);
        track.heading = this.cpu_.userFriendlyName + ' ' +
            counter.name + ':';
        track.counter = counter;
        this.appendChild(track);
      }
    }
  };

  return {
    CpuTrack: CpuTrack
  };
});
