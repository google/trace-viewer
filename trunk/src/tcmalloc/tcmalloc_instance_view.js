// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.requireStylesheet('tcmalloc.tcmalloc_instance_view');

tvcm.require('tracing.analysis.object_instance_view');
tvcm.require('tracing.analysis.util');

tvcm.exportTo('tcmalloc', function() {

  var tsRound = tracing.analysis.tsRound;

  /**
   * Displays tcmalloc heap memory information over time. A tcmalloc instance
   * has multiple snapshots.
   * @constructor
   */
  var TcmallocInstanceView = tvcm.ui.define(
      'tcmalloc-instance-view', tracing.analysis.ObjectInstanceView);

  TcmallocInstanceView.prototype = {
    __proto__: tracing.analysis.ObjectInstanceView.prototype,

    decorate: function() {
      tracing.analysis.ObjectInstanceView.prototype.decoreate.apply(this);
      this.classList.add('tcmalloc-instance-view');
    },

    updateContents: function() {
      var instance = this.objectInstance_;
      if (!instance || !instance.snapshots || instance.snapshots.length == 0) {
        this.textContent = 'No data found.';
        return;
      }
      // Clear old view.
      this.textContent = '';

      // First, grab the largest N traces from the first snapshot.
      var snapshot = instance.snapshots[0];
      var heapEntry = snapshot.heap_;
      var traceNames = Object.keys(heapEntry.children);
      traceNames.sort(function(a, b) {
        // Sort from large to small.
        return heapEntry.children[b].currentBytes -
            heapEntry.children[a].currentBytes;
      });
      // Only use the largest 5 traces to start
      traceNames = traceNames.slice(0, 5);

      var table = document.createElement('table');
      var titles = ['Total'];
      titles = titles.concat(traceNames);
      table.appendChild(this.buildRow_(null, titles));

      // One array per trace name.
      var chartArrays = [[], [], [], [], []];
      for (var i = 0; i < instance.snapshots.length; i++) {
        var snapshot = instance.snapshots[i];
        var rowData = [snapshot.total_.currentBytes];
        for (var j = 0; j < 5; j++) {
          var bytes = snapshot.heap_.children[traceNames[j]].currentBytes;
          rowData.push(bytes);
          // Associate a megabyte count with a time in seconds.
          chartArrays[j].push(
              [Math.round(snapshot.ts / 1000), bytes / 1024 / 1024]);
        }
        var row = this.buildRow_(snapshot, rowData);
        table.appendChild(row);
      }
      this.appendChild(table);
    },

    buildRow_: function(snapshot, items) {
      var row = document.createElement('tr');
      var td = document.createElement('td');
      if (snapshot) {
        var snapshotLink = new tracing.analysis.ObjectSnapshotLink();
        snapshotLink.objectSnapshot = snapshot;
        td.appendChild(snapshotLink);
      }
      row.appendChild(td);
      for (var i = 0; i < items.length; i++) {
        var data = document.createElement('td');
        data.textContent = items[i];
        row.appendChild(data);
      }
      return row;
    },

    /*
     * Returns a human readable string for a size in bytes.
     */
    getByteString_: function(bytes) {
      var mb = bytes / 1024 / 1024;
      return mb.toFixed(1) + ' MB';
    }
  };

  tracing.analysis.ObjectInstanceView.register(
      'memory::Heap', TcmallocInstanceView);

  return {
    TcmallocInstanceView: TcmallocInstanceView
  };

});
