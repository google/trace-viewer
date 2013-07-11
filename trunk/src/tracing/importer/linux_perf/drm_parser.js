// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Parses drm driver events in the Linux event trace format.
 */
base.require('tracing.importer.linux_perf.parser');
base.exportTo('tracing.importer.linux_perf', function() {

  var Parser = tracing.importer.linux_perf.Parser;

  /**
   * Parses linux drm trace events.
   * @constructor
   */
  function DrmParser(importer) {
    Parser.call(this, importer);

    importer.registerEventHandler('drm_vblank_event',
        DrmParser.prototype.vblankEvent.bind(this));
  }

  DrmParser.prototype = {
    __proto__: Parser.prototype,

    drmVblankSlice: function(ts, eventName, args) {
      var kthread = this.importer.getOrCreatePseudoThread('drm_vblank');
      kthread.openSlice = eventName;
      var slice = new tracing.trace_model.Slice('', kthread.openSlice,
          tracing.getStringColorId(kthread.openSlice), ts, args, 0);

      kthread.thread.sliceGroup.pushSlice(slice);
    },

    /**
     * Parses drm driver events and sets up state in the importer.
     */
    vblankEvent: function(eventName, cpuNumber, pid, ts, eventBase) {
      var event = /crtc=(\d+), seq=(\d+)/.exec(eventBase.details);
      if (!event)
        return false;

      var crtc = parseInt(event[1]);
      var seq = parseInt(event[2]);
      this.drmVblankSlice(ts, 'vblank:' + crtc,
          {
            crtc: crtc,
            seq: seq
          });
      return true;
    }
  };

  Parser.registerSubtype(DrmParser);

  return {
    DrmParser: DrmParser
  };
});
