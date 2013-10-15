// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.requireStylesheet('cc.layer_tree_host_impl_view');

base.require('cc.layer_tree_host_impl');
base.require('cc.layer_picker');
base.require('cc.layer_view');
base.require('cc.tile');
base.require('tracing.analysis.object_snapshot_view');
base.require('ui.drag_handle');

base.exportTo('cc', function() {
  /*
   * Displays a LayerTreeHostImpl snapshot in a human readable form.
   * @constructor
   */
  var LayerTreeHostImplSnapshotView = ui.define(
      'layer-tree-host-impl-snapshot-view',
      tracing.analysis.ObjectSnapshotView);

  LayerTreeHostImplSnapshotView.prototype = {
    __proto__: tracing.analysis.ObjectSnapshotView.prototype,

    decorate: function() {
      this.classList.add('lthi-s-view');

      this.selection_ = undefined;

      this.layerPicker_ = new cc.LayerPicker();
      this.layerPicker_.addEventListener(
          'selection-changed',
          this.onLayerPickerSelectionChanged_.bind(this));

      this.layerView_ = new cc.LayerView();
      this.layerView_.addEventListener(
          'selection-changed',
          this.onLayerViewSelectionChanged_.bind(this));
      this.dragHandle_ = new ui.DragHandle();
      this.dragHandle_.horizontal = false;
      this.dragHandle_.target = this.layerView_;

      this.appendChild(this.layerPicker_);
      this.appendChild(this.dragHandle_);
      this.appendChild(this.layerView_);

      // Make sure we have the current values from layerView_ and layerPicker_,
      // since those might have been created before we added the listener.
      this.onLayerViewSelectionChanged_();
      this.onLayerPickerSelectionChanged_();

    },

    get objectSnapshot() {
      return this.objectSnapshot_;
    },

    set objectSnapshot(objectSnapshot) {
      this.objectSnapshot_ = objectSnapshot;

      var lthi = this.objectSnapshot;
      var layerTreeImpl;
      if (lthi)
        layerTreeImpl = lthi.getTree(this.layerPicker_.whichTree);

      this.layerPicker_.lthiSnapshot = lthi;
      this.layerView_.whichTree = this.layerPicker_.whichTree;
      this.layerView_.layerTreeImpl = layerTreeImpl;
      this.layerView_.regenerateContent();

      if (!this.selection_)
        return;
      this.selection = this.selection_.findEquivalent(lthi);
    },

    get selection() {
      return this.selection_;
    },

    set selection(selection) {
      this.selection_ = selection;
      this.layerPicker_.selection = selection;
      this.layerView_.selection = selection;
    },

    onLayerPickerSelectionChanged_: function() {
      this.selection_ = this.layerPicker_.selection;
      this.layerView_.selection = this.selection;
      this.layerView_.isRenderPassQuads = this.layerPicker_.isRenderPassQuads;
      this.layerView_.regenerateContent();
    },

    onLayerViewSelectionChanged_: function() {
      this.selection_ = this.layerView_.selection;
      this.layerPicker_.selection = this.selection;
    }

  };

  tracing.analysis.ObjectSnapshotView.register(
      'cc::LayerTreeHostImpl', LayerTreeHostImplSnapshotView);

  return {
    LayerTreeHostImplSnapshotView: LayerTreeHostImplSnapshotView
  };
});
