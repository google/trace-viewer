// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.range');
tvcm.require('tvcm.ui.d3');
tvcm.require('tvcm.ui.dom_helpers');
tvcm.require('tvcm.ui.chart_base');

tvcm.requireStylesheet('tvcm.ui.sunburst_chart');

tvcm.exportTo('tvcm.ui', function() {
  var ChartBase = tvcm.ui.ChartBase;
  var getColorOfKey = tvcm.ui.getColorOfKey;

  var MIN_RADIUS = 100;

  /**
   * @constructor
   */
  var SunburstChart = tvcm.ui.define('sunburst-chart', ChartBase);

  SunburstChart.prototype = {
    __proto__: ChartBase.prototype,

    decorate: function() {
      ChartBase.prototype.decorate.call(this);
      this.classList.add('sunburst-chart');

      this.data_ = undefined;
      this.seriesKeys_ = undefined;

      this.yDomainMin_ = 0.0;
      this.yDomainMax_ = 0.0;
      this.xDomainScale_ = undefined;
      this.yDomainScale_ = undefined;
      this.radius_ = undefined;
      this.arc_ = undefined;
      this.selectedNode_ = null;
      this.clickStack_ = undefined;
      this.vis_ = undefined;
      this.nodes_ = undefined;
      this.minX_ = 0.0;
      this.maxX_ = 1.0;
      this.minY_ = 0.0;
      this.clickedY_ = 0;

      var chartAreaSel = d3.select(this.chartAreaElement);
      this.legendSel_ = chartAreaSel.append('g');

      var pieGroupSel = chartAreaSel.append('g')
        .attr('class', 'pie-group');
      this.pieGroup_ = pieGroupSel.node();

      this.backSel_ = pieGroupSel.append('g');


      this.pathsGroup_ = pieGroupSel.append('g')
        .attr('class', 'paths')
        .node();
    },

    get data() {
      return this.data_;
    },


    /**
     * @param {Data} Data for the chart, where data must be of the
     * form {category: str, name: str, (size: number or children: [])} .
     */
    set data(data) {
      this.data_ = data;
      this.updateContents_();
    },

    get margin() {
      var margin = {top: 0, right: 0, bottom: 0, left: 0};
      if (this.chartTitle_)
        margin.top += 40;
      return margin;
    },

    set selectedNodeID(id) {
      this.zoomToID_(id);
    },

    get selectedNodeID() {
      if (this.selectedNode_ != null)
        return this.selectedNode_.id;
      return null;
    },

    get selectedNode() {
      if (this.selectedNode_ != null)
        return this.selectedNode_;
      return null;
    },

    getMinSize: function() {
      if (!tvcm.ui.isElementAttachedToDocument(this))
        throw new Error('Cannot measure when unattached');
      this.updateContents_();

      var titleWidth = this.querySelector(
          '#title').getBoundingClientRect().width;
      var margin = this.margin;
      var marginWidth = margin.left + margin.right;
      var marginHeight = margin.top + margin.bottom;

      // TODO(vmiura): Calc this when we're done with layout.
      return {
        width: 600,
        height: 600
      };
    },

    getLegendKeys_: function() {
      // This class creates its own legend, instead of using ChartBase.
      return undefined;
    },

    updateScales_: function(width, height) {
      if (this.data_ === undefined)
        return;
    },

    // Interpolate the scales!
    arcTween_: function(minX, maxX, minY) {
      var that = this;
      var xd, yd, yr;

      if (minY > 0) {
        xd = d3.interpolate(that.xDomainScale_.domain(), [minX, maxX]);
        yd = d3.interpolate(
            that.yDomainScale_.domain(), [minY, that.yDomainMax_]);
        yr = d3.interpolate(that.yDomainScale_.range(), [50, that.radius_]);
      }
      else {
        xd = d3.interpolate(that.xDomainScale_.domain(), [minX, maxX]);
        yd = d3.interpolate(that.yDomainScale_.domain(),
                            [that.yDomainMin_, that.yDomainMax_]);
        yr = d3.interpolate(that.yDomainScale_.range(), [50, that.radius_]);
      }

      return function(d, i) {
        return i ? function(t) { return that.arc_(d); }
            : function(t) {
              that.xDomainScale_.domain(xd(t));
              that.yDomainScale_.domain(yd(t)).range(yr(t));
              return that.arc_(d);
            };
      };
    },

    getNodeById_: function(id) {
      if (!this.nodes_)
        return null;

      if (id < 0 || id > this.nodes_.length)
        return null;

      return this.nodes_[id];
    },

    zoomOut_: function() {
      if (this.clickStack_.length > 1) {
        this.clickStack_.pop();
        this.selectedNodeID = this.clickStack_[this.clickStack_.length - 1];
      }
    },

    zoomToID_: function(id) {
      var d = this.getNodeById_(id);

      if (d) {
        this.clickedY_ = d.y;
        this.minX_ = d.x;
        this.maxX_ = d.x + d.dx;
        this.minY_ = d.y;
      }
      else {
        this.clickedY_ = -1;
        this.minX_ = 0.0;
        this.maxX_ = 1.0;
        this.minY_ = 0.0;
      }

      this.selectedNode_ = d;
      this.redrawSegments_(this.minX_, this.maxX_, this.minY_);
      var path = this.vis_.selectAll('path');

      path.transition()
        .duration(750)
        .attrTween('d', this.arcTween_(this.minX_, this.maxX_, this.minY_));

      this.showBreadcrumbs_(d);

      var e = new Event('node-selected');
      e.node = d;
      this.dispatchEvent(e);
    },

    click_: function(d) {
      if (d3.event.shiftKey) {
        // Zoom partially onto the selected range
        var diff_x = (this.maxX_ - this.minX_) * 0.5;
        this.minX_ = d.x + d.dx * 0.5 - diff_x * 0.5;
        this.minX_ = this.minX_ < 0.0 ? 0.0 : this.minX_;
        this.maxX_ = this.minX_ + diff_x;
        this.maxX_ = this.maxX_ > 1.0 ? 1.0 : this.maxX_;
        this.minX_ = this.maxX_ - diff_x;

        this.selectedNode_ = d;
        this.redrawSegments_(this.minX_, this.maxX_, this.minY_);

        var path = this.vis_.selectAll('path');
        path.transition()
          .duration(750)
          .attrTween('d', this.arcTween_(this.minX_, this.maxX_, this.minY_));

        return;
      }

      if (this.clickStack_[this.clickStack_.length - 1] != d.id) {
        this.clickStack_.push(d.id);
        this.selectedNodeID = d.id;
      }
    },

    // Given a node in a partition layout, return an array of all of its
    // ancestor nodes, highest first, but excluding the root.
    getAncestors_: function(node) {
      var path = [];
      var current = node;
      while (current.parent) {
        path.unshift(current);
        current = current.parent;
      }
      return path;
    },

    showBreadcrumbs_: function(d) {
      var sequenceArray = this.getAncestors_(d);

      // Fade all the segments.
      this.vis_.selectAll('path')
        .style('opacity', function(d) {
            return sequenceArray.indexOf(d) >= 0 ? 0.7 : 1.0;
          });

      var e = new Event('node-highlighted');
      e.node = d;
      this.dispatchEvent(e);

      //if (this.data_.onNodeHighlighted != undefined)
      //  this.data_.onNodeHighlighted(this, d);
    },

    mouseOver_: function(d) {
      this.showBreadcrumbs_(d);
    },

    // Restore everything to full opacity when moving off the
    // visualization.
    mouseLeave_: function(d) {
      var that = this;
      // Hide the breadcrumb trail
      if (that.selectedNode_ != null)
        that.showBreadcrumbs_(that.selectedNode_);
      else {
        // Deactivate all segments during transition.
        that.vis_.selectAll('path')
          .on('mouseover', null);

        // Transition each segment to full opacity and then reactivate it.
        that.vis_.selectAll('path')
          .transition()
          .duration(300)
          .style('opacity', 1)
          .each('end', function() {
              d3.select(that).on('mouseover', function(d) {
                that.mouseOver_(d);
              });
            });
      }
    },

    // Update visible segments between new min/max ranges.
    redrawSegments_: function(minX, maxX, minY) {
      var that = this;
      var scale = maxX - minX;
      var visible_nodes = that.nodes_.filter(function(d) {
        return d.depth &&
            (d.y >= minY) &&
            (d.x < maxX) &&
            (d.x + d.dx > minX) &&
            (d.dx / scale > 0.001);
      });
      var path = that.vis_.data([that.data_.nodes]).selectAll('path')
        .data(visible_nodes, function(d) { return d.id; });

      path.enter().insert('svg:path')
        .attr('d', that.arc_)
        .attr('fill-rule', 'evenodd')
        .style('fill', function(dd) { return getColorOfKey(dd.category); })
        .style('opacity', 1.0)
        .on('mouseover', function(d) { that.mouseOver_(d); })
        .on('click', function(d) { that.click_(d); });

      path.exit().remove();
      return path;
    },

    updateContents_: function() {
      ChartBase.prototype.updateContents_.call(this);
      if (!this.data_)
        return;

      var that = this;

      // Partition data into d3 nodes.
      var partition = d3.layout.partition()
          .size([1, 1])
          .value(function(d) { return d.size; });
      that.nodes_ = partition.nodes(that.data_.nodes);

      // Allocate an id to each node.  Gather all categories.
      var categoryDict = {};
      that.nodes_.forEach(function f(d, i) {
        d.id = i;
        categoryDict[d.category] = null;
      });

      // Create legend.
      var li = {
        w: 85, h: 20, s: 3, r: 3
      };

      var legend = that.legendSel_.append('svg:svg')
          .attr('width', li.w)
          .attr('height', d3.keys(categoryDict).length * (li.h + li.s));

      var g = legend.selectAll('g')
          .data(d3.keys(categoryDict))
          .enter().append('svg:g')
          .attr('transform', function(d, i) {
            return 'translate(0,' + i * (li.h + li.s) + ')';
          });

      g.append('svg:rect')
          .attr('rx', li.r)
          .attr('ry', li.r)
          .attr('width', li.w)
          .attr('height', li.h)
          .style('fill', function(d) { return getColorOfKey(d); });

      g.append('svg:text')
          .attr('x', li.w / 2)
          .attr('y', li.h / 2)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'middle')
          .attr('fill', '#fff')
          .attr('font-size', '12px')
          .text(function(d) { return d; });

      // Create sunburst visualization.
      var width = that.chartAreaSize.width;
      var height = that.chartAreaSize.height;
      that.radius_ = Math.max(MIN_RADIUS, Math.min(width, height) / 2);

      d3.select(that.pieGroup_).attr(
          'transform',
          'translate(' + width / 2 + ',' + height / 2 + ')');

      that.selectedNode_ = null;
      that.clickStack_ = new Array();
      that.clickStack_.push(0);

      var depth = 1.0 + d3.max(that.nodes_, function(d) { return d.depth; });
      that.yDomainMin_ = 1.0 / depth;
      that.yDomainMax_ = Math.min(Math.max(depth, 20), 50) / depth;

      that.xDomainScale_ = d3.scale.linear()
          .range([0, 2 * Math.PI]);

      that.yDomainScale_ = d3.scale.sqrt()
          .domain([that.yDomainMin_, that.yDomainMax_])
          .range([50, that.radius_]);

      that.arc_ = d3.svg.arc()
          .startAngle(function(d) {
            return Math.max(0, Math.min(2 * Math.PI, that.xDomainScale_(d.x)));
          })
          .endAngle(function(d) {
            return Math.max(0,
                Math.min(2 * Math.PI, that.xDomainScale_(d.x + d.dx)));
          })
          .innerRadius(function(d) {
            return Math.max(0, that.yDomainScale_((d.y)));
          })
          .outerRadius(function(d) {
            return Math.max(0, that.yDomainScale_((d.y + d.dy)));
          });


      // Bounding circle underneath the sunburst, to make it easier to detect
      // when the mouse leaves the parent g.
      that.backSel_.append('svg:circle')
          .attr('r', that.radius_)
          .style('opacity', 0.0)
          .on('click', function() { that.zoomOut_(); });


      that.vis_ = d3.select(that.pathsGroup_);
      that.selectedNodeID = 0;
      that.vis_.on('mouseleave', function(d) { that.mouseLeave_(d); });
    },

    updateHighlight_: function() {
      ChartBase.prototype.updateHighlight_.call(this);
      // Update color of pie segments.
      var pathsGroupSel = d3.select(this.pathsGroup_);
      var that = this;
      pathsGroupSel.selectAll('.arc').each(function(d, i) {
        var origData = that.data_[i];
        var highlighted = origData.label == that.currentHighlightedLegendKey;
        var color = getColorOfKey(origData.label, highlighted);
        this.style.fill = getColorOfKey(origData.label, highlighted);
      });
    }
  };

  return {
    SunburstChart: SunburstChart
  };
});
