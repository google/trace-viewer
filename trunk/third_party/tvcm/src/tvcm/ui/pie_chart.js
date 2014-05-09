// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.range');
tvcm.require('tvcm.ui.d3');
tvcm.require('tvcm.ui.dom_helpers');
tvcm.require('tvcm.ui.chart_base');

tvcm.requireStylesheet('tvcm.ui.pie_chart');

tvcm.exportTo('tvcm.ui', function() {
  var ChartBase = tvcm.ui.ChartBase;
  var getColorOfKey = tvcm.ui.getColorOfKey;

  var MIN_RADIUS = 100;

  /**
   * @constructor
   */
  var PieChart = tvcm.ui.define('pie-chart', ChartBase);

  PieChart.prototype = {
    __proto__: ChartBase.prototype,

    decorate: function() {
      ChartBase.prototype.decorate.call(this);
      this.classList.add('pie-chart');

      this.data_ = undefined;
      this.seriesKeys_ = undefined;

      var chartAreaSel = d3.select(this.chartAreaElement);
      var pieGroupSel = chartAreaSel.append('g')
        .attr('class', 'pie-group');
      this.pieGroup_ = pieGroupSel.node();

      this.pathsGroup_ = pieGroupSel.append('g')
        .attr('class', 'paths')
        .node();
      this.labelsGroup_ = pieGroupSel.append('g')
        .attr('class', 'labels')
        .node();
      this.linesGroup_ = pieGroupSel.append('g')
        .attr('class', 'lines')
        .node();
    },

    get data() {
      return this.data_;
    },


    /**
     * @param {Array} data Data for the chart, where each element in the array
     * must be of the form {label: str, value: number}.
     */
    set data(data) {
      if (data !== undefined) {
        // Figure out the label values in the data set. E.g. from
        //   [{label: 'a', ...}, {label: 'b', ...}]
        // we would commpute ['a', 'y']. These become the series keys.
        var seriesKeys = [];
        var seenSeriesKeys = {};
        data.forEach(function(d) {
          var k = d.label;
          if (seenSeriesKeys[k])
            throw new Error('Label ' + k + ' has been used already');
          seriesKeys.push(k);
          seenSeriesKeys[k] = true;
        }, this);
        this.seriesKeys_ = seriesKeys;
      } else {
        this.seriesKeys_ = undefined;
      }
      this.data_ = data;
      this.updateContents_();
    },

    get margin() {
      var margin = {top: 0, right: 0, bottom: 0, left: 0};
      if (this.chartTitle_)
        margin.top += 40;
      return margin;
    },

    getMinSize: function() {
      if (!tvcm.ui.isElementAttachedToDocument(this))
        throw new Error('Cannot measure when unattached');
      this.updateContents_();

      var labelSel = d3.select(this.labelsGroup_).selectAll('.label');
      var maxLabelWidth = -Number.MAX_VALUE;
      var leftTextHeightSum = 0;
      var rightTextHeightSum = 0;
      labelSel.each(function(l) {
        var r = this.getBoundingClientRect();
        maxLabelWidth = Math.max(maxLabelWidth, r.width + 32);
        if (this.style.textAnchor == 'end') {
          leftTextHeightSum += r.height;
        } else {
          rightTextHeightSum += r.height;
        }
      });

      var titleWidth = this.querySelector(
          '#title').getBoundingClientRect().width;
      var margin = this.margin;
      var marginWidth = margin.left + margin.right;
      var marginHeight = margin.top + margin.bottom;
      return {
        width: Math.max(2 * MIN_RADIUS + 2 * maxLabelWidth,
                        titleWidth * 1.1) + marginWidth,
        height: marginHeight + Math.max(2 * MIN_RADIUS,
                                        leftTextHeightSum,
                                        rightTextHeightSum) * 1.25
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

    updateContents_: function() {
      ChartBase.prototype.updateContents_.call(this);
      if (!this.data_)
        return;

      var width = this.chartAreaSize.width;
      var height = this.chartAreaSize.height;
      var radius = Math.max(MIN_RADIUS, Math.min(width, height * 0.95) / 2);

      d3.select(this.pieGroup_).attr(
          'transform',
          'translate(' + width / 2 + ',' + height / 2 + ')');

      // Bind the pie layout to its data
      var pieLayout = d3.layout.pie()
        .value(function(d) { return d.value; })
        .sort(null);

      var piePathsSel = d3.select(this.pathsGroup_)
          .datum(this.data_)
          .selectAll('path')
          .data(pieLayout);

      function midAngle(d) {
        return d.startAngle + (d.endAngle - d.startAngle) / 2;
      }

      var pathsArc = d3.svg.arc()
        .innerRadius(0)
        .outerRadius(radius - 30);

      var valueLabelArc = d3.svg.arc()
        .innerRadius(radius - 100)
        .outerRadius(radius - 30);

      var lineBeginArc = d3.svg.arc()
        .innerRadius(radius - 50)
        .outerRadius(radius - 50);

      var lineEndArc = d3.svg.arc()
        .innerRadius(radius)
        .outerRadius(radius);

      // Paths.
      piePathsSel.enter().append('path')
        .attr('class', 'arc')
        .attr('fill', function(d, i) {
            var origData = this.data_[i];
            var highlighted = (origData.label ===
                               this.currentHighlightedLegendKey);
            return getColorOfKey(origData.label, highlighted);
          }.bind(this))
        .attr('d', pathsArc)
        .on('click', function(d, i) {
            var origData = this.data_[i];
            if (origData.onClick)
              origData.onClick(d, i);
            d3.event.stopPropagation();
          }.bind(this))
        .on('mouseenter', function(d, i) {
            var origData = this.data_[i];
            this.pushTempHighlightedLegendKey(origData.label);
          }.bind(this))
        .on('mouseleave', function(d, i) {
            var origData = this.data_[i];
            this.popTempHighlightedLegendKey(origData.label);
          }.bind(this));

      // Value labels.
      piePathsSel.enter().append('text')
        .attr('class', 'arc-text')
        .attr('transform', function(d) {
            return 'translate(' + valueLabelArc.centroid(d) + ')';
          })
        .attr('dy', '.35em')
        .style('text-anchor', 'middle')
        .text(function(d, i) {
            var origData = this.data_[i];
            if (origData.valueText === undefined)
              return '';

            if (d.endAngle - d.startAngle < 0.4)
              return '';
            return origData.valueText;
          }.bind(this));

      piePathsSel.exit().remove();

      // Labels.
      var labelSel = d3.select(this.labelsGroup_).selectAll('.label')
          .data(pieLayout(this.data_));
      labelSel.enter()
          .append('text')
          .attr('class', 'label')
          .attr('dy', '.35em');

      labelSel.text(function(d) {
        if (d.data.label.length > 40)
          return d.data.label.substr(0, 40) + '...';
        return d.data.label;
      });
      labelSel.attr('transform', function(d) {
        var pos = lineEndArc.centroid(d);
        pos[0] = radius * (midAngle(d) < Math.PI ? 1 : -1);
        return 'translate(' + pos + ')';
      });
      labelSel.style('text-anchor', function(d) {
        return midAngle(d) < Math.PI ? 'start' : 'end';
      });

      // Lines.
      var lineSel = d3.select(this.linesGroup_).selectAll('.line')
          .data(pieLayout(this.data_));
      lineSel.enter()
        .append('polyline')
        .attr('class', 'line')
        .attr('dy', '.35em');
      lineSel.attr('points', function(d) {
        var pos = lineEndArc.centroid(d);
        pos[0] = radius * 0.95 * (midAngle(d) < Math.PI ? 1 : -1);
        return [lineBeginArc.centroid(d), lineEndArc.centroid(d), pos];
      });
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
        this.style.fill = color;
      });
    }
  };

  return {
    PieChart: PieChart
  };
});
