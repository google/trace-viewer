// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Parses cpufreq events in the Linux event trace format.
 */
base.require('tracing.importer.linux_perf.parser');
base.exportTo('tracing.importer.linux_perf', function() {

  var Parser = tracing.importer.linux_perf.Parser;

  /**
   * Parses linux cpufreq trace events.
   * @constructor
   */
  function CpufreqParser(importer) {
    Parser.call(this, importer);

    importer.registerEventHandler('cpufreq_interactive_up',
        CpufreqParser.prototype.cpufreqUpDownEvent.bind(this));
    importer.registerEventHandler('cpufreq_interactive_down',
        CpufreqParser.prototype.cpufreqUpDownEvent.bind(this));
    importer.registerEventHandler('cpufreq_interactive_already',
        CpufreqParser.prototype.cpufreqTargetEvent.bind(this));
    importer.registerEventHandler('cpufreq_interactive_notyet',
        CpufreqParser.prototype.cpufreqTargetEvent.bind(this));
    importer.registerEventHandler('cpufreq_interactive_setspeed',
        CpufreqParser.prototype.cpufreqTargetEvent.bind(this));
    importer.registerEventHandler('cpufreq_interactive_target',
        CpufreqParser.prototype.cpufreqTargetEvent.bind(this));
    importer.registerEventHandler('cpufreq_interactive_boost',
        CpufreqParser.prototype.cpufreqBoostUnboostEvent.bind(this));
    importer.registerEventHandler('cpufreq_interactive_unboost',
        CpufreqParser.prototype.cpufreqBoostUnboostEvent.bind(this));
  }

  function splitData(input) {
    // TODO(sleffler) split by cpu
    var data = {};
    var args = input.split(/\s+/);
    var len = args.length;
    for (var i = 0; i < len; i++) {
      var item = args[i].split('=');
      data[item[0]] = parseInt(item[1]);
    }
    return data;
  }

  CpufreqParser.prototype = {
    __proto__: Parser.prototype,

    cpufreqSlice: function(ts, eventName, cpu, args) {
      // TODO(sleffler) should be per-cpu
      var kthread = this.importer.getOrCreatePseudoThread('cpufreq');
      kthread.openSlice = eventName;
      var slice = new tracing.trace_model.Slice('', kthread.openSlice,
          tracing.getStringColorId(kthread.openSlice), ts, args, 0);

      kthread.thread.sliceGroup.pushSlice(slice);
    },

    cpufreqBoostSlice: function(ts, eventName, args) {
      var kthread = this.importer.getOrCreatePseudoThread('cpufreq_boost');
      kthread.openSlice = eventName;
      var slice = new tracing.trace_model.Slice('', kthread.openSlice,
          tracing.getStringColorId(kthread.openSlice), ts, args, 0);

      kthread.thread.sliceGroup.pushSlice(slice);
    },

    /**
     * Parses cpufreq events and sets up state in the importer.
     */
    cpufreqUpDownEvent: function(eventName, cpuNumber, pid, ts, eventBase) {
      var data = splitData(eventBase.details);
      this.cpufreqSlice(ts, eventName, data.cpu, data);
      return true;
    },

    cpufreqTargetEvent: function(eventName, cpuNumber, pid, ts,
                                 eventBase) {
      var data = splitData(eventBase.details);
      this.cpufreqSlice(ts, eventName, data.cpu, data);
      return true;
    },

    cpufreqBoostUnboostEvent: function(eventName, cpuNumber, pid, ts,
                                       eventBase) {
      this.cpufreqBoostSlice(ts, eventName,
          {
            type: eventBase.details
          });
      return true;
    }
  };

  Parser.registerSubtype(CpufreqParser);

  return {
    CpufreqParser: CpufreqParser
  };
});
