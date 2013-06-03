// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('tracing.trace_model.object_instance');
base.require('cc.util');

base.exportTo('tcmalloc', function() {
  var ObjectSnapshot = tracing.trace_model.ObjectSnapshot;

  /**
   * @constructor
   */
  function HeapSnapshot() {
    ObjectSnapshot.apply(this, arguments);
  }

  HeapSnapshot.prototype = {
    __proto__: ObjectSnapshot.prototype,

    preInitialize: function() {
      cc.preInitializeObject(this);

      // TODO(jamescook): Any generic field setup can go here.
    },

    // TODO(jamescook): This seems to be called before the green dot is clicked.
    // Consider doing it in heap_view.js.
    initialize: function() {
      if (this.args.length == 0)
        throw new Error('No heap snapshot data.');

      // The first entry is total allocations across all stack traces.
      this.total_ = this.args[0];
      // The rest is a list of allocations.
      var allocs = this.args.slice(1);

      // Build a nested dictionary of trace event names.
      this.heap_ = {
        children: {},
        currentBytes: 0,
        currentAllocs: 0,
        totalBytes: 0,
        totalAllocs: 0
      };
      for (var i = 0; i < allocs.length; i++) {
        var alloc = allocs[i];
        var traceNames = alloc.trace.split(' ');
        // We don't want to record allocations caused by the heap profiling
        // system itself, so skip allocations with this special name.
        if (traceNames.indexOf('trace-memory-ignore') != -1)
          continue;
        var heapEntry = this.heap_;
        // Walk down into the heap of stack traces.
        for (var j = 0; j < traceNames.length; j++) {
          // Look for existing children with this trace.
          var traceName = traceNames[j];
          // The empty trace name means "(here)", so don't roll those up into
          // parent traces because they have already been counted.
          if (traceName.length != 0) {
            // Add up the total memory for intermediate entries, so the top of
            // each subtree is the total memory for that tree.
            heapEntry.currentBytes += alloc.currentBytes;
            heapEntry.currentAllocs += alloc.currentAllocs;
            heapEntry.totalBytes += alloc.totalBytes;
            heapEntry.totalAllocs += alloc.totalAllocs;
          }
          if (!heapEntry.children[traceName]) {
            // New trace entry at this depth, so create a child for it.
            heapEntry.children[traceName] = {
              children: {},
              currentBytes: alloc.currentBytes,
              currentAllocs: alloc.currentAllocs,
              totalBytes: alloc.totalBytes,
              totalAllocs: alloc.totalAllocs
            };
          }
          // Descend into the children.
          heapEntry = heapEntry.children[traceName];
        }
      }
    }

  };

  ObjectSnapshot.register('memory::Heap', HeapSnapshot);

  return {
    HeapSnapshot: HeapSnapshot
  };
});
