// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Parses scheduler events in the Linux event trace format.
 */
tvcm.require('tracing.importer.linux_perf.parser');
tvcm.exportTo('tracing.importer.linux_perf', function() {

  var Parser = tracing.importer.linux_perf.Parser;

  /**
   * Parses linux sched trace events.
   * @constructor
   */
  function SchedParser(importer) {
    Parser.call(this, importer);

    importer.registerEventHandler('sched_switch',
        SchedParser.prototype.schedSwitchEvent.bind(this));
    importer.registerEventHandler('sched_wakeup',
        SchedParser.prototype.schedWakeupEvent.bind(this));
  }

  var TestExports = {};

  // Matches the sched_switch record
  var schedSwitchRE = new RegExp(
      'prev_comm=(.+) prev_pid=(\\d+) prev_prio=(\\d+) ' +
      'prev_state=(\\S\\+?|\\S\\|\\S) ==> ' +
      'next_comm=(.+) next_pid=(\\d+) next_prio=(\\d+)');
  TestExports.schedSwitchRE = schedSwitchRE;

  // Matches the sched_wakeup record
  var schedWakeupRE =
      /comm=(.+) pid=(\d+) prio=(\d+) success=(\d+) target_cpu=(\d+)/;
  TestExports.schedWakeupRE = schedWakeupRE;

  SchedParser.prototype = {
    __proto__: Parser.prototype,

    /**
     * Parses scheduler events and sets up state in the importer.
     */
    schedSwitchEvent: function(eventName, cpuNumber, pid, ts, eventBase) {
      var event = schedSwitchRE.exec(eventBase.details);
      if (!event)
        return false;

      var prevState = event[4];
      var nextComm = event[5];
      var nextPid = parseInt(event[6]);
      var nextPrio = parseInt(event[7]);

      var cpuState = this.importer.getOrCreateCpuState(cpuNumber);
      cpuState.switchRunningLinuxPid(this.importer,
          prevState, ts, nextPid, nextComm, nextPrio);
      return true;
    },

    schedWakeupEvent: function(eventName, cpuNumber, pid, ts, eventBase) {
      var event = schedWakeupRE.exec(eventBase.details);
      if (!event)
        return false;

      var fromPid = pid;
      var comm = event[1];
      var pid = parseInt(event[2]);
      var prio = parseInt(event[3]);
      this.importer.markPidRunnable(ts, pid, comm, prio, fromPid);
      return true;
    }
  };

  Parser.registerSubtype(SchedParser);

  return {
    SchedParser: SchedParser,
    _SchedParserTestExports: TestExports
  };
});
