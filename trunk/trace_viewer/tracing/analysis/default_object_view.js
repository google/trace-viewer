// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.requireStylesheet('tracing.analysis.default_object_view');

tvcm.require('tracing.analysis.analysis_link');
tvcm.require('tracing.analysis.object_instance_view');
tvcm.require('tracing.analysis.object_snapshot_view');
tvcm.require('tracing.analysis.util');
tvcm.require('tracing.analysis.generic_object_view');

tvcm.exportTo('tracing.analysis', function() {
  var tsRound = tracing.analysis.tsRound;

  /*
   * Displays an object instance in a human readable form.
   * @constructor
   */
  var DefaultObjectSnapshotView = tvcm.ui.define(
      'default-object-snapshot-view',
      tracing.analysis.ObjectSnapshotView);

  DefaultObjectSnapshotView.prototype = {
    __proto__: tracing.analysis.ObjectSnapshotView.prototype,

    decorate: function() {
      tracing.analysis.ObjectSnapshotView.prototype.decorate.apply(this);
      this.classList.add('default-object-view');
      this.classList.add('default-object-snapshot-view');
    },

    updateContents: function() {
      var snapshot = this.objectSnapshot;
      if (!snapshot) {
        this.textContent = '';
        return;
      }
      var instance = snapshot.objectInstance;

      var html = '';
      html += '<div class="title">Snapshot of <a id="instance-link"></a> @ ' +
          tsRound(snapshot.ts) + 'ms</div>\n';
      html += '<table>';
      html += '<tr>';
      html += '<tr><td>args:</td><td id="args"></td></tr>\n';
      html += '</table>';
      this.innerHTML = html;

      // TODO(nduca): tvcm.ui.decoreate doesn't work when subclassed. So,
      // replace the template element.
      var instanceLinkEl = new tracing.analysis.ObjectInstanceLink();
      instanceLinkEl.objectInstance = instance;
      var tmp = this.querySelector('#instance-link');
      tmp.parentElement.replaceChild(instanceLinkEl, tmp);

      var argsEl = this.querySelector('#args');
      argsEl.textContent = '';
      var objectView = tracing.analysis.GenericObjectView();
      objectView.object = snapshot.args;
      argsEl.appendChild(objectView);
    }
  };

  /**
   * Displays an object instance in a human readable form.
   * @constructor
   */
  var DefaultObjectInstanceView = tvcm.ui.define(
      'default-object-instance-view',
      tracing.analysis.ObjectInstanceView);

  DefaultObjectInstanceView.prototype = {
    __proto__: tracing.analysis.ObjectInstanceView.prototype,

    decorate: function() {
      tracing.analysis.ObjectInstanceView.prototype.decorate.apply(this);
      this.classList.add('default-object-view');
      this.classList.add('default-object-instance-view');
    },

    updateContents: function() {
      var instance = this.objectInstance;
      if (!instance) {
        this.textContent = '';
        return;
      }

      var html = '';
      html += '<div class="title">' +
          instance.typeName + ' ' +
          instance.id + '</div>\n';
      html += '<table>';
      html += '<tr>';
      html += '<tr><td>creationTs:</td><td>' +
          instance.creationTs + '</td></tr>\n';
      if (instance.deletionTs != Number.MAX_VALUE) {
        html += '<tr><td>deletionTs:</td><td>' +
            instance.deletionTs + '</td></tr>\n';
      } else {
        html += '<tr><td>deletionTs:</td><td>not deleted</td></tr>\n';
      }
      html += '<tr><td>snapshots:</td><td id="snapshots"></td></tr>\n';
      html += '</table>';
      this.innerHTML = html;
      var snapshotsEl = this.querySelector('#snapshots');
      instance.snapshots.forEach(function(snapshot) {
        var snapshotLink = new tracing.analysis.ObjectSnapshotLink();
        snapshotLink.objectSnapshot = snapshot;
        snapshotsEl.appendChild(snapshotLink);
      });
    }
  };

  return {
    DefaultObjectSnapshotView: DefaultObjectSnapshotView,
    DefaultObjectInstanceView: DefaultObjectInstanceView
  };
});
