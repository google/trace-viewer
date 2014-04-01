// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tracing.timeline_view_side_panel');
tvcm.require('tracing.trace_model');

tvcm.testSuite('tracing.timeline_view_side_panel_test', function() {
  var TimelineViewSidePanel = tracing.TimelineViewSidePanel;
  var TimelineViewSidePanelContainer = tracing.TimelineViewSidePanelContainer;

  /**
   * @constructor
   */
  var Panel1 = tvcm.ui.define('panel-1', TimelineViewSidePanel);
  Panel1.textLabel = 'Panel 1';
  Panel1.supportsModel = function(m) {
    return {
      supported: false,
      reason: 'Explanation'
    };
  };

  Panel1.prototype = {
    __proto__: TimelineViewSidePanel.prototype,

    decorate: function() {
      this.textContent = 'I am panel 1';
    }
  };

  /**
   * @constructor
   */
  var Panel2 = tvcm.ui.define('panel-2', TimelineViewSidePanel);
  Panel2.textLabel = 'Panel 2';
  Panel2.supportsModel = function(m) {
    return {
      supported: true
    };
  };

  Panel2.prototype = {
    __proto__: TimelineViewSidePanel.prototype,

    decorate: function() {
      this.textContent = 'I am panel 1';
      this.style.height = '300px';
    }
  };


  function testBasic(name, fn) {
    test(name, function() {
      var registeredPanelConstructors =
          TimelineViewSidePanel.getPanelConstructors();
      var oldConstructors = registeredPanelConstructors.splice(
          0, registeredPanelConstructors.length);
      TimelineViewSidePanel.registerPanelSubtype(Panel1);
      TimelineViewSidePanel.registerPanelSubtype(Panel2);
      try {
        fn.call(this);
      } finally {
        TimelineViewSidePanel.unregisterPanelSubtype(Panel1);
        TimelineViewSidePanel.unregisterPanelSubtype(Panel2);
        registeredPanelConstructors.push.apply(registeredPanelConstructors,
                                               oldConstructors);
      }
    });
  }

  function createModel() {
    var m = new tracing.TraceModel();
    m.importTraces([], false, false, function() {
      var browserProcess = m.getOrCreateProcess(1);
      var browserMain = browserProcess.getOrCreateThread(2);
      browserMain.sliceGroup.beginSlice('cat', 'Task', 0);
      browserMain.sliceGroup.endSlice(10);
      browserMain.sliceGroup.beginSlice('cat', 'Task', 20);
      browserMain.sliceGroup.endSlice(30);
    });
    return m;
  }

  testBasic('instantiateCollapsed', function() {
    var container = new TimelineViewSidePanelContainer();
    container.model = createModel();
    this.addHTMLOutput(container);
  });

  testBasic('instantiateExpanded', function() {
    var container = new TimelineViewSidePanelContainer();
    container.model = createModel();
    container.activePanelConstructor = Panel2;
    container.activePanelConstructor = undefined;
    container.activePanelConstructor = Panel2;
    this.addHTMLOutput(container);
  });

  return {
  };
});
