// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Parses Mali DDK/kernel events in the Linux event trace format.
 */
tvcm.require('tracing.importer.linux_perf.parser');
tvcm.exportTo('tracing.importer.linux_perf', function() {

  var Parser = tracing.importer.linux_perf.Parser;

  /**
   * Parses Mali DDK/kernel trace events.
   * @constructor
   */
  function MaliParser(importer) {
    Parser.call(this, importer);

    // kernel DVFS events
    importer.registerEventHandler('mali_dvfs_event',
        MaliParser.prototype.dvfsEventEvent.bind(this));
    importer.registerEventHandler('mali_dvfs_set_clock',
        MaliParser.prototype.dvfsSetClockEvent.bind(this));
    importer.registerEventHandler('mali_dvfs_set_voltage',
        MaliParser.prototype.dvfsSetVoltageEvent.bind(this));

    // kernel Mali hw counter events
    this.addJMCounter('mali_hwc_MESSAGES_SENT', 'Messages Sent');
    this.addJMCounter('mali_hwc_MESSAGES_RECEIVED', 'Messages Received');
    this.addJMCycles('mali_hwc_GPU_ACTIVE', 'GPU Active');
    this.addJMCycles('mali_hwc_IRQ_ACTIVE', 'IRQ Active');

    for (var i = 0; i < 7; i++) {
      var jobStr = 'JS' + i;
      var jobHWCStr = 'mali_hwc_' + jobStr;
      this.addJMCounter(jobHWCStr + '_JOBS', jobStr + ' Jobs');
      this.addJMCounter(jobHWCStr + '_TASKS', jobStr + ' Tasks');
      this.addJMCycles(jobHWCStr + '_ACTIVE', jobStr + ' Active');
      this.addJMCycles(jobHWCStr + '_WAIT_READ', jobStr + ' Wait Read');
      this.addJMCycles(jobHWCStr + '_WAIT_ISSUE', jobStr + ' Wait Issue');
      this.addJMCycles(jobHWCStr + '_WAIT_DEPEND', jobStr + ' Wait Depend');
      this.addJMCycles(jobHWCStr + '_WAIT_FINISH', jobStr + ' Wait Finish');
    }

    this.addTilerCounter('mali_hwc_TRIANGLES', 'Triangles');
    this.addTilerCounter('mali_hwc_QUADS', 'Quads');
    this.addTilerCounter('mali_hwc_POLYGONS', 'Polygons');
    this.addTilerCounter('mali_hwc_POINTS', 'Points');
    this.addTilerCounter('mali_hwc_LINES', 'Lines');
    this.addTilerCounter('mali_hwc_VCACHE_HIT', 'VCache Hit');
    this.addTilerCounter('mali_hwc_VCACHE_MISS', 'VCache Miss');
    this.addTilerCounter('mali_hwc_FRONT_FACING', 'Front Facing');
    this.addTilerCounter('mali_hwc_BACK_FACING', 'Back Facing');
    this.addTilerCounter('mali_hwc_PRIM_VISIBLE', 'Prim Visible');
    this.addTilerCounter('mali_hwc_PRIM_CULLED', 'Prim Culled');
    this.addTilerCounter('mali_hwc_PRIM_CLIPPED', 'Prim Clipped');

    this.addTilerCounter('mali_hwc_WRBUF_HIT', 'Wrbuf Hit');
    this.addTilerCounter('mali_hwc_WRBUF_MISS', 'Wrbuf Miss');
    this.addTilerCounter('mali_hwc_WRBUF_LINE', 'Wrbuf Line');
    this.addTilerCounter('mali_hwc_WRBUF_PARTIAL', 'Wrbuf Partial');
    this.addTilerCounter('mali_hwc_WRBUF_STALL', 'Wrbuf Stall');

    this.addTilerCycles('mali_hwc_ACTIVE', 'Tiler Active');
    this.addTilerCycles('mali_hwc_INDEX_WAIT', 'Index Wait');
    this.addTilerCycles('mali_hwc_INDEX_RANGE_WAIT', 'Index Range Wait');
    this.addTilerCycles('mali_hwc_VERTEX_WAIT', 'Vertex Wait');
    this.addTilerCycles('mali_hwc_PCACHE_WAIT', 'Pcache Wait');
    this.addTilerCycles('mali_hwc_WRBUF_WAIT', 'Wrbuf Wait');
    this.addTilerCycles('mali_hwc_BUS_READ', 'Bus Read');
    this.addTilerCycles('mali_hwc_BUS_WRITE', 'Bus Write');

    this.addTilerCycles('mali_hwc_TILER_UTLB_STALL', 'Tiler UTLB Stall');
    this.addTilerCycles('mali_hwc_TILER_UTLB_HIT', 'Tiler UTLB Hit');

    this.addFragCycles('mali_hwc_FRAG_ACTIVE', 'Active');
    /* NB: don't propagate spelling mistakes to labels */
    this.addFragCounter('mali_hwc_FRAG_PRIMATIVES', 'Primitives');
    this.addFragCounter('mali_hwc_FRAG_PRIMATIVES_DROPPED',
        'Primitives Dropped');
    this.addFragCycles('mali_hwc_FRAG_CYCLE_DESC', 'Descriptor Processing');
    this.addFragCycles('mali_hwc_FRAG_CYCLES_PLR', 'PLR Processing??');
    this.addFragCycles('mali_hwc_FRAG_CYCLES_VERT', 'Vertex Processing');
    this.addFragCycles('mali_hwc_FRAG_CYCLES_TRISETUP', 'Triangle Setup');
    this.addFragCycles('mali_hwc_FRAG_CYCLES_RAST', 'Rasterization???');
    this.addFragCounter('mali_hwc_FRAG_THREADS', 'Threads');
    this.addFragCounter('mali_hwc_FRAG_DUMMY_THREADS', 'Dummy Threads');
    this.addFragCounter('mali_hwc_FRAG_QUADS_RAST', 'Quads Rast');
    this.addFragCounter('mali_hwc_FRAG_QUADS_EZS_TEST', 'Quads EZS Test');
    this.addFragCounter('mali_hwc_FRAG_QUADS_EZS_KILLED', 'Quads EZS Killed');
    this.addFragCounter('mali_hwc_FRAG_QUADS_LZS_TEST', 'Quads LZS Test');
    this.addFragCounter('mali_hwc_FRAG_QUADS_LZS_KILLED', 'Quads LZS Killed');
    this.addFragCycles('mali_hwc_FRAG_CYCLE_NO_TILE', 'No Tiles');
    this.addFragCounter('mali_hwc_FRAG_NUM_TILES', 'Tiles');
    this.addFragCounter('mali_hwc_FRAG_TRANS_ELIM', 'Transactions Eliminated');

    this.addComputeCycles('mali_hwc_COMPUTE_ACTIVE', 'Active');
    this.addComputeCounter('mali_hwc_COMPUTE_TASKS', 'Tasks');
    this.addComputeCounter('mali_hwc_COMPUTE_THREADS', 'Threads Started');
    this.addComputeCycles('mali_hwc_COMPUTE_CYCLES_DESC',
        'Waiting for Descriptors');

    this.addTripipeCycles('mali_hwc_TRIPIPE_ACTIVE', 'Active');

    this.addArithCounter('mali_hwc_ARITH_WORDS', 'Instructions (/Pipes)');
    this.addArithCycles('mali_hwc_ARITH_CYCLES_REG',
        'Reg scheduling stalls (/Pipes)');
    this.addArithCycles('mali_hwc_ARITH_CYCLES_L0',
        'L0 cache miss stalls (/Pipes)');
    this.addArithCounter('mali_hwc_ARITH_FRAG_DEPEND',
        'Frag dep check failures (/Pipes)');

    this.addLSCounter('mali_hwc_LS_WORDS', 'Instruction Words Completed');
    this.addLSCounter('mali_hwc_LS_ISSUES', 'Full Pipeline Issues');
    this.addLSCounter('mali_hwc_LS_RESTARTS', 'Restarts (unpairable insts)');
    this.addLSCounter('mali_hwc_LS_REISSUES_MISS',
        'Pipeline reissue (cache miss/uTLB)');
    this.addLSCounter('mali_hwc_LS_REISSUES_VD',
        'Pipeline reissue (varying data)');
    /* TODO(sleffler) fix kernel event typo */
    this.addLSCounter('mali_hwc_LS_REISSUE_ATTRIB_MISS',
        'Pipeline reissue (attribute cache miss)');
    this.addLSCounter('mali_hwc_LS_REISSUE_NO_WB', 'Writeback not used');

    this.addTexCounter('mali_hwc_TEX_WORDS', 'Words');
    this.addTexCounter('mali_hwc_TEX_BUBBLES', 'Bubbles');
    this.addTexCounter('mali_hwc_TEX_WORDS_L0', 'Words L0');
    this.addTexCounter('mali_hwc_TEX_WORDS_DESC', 'Words Desc');
    this.addTexCounter('mali_hwc_TEX_THREADS', 'Threads');
    this.addTexCounter('mali_hwc_TEX_RECIRC_FMISS', 'Recirc due to Full Miss');
    this.addTexCounter('mali_hwc_TEX_RECIRC_DESC', 'Recirc due to Desc Miss');
    this.addTexCounter('mali_hwc_TEX_RECIRC_MULTI', 'Recirc due to Multipass');
    this.addTexCounter('mali_hwc_TEX_RECIRC_PMISS',
        'Recirc due to Partial Cache Miss');
    this.addTexCounter('mali_hwc_TEX_RECIRC_CONF',
        'Recirc due to Cache Conflict');

    this.addLSCCounter('mali_hwc_LSC_READ_HITS', 'Read Hits');
    this.addLSCCounter('mali_hwc_LSC_READ_MISSES', 'Read Misses');
    this.addLSCCounter('mali_hwc_LSC_WRITE_HITS', 'Write Hits');
    this.addLSCCounter('mali_hwc_LSC_WRITE_MISSES', 'Write Misses');
    this.addLSCCounter('mali_hwc_LSC_ATOMIC_HITS', 'Atomic Hits');
    this.addLSCCounter('mali_hwc_LSC_ATOMIC_MISSES', 'Atomic Misses');
    this.addLSCCounter('mali_hwc_LSC_LINE_FETCHES', 'Line Fetches');
    this.addLSCCounter('mali_hwc_LSC_DIRTY_LINE', 'Dirty Lines');
    this.addLSCCounter('mali_hwc_LSC_SNOOPS', 'Snoops');

    this.addAXICounter('mali_hwc_AXI_TLB_STALL', 'Address channel stall');
    this.addAXICounter('mali_hwc_AXI_TLB_MISS', 'Cache Miss');
    this.addAXICounter('mali_hwc_AXI_TLB_TRANSACTION', 'Transactions');
    this.addAXICounter('mali_hwc_LS_TLB_MISS', 'LS Cache Miss');
    this.addAXICounter('mali_hwc_LS_TLB_HIT', 'LS Cache Hit');
    this.addAXICounter('mali_hwc_AXI_BEATS_READ', 'Read Beats');
    this.addAXICounter('mali_hwc_AXI_BEATS_WRITE', 'Write Beats');

    this.addMMUCounter('mali_hwc_MMU_TABLE_WALK', 'Page Table Walks');
    this.addMMUCounter('mali_hwc_MMU_REPLAY_MISS',
        'Cache Miss from Replay Buffer');
    this.addMMUCounter('mali_hwc_MMU_REPLAY_FULL', 'Replay Buffer Full');
    this.addMMUCounter('mali_hwc_MMU_NEW_MISS', 'Cache Miss on New Request');
    this.addMMUCounter('mali_hwc_MMU_HIT', 'Cache Hit');

    this.addMMUCycles('mali_hwc_UTLB_STALL', 'UTLB Stalled');
    this.addMMUCycles('mali_hwc_UTLB_REPLAY_MISS', 'UTLB Replay Miss');
    this.addMMUCycles('mali_hwc_UTLB_REPLAY_FULL', 'UTLB Replay Full');
    this.addMMUCycles('mali_hwc_UTLB_NEW_MISS', 'UTLB New Miss');
    this.addMMUCycles('mali_hwc_UTLB_HIT', 'UTLB Hit');

    this.addL2Counter('mali_hwc_L2_READ_BEATS', 'Read Beats');
    this.addL2Counter('mali_hwc_L2_WRITE_BEATS', 'Write Beats');
    this.addL2Counter('mali_hwc_L2_ANY_LOOKUP', 'Any Lookup');
    this.addL2Counter('mali_hwc_L2_READ_LOOKUP', 'Read Lookup');
    this.addL2Counter('mali_hwc_L2_SREAD_LOOKUP', 'Shareable Read Lookup');
    this.addL2Counter('mali_hwc_L2_READ_REPLAY', 'Read Replayed');
    this.addL2Counter('mali_hwc_L2_READ_SNOOP', 'Read Snoop');
    this.addL2Counter('mali_hwc_L2_READ_HIT', 'Read Cache Hit');
    this.addL2Counter('mali_hwc_L2_CLEAN_MISS', 'CleanUnique Miss');
    this.addL2Counter('mali_hwc_L2_WRITE_LOOKUP', 'Write Lookup');
    this.addL2Counter('mali_hwc_L2_SWRITE_LOOKUP', 'Shareable Write Lookup');
    this.addL2Counter('mali_hwc_L2_WRITE_REPLAY', 'Write Replayed');
    this.addL2Counter('mali_hwc_L2_WRITE_SNOOP', 'Write Snoop');
    this.addL2Counter('mali_hwc_L2_WRITE_HIT', 'Write Cache Hit');
    this.addL2Counter('mali_hwc_L2_EXT_READ_FULL', 'ExtRD with BIU Full');
    this.addL2Counter('mali_hwc_L2_EXT_READ_HALF', 'ExtRD with BIU >1/2 Full');
    this.addL2Counter('mali_hwc_L2_EXT_WRITE_FULL', 'ExtWR with BIU Full');
    this.addL2Counter('mali_hwc_L2_EXT_WRITE_HALF', 'ExtWR with BIU >1/2 Full');

    this.addL2Counter('mali_hwc_L2_EXT_READ', 'External Read (ExtRD)');
    this.addL2Counter('mali_hwc_L2_EXT_READ_LINE', 'ExtRD (linefill)');
    this.addL2Counter('mali_hwc_L2_EXT_WRITE', 'External Write (ExtWR)');
    this.addL2Counter('mali_hwc_L2_EXT_WRITE_LINE', 'ExtWR (linefill)');
    this.addL2Counter('mali_hwc_L2_EXT_WRITE_SMALL', 'ExtWR (burst size <64B)');
    this.addL2Counter('mali_hwc_L2_EXT_BARRIER', 'External Barrier');
    this.addL2Counter('mali_hwc_L2_EXT_AR_STALL', 'Address Read stalls');
    this.addL2Counter('mali_hwc_L2_EXT_R_BUF_FULL',
        'Response Buffer full stalls');
    this.addL2Counter('mali_hwc_L2_EXT_RD_BUF_FULL',
        'Read Data Buffer full stalls');
    this.addL2Counter('mali_hwc_L2_EXT_R_RAW', 'RAW hazard stalls');
    this.addL2Counter('mali_hwc_L2_EXT_W_STALL', 'Write Data stalls');
    this.addL2Counter('mali_hwc_L2_EXT_W_BUF_FULL', 'Write Data Buffer full');
    this.addL2Counter('mali_hwc_L2_EXT_R_W_HAZARD', 'WAW or WAR hazard stalls');
    this.addL2Counter('mali_hwc_L2_TAG_HAZARD', 'Tag hazard replays');
    this.addL2Cycles('mali_hwc_L2_SNOOP_FULL', 'Snoop buffer full');
    this.addL2Cycles('mali_hwc_L2_REPLAY_FULL', 'Replay buffer full');

    // DDK events (from X server)
    importer.registerEventHandler('tracing_mark_write:mali_driver',
        MaliParser.prototype.maliDDKEvent.bind(this));

    this.model_ = importer.model_;
  }

  MaliParser.prototype = {
    __proto__: Parser.prototype,

    maliDDKOpenSlice: function(pid, tid, ts, func, blockinfo) {
      var thread = this.importer.model_.getOrCreateProcess(pid)
        .getOrCreateThread(tid);
      var funcArgs = /^([\w\d_]*)(?:\(\))?:?\s*(.*)$/.exec(func);
      thread.sliceGroup.beginSlice('gpu-driver', funcArgs[1], ts,
          { 'args': funcArgs[2],
            'blockinfo': blockinfo });
    },

    maliDDKCloseSlice: function(pid, tid, ts, args, blockinfo) {
      var thread = this.importer.model_.getOrCreateProcess(pid)
        .getOrCreateThread(tid);
      if (!thread.sliceGroup.openSliceCount) {
        // Discard unmatched ends.
        return;
      }
      thread.sliceGroup.endSlice(ts);
    },

    /**
     * Deduce the format of Mali perf events.
     *
     * @return {RegExp} the regular expression for parsing data when the format
     * is recognized; otherwise null.
     */
    autoDetectLineRE: function(line) {
      // Matches Mali perf events with thread info
      var lineREWithThread =
          /^\s*\(([\w\-]*)\)\s*(\w+):\s*([\w\\\/\.\-]*@\d*):?\s*(.*)$/;
      if (lineREWithThread.test(line))
        return lineREWithThread;

      // Matches old-style Mali perf events
      var lineRENoThread = /^s*()(\w+):\s*([\w\\\/.\-]*):?\s*(.*)$/;
      if (lineRENoThread.test(line))
        return lineRENoThread;
      return null;
    },

    lineRE: null,

    /**
     * Parses maliDDK events and sets up state in the importer.
     * events will come in pairs with a cros_trace_print_enter
     * like this (line broken here for formatting):
     *
     * tracing_mark_write: mali_driver: (mali-012345) cros_trace_print_enter: \
     *   gles/src/texture/mali_gles_texture_slave.c@1505: gles2_texturep_upload
     *
     * and a cros_trace_print_exit like this:
     *
     * tracing_mark_write: mali_driver: (mali-012345) cros_trace_print_exit: \
     *   gles/src/texture/mali_gles_texture_slave.c@1505:
     */
    maliDDKEvent: function(eventName, cpuNumber, pid, ts, eventBase) {
      if (this.lineRE == null) {
        this.lineRE = this.autoDetectLineRE(eventBase.details);
        if (this.lineRE == null)
          return false;
      }
      var maliEvent = this.lineRE.exec(eventBase.details);
      // Old-style Mali perf events have no thread id, so make one.
      var tid = (maliEvent[1] === '' ? 'mali' : maliEvent[1]);
      switch (maliEvent[2]) {
        case 'cros_trace_print_enter':
          this.maliDDKOpenSlice(pid, tid, ts, maliEvent[4],
              maliEvent[3]);
          break;
        case 'cros_trace_print_exit':
          this.maliDDKCloseSlice(pid, tid, ts, [], maliEvent[3]);
      }
      return true;
    },

    /*
     * Kernel event support.
     */

    dvfsSample: function(counterName, seriesName, ts, s) {
      var value = parseInt(s);
      var counter = this.model_.getOrCreateProcess(0).
          getOrCreateCounter('DVFS', counterName);
      if (counter.numSeries === 0) {
        counter.addSeries(new tracing.trace_model.CounterSeries(seriesName,
            tvcm.ui.getStringColorId(counter.name)));
      }
      counter.series.forEach(function(series) {
        series.addCounterSample(ts, value);
      });
    },

    dvfsEventEvent: function(eventName, cpuNumber, pid, ts, eventBase) {
      var event = /utilization=(\d+)/.exec(eventBase.details);
      if (!event)
        return false;

      this.dvfsSample('DVFS Utilization', 'utilization', ts, event[1]);
      return true;
    },

    dvfsSetClockEvent: function(eventName, cpuNumber, pid, ts, eventBase) {
      var event = /frequency=(\d+)/.exec(eventBase.details);
      if (!event)
        return false;

      this.dvfsSample('DVFS Frequency', 'frequency', ts, event[1]);
      return true;
    },

    dvfsSetVoltageEvent: function(eventName, cpuNumber, pid, ts, eventBase) {
      var event = /voltage=(\d+)/.exec(eventBase.details);
      if (!event)
        return false;

      this.dvfsSample('DVFS Voltage', 'voltage', ts, event[1]);
      return true;
    },

    hwcSample: function(cat, counterName, seriesName, ts, eventBase) {
      var event = /val=(\d+)/.exec(eventBase.details);
      if (!event)
        return false;
      var value = parseInt(event[1]);

      var counter = this.model_.getOrCreateProcess(0).
          getOrCreateCounter(cat, counterName);
      if (counter.numSeries === 0) {
        counter.addSeries(new tracing.trace_model.CounterSeries(seriesName,
            tvcm.ui.getStringColorId(counter.name)));
      }
      counter.series.forEach(function(series) {
        series.addCounterSample(ts, value);
      });
      return true;
    },

    /*
     * Job Manager block counters.
     */
    jmSample: function(ctrName, seriesName, ts, eventBase) {
      return this.hwcSample('mali:jm', 'JM: ' + ctrName, seriesName, ts,
          eventBase);
    },
    addJMCounter: function(hwcEventName, hwcTitle) {
      function handler(eventName, cpuNumber, pid, ts, eventBase) {
        return this.jmSample(hwcTitle, 'count', ts, eventBase);
      }
      this.importer.registerEventHandler(hwcEventName, handler.bind(this));
    },
    addJMCycles: function(hwcEventName, hwcTitle) {
      function handler(eventName, cpuNumber, pid, ts, eventBase) {
        return this.jmSample(hwcTitle, 'cycles', ts, eventBase);
      }
      this.importer.registerEventHandler(hwcEventName, handler.bind(this));
    },

    /*
     * Tiler block counters.
     */
    tilerSample: function(ctrName, seriesName, ts, eventBase) {
      return this.hwcSample('mali:tiler', 'Tiler: ' + ctrName, seriesName,
          ts, eventBase);
    },
    addTilerCounter: function(hwcEventName, hwcTitle) {
      function handler(eventName, cpuNumber, pid, ts, eventBase) {
        return this.tilerSample(hwcTitle, 'count', ts, eventBase);
      }
      this.importer.registerEventHandler(hwcEventName, handler.bind(this));
    },
    addTilerCycles: function(hwcEventName, hwcTitle) {
      function handler(eventName, cpuNumber, pid, ts, eventBase) {
        return this.tilerSample(hwcTitle, 'cycles', ts, eventBase);
      }
      this.importer.registerEventHandler(hwcEventName, handler.bind(this));
    },

    /*
     * Fragment counters.
     */
    fragSample: function(ctrName, seriesName, ts, eventBase) {
      return this.hwcSample('mali:fragment', 'Fragment: ' + ctrName,
          seriesName, ts, eventBase);
    },
    addFragCounter: function(hwcEventName, hwcTitle) {
      function handler(eventName, cpuNumber, pid, ts, eventBase) {
        return this.fragSample(hwcTitle, 'count', ts, eventBase);
      }
      this.importer.registerEventHandler(hwcEventName, handler.bind(this));
    },
    addFragCycles: function(hwcEventName, hwcTitle) {
      function handler(eventName, cpuNumber, pid, ts, eventBase) {
        return this.fragSample(hwcTitle, 'cycles', ts, eventBase);
      }
      this.importer.registerEventHandler(hwcEventName, handler.bind(this));
    },

    /*
     * Compute counters.
     */
    computeSample: function(ctrName, seriesName, ts, eventBase) {
      return this.hwcSample('mali:compute', 'Compute: ' + ctrName,
          seriesName, ts, eventBase);
    },
    addComputeCounter: function(hwcEventName, hwcTitle) {
      function handler(eventName, cpuNumber, pid, ts, eventBase) {
        return this.computeSample(hwcTitle, 'count', ts, eventBase);
      }
      this.importer.registerEventHandler(hwcEventName, handler.bind(this));
    },
    addComputeCycles: function(hwcEventName, hwcTitle) {
      function handler(eventName, cpuNumber, pid, ts, eventBase) {
        return this.computeSample(hwcTitle, 'cycles', ts, eventBase);
      }
      this.importer.registerEventHandler(hwcEventName, handler.bind(this));
    },

    /*
     * Tripipe counters.
     */
    addTripipeCycles: function(hwcEventName, hwcTitle) {
      function handler(eventName, cpuNumber, pid, ts, eventBase) {
        return this.hwcSample('mali:shader', 'Tripipe: ' + hwcTitle, 'cycles',
            ts, eventBase);
      }
      this.importer.registerEventHandler(hwcEventName, handler.bind(this));
    },

    /*
     * Arith counters.
     */
    arithSample: function(ctrName, seriesName, ts, eventBase) {
      return this.hwcSample('mali:arith', 'Arith: ' + ctrName, seriesName, ts,
          eventBase);
    },
    addArithCounter: function(hwcEventName, hwcTitle) {
      function handler(eventName, cpuNumber, pid, ts, eventBase) {
        return this.arithSample(hwcTitle, 'count', ts, eventBase);
      }
      this.importer.registerEventHandler(hwcEventName, handler.bind(this));
    },
    addArithCycles: function(hwcEventName, hwcTitle) {
      function handler(eventName, cpuNumber, pid, ts, eventBase) {
        return this.arithSample(hwcTitle, 'cycles', ts, eventBase);
      }
      this.importer.registerEventHandler(hwcEventName, handler.bind(this));
    },

    /*
     * Load/Store counters.
     */
    addLSCounter: function(hwcEventName, hwcTitle) {
      function handler(eventName, cpuNumber, pid, ts, eventBase) {
        return this.hwcSample('mali:ls', 'LS: ' + hwcTitle, 'count', ts,
            eventBase);
      }
      this.importer.registerEventHandler(hwcEventName, handler.bind(this));
    },

    /*
     * Texture counters.
     */
    textureSample: function(ctrName, seriesName, ts, eventBase) {
      return this.hwcSample('mali:texture', 'Texture: ' + ctrName,
          seriesName, ts, eventBase);
    },
    addTexCounter: function(hwcEventName, hwcTitle) {
      function handler(eventName, cpuNumber, pid, ts, eventBase) {
        return this.textureSample(hwcTitle, 'count', ts, eventBase);
      }
      this.importer.registerEventHandler(hwcEventName, handler.bind(this));
    },

    /*
     * LSC counters.
     */
    addLSCCounter: function(hwcEventName, hwcTitle) {
      function handler(eventName, cpuNumber, pid, ts, eventBase) {
        return this.hwcSample('mali:lsc', 'LSC: ' + hwcTitle, 'count', ts,
            eventBase);
      }
      this.importer.registerEventHandler(hwcEventName, handler.bind(this));
    },

    /*
     * TLB counters.
     */
    addAXICounter: function(hwcEventName, hwcTitle) {
      function handler(eventName, cpuNumber, pid, ts, eventBase) {
        return this.hwcSample('mali:axi', 'AXI: ' + hwcTitle, 'count', ts,
            eventBase);
      }
      this.importer.registerEventHandler(hwcEventName, handler.bind(this));
    },

    /*
     * MMU counters.
     */
    mmuSample: function(ctrName, seriesName, ts, eventBase) {
      return this.hwcSample('mali:mmu', 'MMU: ' + ctrName, seriesName, ts,
          eventBase);
    },
    addMMUCounter: function(hwcEventName, hwcTitle) {
      function handler(eventName, cpuNumber, pid, ts, eventBase) {
        return this.mmuSample(hwcTitle, 'count', ts, eventBase);
      }
      this.importer.registerEventHandler(hwcEventName, handler.bind(this));
    },
    addMMUCycles: function(hwcEventName, hwcTitle) {
      function handler(eventName, cpuNumber, pid, ts, eventBase) {
        return this.mmuSample(hwcTitle, 'cycles', ts, eventBase);
      }
      this.importer.registerEventHandler(hwcEventName, handler.bind(this));
    },

    /*
     * L2 counters.
     */
    l2Sample: function(ctrName, seriesName, ts, eventBase) {
      return this.hwcSample('mali:l2', 'L2: ' + ctrName, seriesName, ts,
          eventBase);
    },
    addL2Counter: function(hwcEventName, hwcTitle) {
      function handler(eventName, cpuNumber, pid, ts, eventBase) {
        return this.l2Sample(hwcTitle, 'count', ts, eventBase);
      }
      this.importer.registerEventHandler(hwcEventName, handler.bind(this));
    },
    addL2Cycles: function(hwcEventName, hwcTitle) {
      function handler(eventName, cpuNumber, pid, ts, eventBase) {
        return this.l2Sample(hwcTitle, 'cycles', ts, eventBase);
      }
      this.importer.registerEventHandler(hwcEventName, handler.bind(this));
    }
  };

  Parser.registerSubtype(MaliParser);

  return {
    MaliParser: MaliParser
  };
});
