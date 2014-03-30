// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Parses workqueue events in the Linux event trace format.
 */
tvcm.require('tracing.importer.linux_perf.parser');
tvcm.exportTo('tracing.importer.linux_perf', function() {

  var Parser = tracing.importer.linux_perf.Parser;

  /**
   * Parses linux workqueue trace events.
   * @constructor
   */
  function WorkqueueParser(importer) {
    Parser.call(this, importer);

    importer.registerEventHandler('workqueue_execute_start',
        WorkqueueParser.prototype.executeStartEvent.bind(this));
    importer.registerEventHandler('workqueue_execute_end',
        WorkqueueParser.prototype.executeEndEvent.bind(this));
    importer.registerEventHandler('workqueue_queue_work',
        WorkqueueParser.prototype.executeQueueWork.bind(this));
    importer.registerEventHandler('workqueue_activate_work',
        WorkqueueParser.prototype.executeActivateWork.bind(this));
  }

  // Matches the workqueue_execute_start record
  //  workqueue_execute_start: work struct c7a8a89c: function MISRWrapper
  var workqueueExecuteStartRE = /work struct (.+): function (\S+)/;

  // Matches the workqueue_execute_start record
  //  workqueue_execute_end: work struct c7a8a89c
  var workqueueExecuteEndRE = /work struct (.+)/;

  WorkqueueParser.prototype = {
    __proto__: Parser.prototype,

    /**
     * Parses workqueue events and sets up state in the importer.
     */
    executeStartEvent: function(eventName, cpuNumber, pid, ts, eventBase) {
      var event = workqueueExecuteStartRE.exec(eventBase.details);
      if (!event)
        return false;

      var kthread = this.importer.getOrCreateKernelThread(eventBase.threadName,
          pid, pid);
      kthread.openSliceTS = ts;
      kthread.openSlice = event[2];
      return true;
    },

    executeEndEvent: function(eventName, cpuNumber, pid, ts, eventBase) {
      var event = workqueueExecuteEndRE.exec(eventBase.details);
      if (!event)
        return false;

      var kthread = this.importer.getOrCreateKernelThread(eventBase.threadName,
          pid, pid);
      if (kthread.openSlice) {
        var slice = new tracing.trace_model.Slice('', kthread.openSlice,
            tvcm.ui.getStringColorId(kthread.openSlice),
            kthread.openSliceTS,
            {},
            ts - kthread.openSliceTS);

        kthread.thread.sliceGroup.pushSlice(slice);
      }
      kthread.openSlice = undefined;
      return true;
    },

    executeQueueWork: function(eventName, cpuNumber, pid, ts, eventBase) {
      // TODO: Do something with this event?
      return true;
    },

    executeActivateWork: function(eventName, cpuNumber, pid, ts, eventBase) {
      // TODO: Do something with this event?
      return true;
    }

  };

  Parser.registerSubtype(WorkqueueParser);

  return {
    WorkqueueParser: WorkqueueParser
  };
});
