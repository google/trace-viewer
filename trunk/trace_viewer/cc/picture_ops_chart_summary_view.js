// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.requireStylesheet('cc.picture_ops_chart_summary_view');

tvcm.exportTo('cc', function() {

  var OPS_TIMING_ITERATIONS = 3;
  var CHART_PADDING_LEFT = 65;
  var CHART_PADDING_RIGHT = 40;
  var AXIS_PADDING_LEFT = 60;
  var AXIS_PADDING_RIGHT = 35;
  var AXIS_PADDING_TOP = 25;
  var AXIS_PADDING_BOTTOM = 45;
  var AXIS_LABEL_PADDING = 5;
  var AXIS_TICK_SIZE = 10;
  var LABEL_PADDING = 5;
  var LABEL_INTERLEAVE_OFFSET = 15;
  var BAR_PADDING = 5;
  var VERTICAL_TICKS = 5;
  var HUE_CHAR_CODE_ADJUSTMENT = 5.7;

  /**
   * Provides a chart showing the cumulative time spent in Skia operations
   * during picture rasterization.
   *
   * @constructor
   */
  var PictureOpsChartSummaryView = tvcm.ui.define(
      'picture-ops-chart-summary-view');

  PictureOpsChartSummaryView.prototype = {
    __proto__: HTMLUnknownElement.prototype,

    decorate: function() {
      this.picture_ = undefined;
      this.pictureDataProcessed_ = false;

      this.chartScale_ = window.devicePixelRatio;

      this.chart_ = document.createElement('canvas');
      this.chartCtx_ = this.chart_.getContext('2d');
      this.appendChild(this.chart_);

      this.opsTimingData_ = [];

      this.chartWidth_ = 0;
      this.chartHeight_ = 0;
      this.requiresRedraw_ = true;

      this.currentBarMouseOverTarget_ = null;

      this.chart_.addEventListener('mousemove', this.onMouseMove_.bind(this));
    },

    get requiresRedraw() {
      return this.requiresRedraw_;
    },

    set requiresRedraw(requiresRedraw) {
      this.requiresRedraw_ = requiresRedraw;
    },

    get picture() {
      return this.picture_;
    },

    set picture(picture) {
      this.picture_ = picture;
      this.pictureDataProcessed_ = false;

      if (this.classList.contains('hidden'))
        return;

      this.processPictureData_();
      this.requiresRedraw = true;
      this.updateChartContents();
    },

    hide: function() {
      this.classList.add('hidden');
    },

    show: function() {

      this.classList.remove('hidden');

      if (this.pictureDataProcessed_)
        return;

      this.processPictureData_();
      this.requiresRedraw = true;
      this.updateChartContents();

    },

    onMouseMove_: function(e) {

      var lastBarMouseOverTarget = this.currentBarMouseOverTarget_;
      this.currentBarMouseOverTarget_ = null;

      var x = e.offsetX;
      var y = e.offsetY;

      var chartLeft = CHART_PADDING_LEFT;
      var chartRight = this.chartWidth_ - CHART_PADDING_RIGHT;
      var chartTop = AXIS_PADDING_TOP;
      var chartBottom = this.chartHeight_ - AXIS_PADDING_BOTTOM;
      var chartInnerWidth = chartRight - chartLeft;

      if (x > chartLeft && x < chartRight && y > chartTop && y < chartBottom) {

        this.currentBarMouseOverTarget_ = Math.floor(
            (x - chartLeft) / chartInnerWidth * this.opsTimingData_.length);

        this.currentBarMouseOverTarget_ = tvcm.clamp(
            this.currentBarMouseOverTarget_, 0, this.opsTimingData_.length - 1);

      }

      if (this.currentBarMouseOverTarget_ === lastBarMouseOverTarget)
        return;

      this.drawChartContents_();
    },

    updateChartContents: function() {

      if (this.requiresRedraw)
        this.updateChartDimensions_();

      this.drawChartContents_();
    },

    updateChartDimensions_: function() {
      this.chartWidth_ = this.offsetWidth;
      this.chartHeight_ = this.offsetHeight;

      // Scale up the canvas according to the devicePixelRatio, then reduce it
      // down again via CSS. Finally we apply a scale to the canvas so that
      // things are drawn at the correct size.
      this.chart_.width = this.chartWidth_ * this.chartScale_;
      this.chart_.height = this.chartHeight_ * this.chartScale_;

      this.chart_.style.width = this.chartWidth_ + 'px';
      this.chart_.style.height = this.chartHeight_ + 'px';

      this.chartCtx_.scale(this.chartScale_, this.chartScale_);
    },

    processPictureData_: function() {

      this.resetOpsTimingData_();
      this.pictureDataProcessed_ = true;

      if (!this.picture_)
        return;

      var ops = this.picture_.getOps();
      if (!ops)
        return;

      ops = this.picture_.tagOpsWithTimings(ops);

      // Check that there are valid times.
      if (ops[0].cmd_time === undefined)
        return;

      this.collapseOpsToTimingBuckets_(ops);
    },

    drawChartContents_: function() {

      this.clearChartContents_();

      if (this.opsTimingData_.length === 0) {
        this.showNoTimingDataMessage_();
        return;
      }

      this.drawChartAxes_();
      this.drawBars_();
      this.drawLineAtBottomOfChart_();

      if (this.currentBarMouseOverTarget_ === null)
        return;

      this.drawTooltip_();
    },

    drawLineAtBottomOfChart_: function() {
      this.chartCtx_.strokeStyle = '#AAA';
      this.chartCtx_.moveTo(0, this.chartHeight_ - 0.5);
      this.chartCtx_.lineTo(this.chartWidth_, this.chartHeight_ - 0.5);
      this.chartCtx_.stroke();
    },

    drawTooltip_: function() {

      var tooltipData = this.opsTimingData_[this.currentBarMouseOverTarget_];
      var tooltipTitle = tooltipData.cmd_string;
      var tooltipTime = tooltipData.cmd_time.toFixed(4);

      var tooltipWidth = 110;
      var tooltipHeight = 40;
      var chartInnerWidth = this.chartWidth_ - CHART_PADDING_RIGHT -
          CHART_PADDING_LEFT;
      var barWidth = chartInnerWidth / this.opsTimingData_.length;
      var tooltipOffset = Math.round((tooltipWidth - barWidth) * 0.5);

      var left = CHART_PADDING_LEFT + this.currentBarMouseOverTarget_ *
          barWidth - tooltipOffset;
      var top = Math.round((this.chartHeight_ - tooltipHeight) * 0.5);

      this.chartCtx_.save();

      this.chartCtx_.shadowOffsetX = 0;
      this.chartCtx_.shadowOffsetY = 5;
      this.chartCtx_.shadowBlur = 4;
      this.chartCtx_.shadowColor = 'rgba(0,0,0,0.4)';

      this.chartCtx_.strokeStyle = '#888';
      this.chartCtx_.fillStyle = '#EEE';
      this.chartCtx_.fillRect(left, top, tooltipWidth, tooltipHeight);

      this.chartCtx_.shadowColor = 'transparent';
      this.chartCtx_.translate(0.5, 0.5);
      this.chartCtx_.strokeRect(left, top, tooltipWidth, tooltipHeight);

      this.chartCtx_.restore();

      this.chartCtx_.fillStyle = '#222';
      this.chartCtx_.textBaseline = 'top';
      this.chartCtx_.font = '800 12px Arial';
      this.chartCtx_.fillText(tooltipTitle, left + 8, top + 8);

      this.chartCtx_.fillStyle = '#555';
      this.chartCtx_.textBaseline = 'top';
      this.chartCtx_.font = '400 italic 10px Arial';
      this.chartCtx_.fillText('Total: ' + tooltipTime + 'ms',
          left + 8, top + 22);
    },

    drawBars_: function() {

      var len = this.opsTimingData_.length;
      var max = this.opsTimingData_[0].cmd_time;
      var min = this.opsTimingData_[len - 1].cmd_time;

      var width = this.chartWidth_ - CHART_PADDING_LEFT - CHART_PADDING_RIGHT;
      var height = this.chartHeight_ - AXIS_PADDING_TOP - AXIS_PADDING_BOTTOM;
      var barWidth = Math.floor(width / len);

      var opData;
      var opTiming;
      var opHeight;
      var opLabel;
      var barLeft;

      for (var b = 0; b < len; b++) {

        opData = this.opsTimingData_[b];
        opTiming = opData.cmd_time / max;

        opHeight = Math.round(Math.max(1, opTiming * height));
        opLabel = opData.cmd_string;
        barLeft = CHART_PADDING_LEFT + b * barWidth;

        this.chartCtx_.fillStyle = this.getOpColor_(opLabel);

        this.chartCtx_.fillRect(barLeft + BAR_PADDING, AXIS_PADDING_TOP +
            height - opHeight, barWidth - 2 * BAR_PADDING, opHeight);
      }

    },

    getOpColor_: function(opName) {

      var characters = opName.split('');
      var hue = characters.reduce(this.reduceNameToHue, 0) % 360;

      return 'hsl(' + hue + ', 30%, 50%)';
    },

    reduceNameToHue: function(previousValue, currentValue, index, array) {
      // Get the char code and apply a magic adjustment value so we get
      // pretty colors from around the rainbow.
      return Math.round(previousValue + currentValue.charCodeAt(0) *
          HUE_CHAR_CODE_ADJUSTMENT);
    },

    drawChartAxes_: function() {

      var len = this.opsTimingData_.length;
      var max = this.opsTimingData_[0].cmd_time;
      var min = this.opsTimingData_[len - 1].cmd_time;

      var width = this.chartWidth_ - AXIS_PADDING_LEFT - AXIS_PADDING_RIGHT;
      var height = this.chartHeight_ - AXIS_PADDING_TOP - AXIS_PADDING_BOTTOM;

      var totalBarWidth = this.chartWidth_ - CHART_PADDING_LEFT -
          CHART_PADDING_RIGHT;
      var barWidth = Math.floor(totalBarWidth / len);
      var tickYInterval = height / (VERTICAL_TICKS - 1);
      var tickYPosition = 0;
      var tickValInterval = (max - min) / (VERTICAL_TICKS - 1);
      var tickVal = 0;

      this.chartCtx_.fillStyle = '#333';
      this.chartCtx_.strokeStyle = '#777';
      this.chartCtx_.save();

      // Translate half a pixel to avoid blurry lines.
      this.chartCtx_.translate(0.5, 0.5);

      // Sides.

      this.chartCtx_.save();

      this.chartCtx_.translate(AXIS_PADDING_LEFT, AXIS_PADDING_TOP);
      this.chartCtx_.moveTo(0, 0);
      this.chartCtx_.lineTo(0, height);
      this.chartCtx_.lineTo(width, height);

      // Y-axis ticks.
      this.chartCtx_.font = '10px Arial';
      this.chartCtx_.textAlign = 'right';
      this.chartCtx_.textBaseline = 'middle';

      for (var t = 0; t < VERTICAL_TICKS; t++) {

        tickYPosition = Math.round(t * tickYInterval);
        tickVal = (max - t * tickValInterval).toFixed(4);

        this.chartCtx_.moveTo(0, tickYPosition);
        this.chartCtx_.lineTo(-AXIS_TICK_SIZE, tickYPosition);
        this.chartCtx_.fillText(tickVal,
            -AXIS_TICK_SIZE - AXIS_LABEL_PADDING, tickYPosition);

      }

      this.chartCtx_.stroke();

      this.chartCtx_.restore();


      // Labels.

      this.chartCtx_.save();

      this.chartCtx_.translate(CHART_PADDING_LEFT + Math.round(barWidth * 0.5),
          AXIS_PADDING_TOP + height + LABEL_PADDING);

      this.chartCtx_.font = '10px Arial';
      this.chartCtx_.textAlign = 'center';
      this.chartCtx_.textBaseline = 'top';

      var labelTickLeft;
      var labelTickBottom;
      for (var l = 0; l < len; l++) {

        labelTickLeft = Math.round(l * barWidth);
        labelTickBottom = l % 2 * LABEL_INTERLEAVE_OFFSET;

        this.chartCtx_.save();
        this.chartCtx_.moveTo(labelTickLeft, -LABEL_PADDING);
        this.chartCtx_.lineTo(labelTickLeft, labelTickBottom);
        this.chartCtx_.stroke();
        this.chartCtx_.restore();

        this.chartCtx_.fillText(this.opsTimingData_[l].cmd_string,
            labelTickLeft, labelTickBottom);
      }

      this.chartCtx_.restore();

      this.chartCtx_.restore();
    },

    clearChartContents_: function() {
      this.chartCtx_.clearRect(0, 0, this.chartWidth_, this.chartHeight_);
    },

    showNoTimingDataMessage_: function() {
      this.chartCtx_.font = '800 italic 14px Arial';
      this.chartCtx_.fillStyle = '#333';
      this.chartCtx_.textAlign = 'center';
      this.chartCtx_.textBaseline = 'middle';
      this.chartCtx_.fillText('No timing data available.',
          this.chartWidth_ * 0.5, this.chartHeight_ * 0.5);
    },

    collapseOpsToTimingBuckets_: function(ops) {

      var opsTimingDataIndexHash_ = {};
      var timingData = this.opsTimingData_;
      var op;
      var opIndex;

      for (var i = 0; i < ops.length; i++) {

        op = ops[i];

        if (op.cmd_time === undefined)
          continue;

        // Try to locate the entry for the current operation
        // based on its name. If that fails, then create one for it.
        opIndex = opsTimingDataIndexHash_[op.cmd_string] || null;

        if (opIndex === null) {
          timingData.push({
            cmd_time: 0,
            cmd_string: op.cmd_string
          });

          opIndex = timingData.length - 1;
          opsTimingDataIndexHash_[op.cmd_string] = opIndex;
        }

        timingData[opIndex].cmd_time += op.cmd_time;

      }

      timingData.sort(this.sortTimingBucketsByOpTimeDescending_);

      this.collapseTimingBucketsToOther_(4);
    },

    collapseTimingBucketsToOther_: function(count) {

      var timingData = this.opsTimingData_;
      var otherSource = timingData.splice(count, timingData.length - count);
      var otherDestination = null;

      if (!otherSource.length)
        return;

      timingData.push({
        cmd_time: 0,
        cmd_string: 'Other'
      });

      otherDestination = timingData[timingData.length - 1];
      for (var i = 0; i < otherSource.length; i++) {
        otherDestination.cmd_time += otherSource[i].cmd_time;
      }
    },

    sortTimingBucketsByOpTimeDescending_: function(a, b) {
      return b.cmd_time - a.cmd_time;
    },

    resetOpsTimingData_: function() {
      this.opsTimingData_.length = 0;
    }
  };

  return {
    PictureOpsChartSummaryView: PictureOpsChartSummaryView
  };
});
