// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.requireStylesheet('ui.quad_stack');

base.require('base.properties');
base.require('base.bbox2');
base.require('base.quad');
base.require('base.utils');
base.require('base.raf');
base.require('ui.quad_view');
base.require('cc.region');
base.require('ui.camera');

base.exportTo('ui', function() {
  var QuadView = ui.QuadView;

  function validateQuads(quads) {
    for (var i = 0; i < quads.length; i++) {
      if (quads[i].stackingGroupId === undefined)
        throw new Error('All quads must have stackingGroupIds');
    }
  }

  /**
   * @constructor
   */
  var QuadStack = ui.define('quad-stack');

  QuadStack.prototype = {
    __proto__: HTMLUnknownElement.prototype,

    decorate: function() {
      this.contentContainer_ = document.createElement('view-container');
      this.appendChild(this.contentContainer_);
      this.viewport_ = undefined;
      this.quads_ = undefined;
      this.debug_ = false;
    },

    initialize: function(unpaddedWorldRect, opt_worldViewportRect) {
      this.viewport_ = new ui.QuadViewViewport(unpaddedWorldRect);

      if (this.debug) {
        this.viewport_.addEventListener('change', function() {
          this.updateDebugIndicator_();
        }.bind(this));
        this.updateDebugIndicator_();
      }

      this.worldViewportRect_ = base.Rect.FromXYWH(
          opt_worldViewportRect.x || 0,
          opt_worldViewportRect.y || 0,
          opt_worldViewportRect.width,
          opt_worldViewportRect.height
          );
    },

    get layers() {
      return this.layers_;
    },

    set layers(newValue) {
      base.setPropertyAndDispatchChange(this, 'layers', newValue);
    },

    get quads() {
      return this.quads_;
    },

    set quads(quads) {
      validateQuads(quads);
      this.quads_ = quads;
      this.updateContents_();
    },

    get debug() {
      return this.debug_;
    },

    set debug(debug) {
      this.debug_ = debug;
      this.updateDebugIndicator_();
    },

    get worldViewportRect() {
      return this.worldViewportRect_;
    },

    get contentContainer() {
      return this.contentContainer_;
    },


    updateContents_: function() {
      // Build the stacks.
      var stackingGroupsById = {};
      var quads = this.quads;
      for (var i = 0; i < quads.length; i++) {
        var quad = quads[i];
        if (stackingGroupsById[quad.stackingGroupId] === undefined)
          stackingGroupsById[quad.stackingGroupId] = [];
        stackingGroupsById[quad.stackingGroupId].push(quad);
      }

      // Get rid of old quad views if needed.
      var numStackingGroups = base.dictionaryValues(stackingGroupsById).length;
      while (this.contentContainer_.children.length > numStackingGroups) {
        var n = this.contentContainer_.children.length - 1;
        this.contentContainer_.removeChild(
            this.contentContainer_.children[n]);
      }

      // Helper function to create a new quad view and track the current one.
      var that = this;
      var curQuadViewIndex = -1;
      var curQuadView = undefined;
      function appendNewQuadView() {
        curQuadViewIndex++;
        if (curQuadViewIndex < that.contentContainer_.children.length) {
          curQuadView = that.contentContainer_.children[curQuadViewIndex];
        } else {
          curQuadView = new QuadView();
          that.contentContainer_.appendChild(curQuadView);
        }
        curQuadView.quads = undefined;
        curQuadView.viewport = that.viewport_;
        curQuadView.pendingQuads = [];
        curQuadView.region = new cc.Region();
        return curQuadView;
      }

      appendNewQuadView();
      for (var stackingGroupId in stackingGroupsById) {
        var stackingGroup = stackingGroupsById[stackingGroupId];
        var bbox = new base.BBox2();
        stackingGroup.forEach(function(q) { bbox.addQuad(q); });
        var bboxRect = bbox.asRect();

        if (curQuadView.region.rectIntersects(bboxRect))
          appendNewQuadView();
        curQuadView.region.rects.push(bboxRect);
        stackingGroup.forEach(function(q) {
          curQuadView.pendingQuads.push(q);
        });
      }

      var topQuadIndex = this.contentContainer_.children.length - 1;
      var topQuad = this.contentContainer_.children[topQuadIndex];
      topQuad.worldViewportRect = this.worldViewportRect_;

      for (var i = 0; i < this.contentContainer_.children.length; i++) {
        var child = this.contentContainer_.children[i];
        child.quads = child.pendingQuads;
        delete child.pendingQuads;
      }

      this.layers = this.contentContainer_.children;
    },

    updateDebugIndicator_: function() {
      this.indicatorCanvas_ = this.indicatorCanvas_ ||
          document.createElement('canvas');
      this.indicatorCanvas_.className = 'quad-stack-debug-indicator';
      this.contentContainer_.appendChild(this.indicatorCanvas_);

      var resizedCanvas = this.viewport_.updateBoxSize(this.indicatorCanvas_);
      var ctx = this.indicatorCanvas_.getContext('2d');
      ctx.fillStyle = 'red';
      ctx.fontStyle = '30px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('X', this.indicatorCanvas_.width / 2,
          this.indicatorCanvas_.height / 2);
    }

  };

  return {
    QuadStack: QuadStack
  };
});
