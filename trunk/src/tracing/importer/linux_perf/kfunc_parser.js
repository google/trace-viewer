// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Parses graph_ent and graph_ret events that were inserted by
 * the Linux kernel's function graph trace.
 */
base.require('tracing.importer.linux_perf.parser');
base.exportTo('tracing.importer.linux_perf', function() {

  var LinuxPerfParser = tracing.importer.linux_perf.Parser;

  /**
   * Parses graph_ent and graph_ret events that were inserted by the Linux
   * kernel's function graph trace.
   * @constructor
   */
  function KernelFuncParser(importer) {
    LinuxPerfParser.call(this, importer);

    importer.registerEventHandler('graph_ent',
        KernelFuncParser.prototype.traceKernelFuncEnterEvent.
            bind(this));
    importer.registerEventHandler('graph_ret',
        KernelFuncParser.prototype.traceKernelFuncReturnEvent.
            bind(this));

    this.model_ = importer.model_;
    this.ppids_ = {};
  }

  var TestExports = {};

  var funcEnterRE = new RegExp('func=(.+)');
  TestExports.funcEnterRE = funcEnterRE;

  KernelFuncParser.prototype = {
    __proto__: LinuxPerfParser.prototype,

    traceKernelFuncEnterEvent: function(eventName, cpuNumber, pid, ts,
                                        eventBase) {
      var eventData = funcEnterRE.exec(eventBase.details);
      if (!eventData)
        return false;

      if (eventBase.tgid === undefined) {
        return false;
      }

      var tgid = parseInt(eventBase.tgid);
      var name = eventData[1];
      var thread = this.model_.getOrCreateProcess(tgid)
        .getOrCreateThread(pid);
      thread.name = eventBase.threadName;

      var slices = thread.kernelSliceGroup;
      if (!slices.isTimestampValidForBeginOrEnd(ts)) {
        this.model_.importErrors.push('Timestamps are moving backward.');
        return false;
      }

      var slice = slices.beginSlice(null, name, ts, {});

      return true;
    },

    traceKernelFuncReturnEvent: function(eventName, cpuNumber, pid, ts,
                                         eventBase) {
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

      if (slices.openSliceCount > 0) {
        slices.endSlice(ts);
      }

      return true;
    }
  };

  LinuxPerfParser.registerSubtype(KernelFuncParser);

  return {
    KernelFuncParser: KernelFuncParser
  };
});
