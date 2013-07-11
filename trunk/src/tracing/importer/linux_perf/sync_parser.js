// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Parses sync events in the Linux event trace format.
 */
base.require('tracing.importer.linux_perf.parser');
base.exportTo('tracing.importer.linux_perf', function() {

  var Parser = tracing.importer.linux_perf.Parser;

  /**
   * Parses linux sync trace events.
   * @constructor
   */
  function SyncParser(importer) {
    Parser.call(this, importer);

    importer.registerEventHandler(
        'sync_timeline',
        SyncParser.prototype.timelineEvent.bind(this));
    importer.registerEventHandler(
        'sync_wait',
        SyncParser.prototype.syncWaitEvent.bind(this));
    importer.registerEventHandler(
        'sync_pt',
        SyncParser.prototype.syncPtEvent.bind(this));
    this.model_ = importer.model_;
  }

  var syncTimelineRE = /name=(\S+) value=(\S*)/;
  var syncWaitRE = /(\S+) name=(\S+) state=(\d+)/;
  var syncPtRE = /name=(\S+) value=(\S*)/;

  SyncParser.prototype = {
    __proto__: Parser.prototype,

    /**
     * Parses sync events and sets up state in the importer.
     */
    timelineEvent: function(eventName, cpuNumber, pid,
                            ts, eventBase) {
      var event = syncTimelineRE.exec(eventBase.details);
      if (!event)
        return false;

      var thread = this.importer.getOrCreatePseudoThread(event[1]);

      if (thread.lastActiveTs !== undefined) {
        var duration = ts - thread.lastActiveTs;
        var value = thread.lastActiveValue;
        if (value == undefined)
          value = ' ';
        var slice = new tracing.trace_model.Slice(
            '', value,
            tracing.getStringColorId(value),
            thread.lastActiveTs, {},
            duration);
        thread.thread.sliceGroup.pushSlice(slice);
      }
      thread.lastActiveTs = ts;
      thread.lastActiveValue = event[2];
      return true;
    },

    syncWaitEvent: function(eventName, cpuNumber, pid, ts,
                            eventBase) {
      var event = syncWaitRE.exec(eventBase.details);
      if (!event)
        return false;

      if (eventBase.tgid === undefined) {
        return false;
      }

      var tgid = parseInt(eventBase.tgid);
      var thread = this.model_.getOrCreateProcess(tgid)
        .getOrCreateThread(pid);
      thread.name = eventBase.threadName;
      var slices = thread.kernelSliceGroup;
      if (!slices.isTimestampValidForBeginOrEnd(ts)) {
        this.model_.importErrors.push('Timestamps are moving backward.');
        return false;
      }

      var name = 'fence_wait("' + event[2] + '")';
      if (event[1] == 'begin') {
        var slice = slices.beginSlice(null, name, ts, {
          'Start state': event[3]
        });
      } else if (event[1] == 'end') {
        if (slices.openSliceCount > 0) {
          slices.endSlice(ts);
        }
      } else {
        return false;
      }

      return true;
    },

    syncPtEvent: function(eventName, cpuNumber, pid, ts, eventBase) {
      var event = syncPtRE.exec(eventBase.details);
      if (!event)
        return false;

      return true;

      var thread = this.importer.getOrCreateKernelThread(
          eventBase[1]).thread;
      thread.syncWaitSyncPts[event[1]] = event[2];
      return true;
    }
  };

  Parser.registerSubtype(SyncParser);

  return {
    SyncParser: SyncParser
  };
});
