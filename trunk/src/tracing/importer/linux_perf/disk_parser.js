// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Parses filesystem and block device events in the Linux event
 * trace format.
 */
base.require('tracing.importer.linux_perf.parser');
base.exportTo('tracing.importer.linux_perf', function() {

  var Parser = tracing.importer.linux_perf.Parser;

  /**
   * Parses linux filesystem and block device trace events.
   * @constructor
   */
  function DiskParser(importer) {
    Parser.call(this, importer);

    importer.registerEventHandler('ext4_sync_file_enter',
        DiskParser.prototype.ext4SyncFileEnterEvent.bind(this));
    importer.registerEventHandler('ext4_sync_file_exit',
        DiskParser.prototype.ext4SyncFileExitEvent.bind(this));
    importer.registerEventHandler('block_rq_issue',
        DiskParser.prototype.blockRqIssueEvent.bind(this));
    importer.registerEventHandler('block_rq_complete',
        DiskParser.prototype.blockRqCompleteEvent.bind(this));
  }

  DiskParser.prototype = {
    __proto__: Parser.prototype,

    openAsyncSlice: function(ts, category, threadName, pid, key, name) {
      var kthread = this.importer.getOrCreateKernelThread(
          category + ':' + threadName, pid);
      var slice = new tracing.trace_model.AsyncSlice(
          category, name, tracing.getStringColorId(name), ts);
      slice.startThread = kthread.thread;

      if (!kthread.openAsyncSlices) {
        kthread.openAsyncSlices = { };
      }
      kthread.openAsyncSlices[key] = slice;
    },

    closeAsyncSlice: function(ts, category, threadName, pid, key, args) {
      var kthread = this.importer.getOrCreateKernelThread(
          category + ':' + threadName, pid);
      if (kthread.openAsyncSlices) {
        var slice = kthread.openAsyncSlices[key];
        if (slice) {
          slice.duration = ts - slice.start;
          slice.args = args;
          slice.endThread = kthread.thread;
          slice.subSlices = [
            new tracing.trace_model.Slice(category, slice.title,
                slice.colorId, slice.start, slice.args, slice.duration)
          ];
          kthread.thread.asyncSliceGroup.push(slice);
          delete kthread.openAsyncSlices[key];
        }
      }
    },

    /**
     * Parses events and sets up state in the importer.
     */
    ext4SyncFileEnterEvent: function(eventName, cpuNumber, pid, ts, eventBase) {
      var event = /dev (\d+,\d+) ino (\d+) parent (\d+) datasync (\d+)/.
          exec(eventBase.details);
      if (!event)
        return false;

      var device = event[1];
      var inode = parseInt(event[2]);
      var datasync = event[4] == 1;
      var key = device + '-' + inode;
      var action = datasync ? 'fdatasync' : 'fsync';
      this.openAsyncSlice(ts, 'ext4', eventBase.threadName, eventBase.pid,
          key, action);
      return true;
    },

    ext4SyncFileExitEvent: function(eventName, cpuNumber, pid, ts, eventBase) {
      var event = /dev (\d+,\d+) ino (\d+) ret (\d+)/.exec(eventBase.details);
      if (!event)
        return false;

      var device = event[1];
      var inode = parseInt(event[2]);
      var error = parseInt(event[3]);
      var key = device + '-' + inode;
      this.closeAsyncSlice(ts, 'ext4', eventBase.threadName, eventBase.pid,
          key, {
            device: device,
            inode: inode,
            error: error
          });
      return true;
    },

    blockRqIssueEvent: function(eventName, cpuNumber, pid, ts, eventBase) {
      var event = new RegExp('(\\d+,\\d+) (F)?([DWRN])(F)?(A)?(S)?(M)? ' +
          '\\d+ \\(.*\\) (\\d+) \\+ (\\d+) \\[.*\\]').exec(eventBase.details);
      if (!event)
        return false;

      var action;
      switch (event[3]) {
        case 'D':
          action = 'discard';
          break;
        case 'W':
          action = 'write';
          break;
        case 'R':
          action = 'read';
          break;
        case 'N':
          action = 'none';
          break;
        default:
          action = 'unknown';
          break;
      }

      if (event[2]) {
        action += ' flush';
      }
      if (event[4] == 'F') {
        action += ' fua';
      }
      if (event[5] == 'A') {
        action += ' ahead';
      }
      if (event[6] == 'S') {
        action += ' sync';
      }
      if (event[7] == 'M') {
        action += ' meta';
      }
      var device = event[1];
      var sector = parseInt(event[8]);
      var numSectors = parseInt(event[9]);
      var key = device + '-' + sector + '-' + numSectors;
      this.openAsyncSlice(ts, 'block', eventBase.threadName, eventBase.pid,
          key, action);
      return true;
    },

    blockRqCompleteEvent: function(eventName, cpuNumber, pid, ts, eventBase) {
      var event = new RegExp('(\\d+,\\d+) (F)?([DWRN])(F)?(A)?(S)?(M)? ' +
          '\\(.*\\) (\\d+) \\+ (\\d+) \\[(.*)\\]').exec(eventBase.details);
      if (!event)
        return false;

      var device = event[1];
      var sector = parseInt(event[8]);
      var numSectors = parseInt(event[9]);
      var error = parseInt(event[10]);
      var key = device + '-' + sector + '-' + numSectors;
      this.closeAsyncSlice(ts, 'block', eventBase.threadName, eventBase.pid,
          key, {
            device: device,
            sector: sector,
            numSectors: numSectors,
            error: error
          });
      return true;
    }
  };

  Parser.registerSubtype(DiskParser);

  return {
    DiskParser: DiskParser
  };
});
