// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.range');
tvcm.require('tvcm.ui.d3');
tvcm.require('tvcm.ui.chart_base');
tvcm.require('tvcm.ui.mouse_tracker');

tvcm.requireStylesheet('tvcm.ui.line_chart');

tvcm.exportTo('tvcm.ui', function() {
  var ChartBase = tvcm.ui.ChartBase;
  var getColorOfKey = tvcm.ui.getColorOfKey;

  function getSampleWidth(data, index, leftSide) {
    var leftIndex, rightIndex;
    if (leftSide) {
      leftIndex = Math.max(index - 1, 0);
      rightIndex = index;
    } else {
      leftIndex = index;
      rightIndex = Math.min(index + 1, data.length - 1);
    }
    var leftWidth = data[index].x - data[leftIndex].x;
    var rightWidth = data[rightIndex].x - data[index].x;
    return leftWidth * 0.5 + rightWidth * 0.5;
  }

  /**
   * @constructor
   */
  var LineChart = tvcm.ui.define('line-chart', ChartBase);

  LineChart.prototype = {
    __proto__: ChartBase.prototype,

    decorate: function() {
      ChartBase.prototype.decorate.call(this);
      this.classList.add('line-chart');

      this.brushedRange_ = new tvcm.Range();

      this.xScale_ = d3.scale.linear();
      this.yScale_ = d3.scale.linear();
      d3.select(this.chartAreaElement)
          .append('g')
          .attr('id', 'brushes');
      d3.select(this.chartAreaElement)
          .append('g')
          .attr('id', 'series');

      this.addEventListener('mousedown', this.onMouseDown_.bind(this));
    },

    /**
     * Sets the data array for the object
     *
     * @param {Array} data The data. Each element must be an object, with at
     * least an x property. All other properties become series names in the
     * chart.
     */
    set data(data) {
      if (data.length == 0)
        throw new Error('Data must be nonzero. Pass undefined.');

      var keys;
      if (data !== undefined) {
        var d = data[0];
        if (d.x === undefined)
          throw new Error('Elements must have "x" fields');
        keys = d3.keys(data[0]);
        keys.splice(keys.indexOf('x'), 1);
        if (keys.length == 0)
          throw new Error('Elements must have at least one other field than X');
      } else {
        keys = undefined;
      }
      this.data_ = data;
      this.seriesKeys_ = keys;

      this.updateContents_();
    },

    // Note: range can only be set, not retrieved. It needs to be immutable
    // or else odd data binding effects will result.
    set brushedRange(range) {
      this.brushedRange_.reset();
      this.brushedRange_.addRange(range);
      this.updateContents_();
    },

    computeBrushRangeFromIndices: function(indexA, indexB) {
      var r = new tvcm.Range();
      var leftIndex = Math.min(indexA, indexB);
      var rightIndex = Math.max(indexA, indexB);
      leftIndex = Math.max(0, leftIndex);
      rightIndex = Math.min(this.data_.length - 1, rightIndex);
      r.addValue(this.data_[leftIndex].x -
          getSampleWidth(this.data_, leftIndex, true));
      r.addValue(this.data_[rightIndex].x +
          getSampleWidth(this.data_, rightIndex, false));
      return r;
    },

    getLegendKeys_: function() {
      if (this.seriesKeys_ &&
          this.seriesKeys_.length > 1)
        return this.seriesKeys_.slice();
      return [];
    },

    updateScales_: function(width, height) {
      if (this.data_ === undefined)
        return;

      // X.
      this.xScale_.range([0, width]);
      this.xScale_.domain(d3.extent(this.data_, function(d) { return d.x; }));

      // Y.
      var yRange = new tvcm.Range();
      this.data_.forEach(function(d) {
        this.seriesKeys_.forEach(function(k) {
          yRange.addValue(d[k]);
        });
      }, this);

      this.yScale_.range([height, 0]);
      this.yScale_.domain([yRange.min, yRange.max]);
    },

    updateContents_: function() {
      ChartBase.prototype.updateContents_.call(this);
      if (!this.data_)
        return;

      var chartAreaSel = d3.select(this.chartAreaElement);

      var brushes = this.brushedRange_.isEmpty ? [] : [this.brushedRange_];

      var brushRectsSel = chartAreaSel.select('#brushes')
          .selectAll('rect').data(brushes);
      brushRectsSel.enter()
          .append('rect');
      brushRectsSel.exit().remove();
      brushRectsSel
        .attr('x', function(d) {
            return this.xScale_(d.min);
          }.bind(this))
        .attr('y', 0)
        .attr('width', function(d) {
            return this.xScale_(d.max) - this.xScale_(d.min);
          }.bind(this))
        .attr('height', this.chartAreaSize.height);


      var seriesSel = chartAreaSel.select('#series');
      var pathsSel = seriesSel.selectAll('path').data(this.seriesKeys_);
      pathsSel.enter()
          .append('path')
          .attr('class', 'line')
          .style('stroke', function(key) {
            return getColorOfKey(key);
          })
          .attr('d', function(key) {
            var line = d3.svg.line()
              .x(function(d) { return this.xScale_(d.x); }.bind(this))
              .y(function(d) { return this.yScale_(d[key]); }.bind(this));
            return line(this.data_);
          }.bind(this));
      pathsSel.exit().remove();
    },

    getDataIndexAtClientPoint_: function(clientX, clientY, clipToY) {
      var rect = this.getBoundingClientRect();
      var margin = this.margin;
      var chartAreaSize = this.chartAreaSize;

      var x = clientX - rect.left - margin.left;
      var y = clientY - rect.top - margin.top;

      // Don't check width: let people select the left- and right-most data
      // points.
      if (clipToY) {
        if (y < 0 ||
            y >= chartAreaSize.height)
          return undefined;
      }

      var dataX = this.xScale_.invert(x);

      var index;
      if (this.data_) {
        var bisect = d3.bisector(function(d) { return d.x; }).right;
        index = bisect(this.data_, dataX) - 1;
      }

      return index;
    },

    onMouseDown_: function(e) {
      var index = this.getDataIndexAtClientPoint_(e.clientX, e.clientY, true);

      if (index !== undefined) {
        tvcm.ui.trackMouseMovesUntilMouseUp(
            this.onMouseMove_.bind(this, e.button),
            this.onMouseUp_.bind(this, e.button));
      }
      e.preventDefault();
      e.stopPropagation();

      var event = new Event('item-mousedown');
      event.data = this.data_[index];
      event.index = index;
      event.buttons = e.buttons;
      this.dispatchEvent(event);
    },

    onMouseMove_: function(button, e) {
      var index = this.getDataIndexAtClientPoint_(e.clientX, e.clientY, false);
      if (e.buttons !== undefined) {
        e.preventDefault();
        e.stopPropagation();
      }

      var event = new Event('item-mousemove');
      event.data = this.data_[index];
      event.index = index;
      event.button = button;
      this.dispatchEvent(event);
    },

    onMouseUp_: function(button, e) {
      var index = this.getDataIndexAtClientPoint_(e.clientX, e.clientY, false);
      e.preventDefault();
      e.stopPropagation();

      var event = new Event('item-mouseup');
      event.data = this.data_[index];
      event.index = index;
      event.button = button;
      this.dispatchEvent(event);
    }
  };

  return {
    LineChart: LineChart
  };
});
