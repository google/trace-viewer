// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('cc');
base.require('cc.layer_tree_quad_stack_view');
base.require('tracing.importer.trace_event_importer');
base.require('tracing.trace_model');
base.require('cc.layer_tree_host_impl_test_data');

base.unittest.testSuite('cc.layer_tree_quad_stack_view', function() {
  test('tileCoverageRectCount', function() {
    var m = new tracing.TraceModel(g_catLTHIEvents);
    var p = m.processes[1];

    var instance = p.objects.getAllInstancesNamed('cc::LayerTreeHostImpl')[0];
    var lthi = instance.snapshots[0];
    var numLayers = lthi.activeTree.renderSurfaceLayerList.length;
    var layer = lthi.activeTree.renderSurfaceLayerList[numLayers - 1];

    var view = new cc.LayerTreeQuadStackView();
    view.layerTreeImpl = lthi.activeTree;
    view.selection = new cc.LayerSelection(layer);
    view.howToShowTiles = 'none';
    view.showInvalidations = false;
    view.showContents = false;
    view.showOtherLAyers = false;

    // There should be some quads drawn with all "show" checkboxes off,
    // but that number can change with new features added.
    var aQuads = view.generateLayerQuads();
    view.howToShowTiles = 'coverage';
    var bQuads = view.generateLayerQuads();
    var numCoverageRects = bQuads.length - aQuads.length;

    // We know we have 5 coverage rects in lthi cats.
    assertEquals(5, numCoverageRects);
  });
});
