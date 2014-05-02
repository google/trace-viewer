// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.requireStylesheet('cc.picture_ops_chart_view');
tvcm.require('tvcm.ui.dom_helpers');

tvcm.exportTo('cc', function() {

  var BAR_PADDING = 1;
  var BAR_WIDTH = 5;
  var CHART_PADDING_LEFT = 65;
  var CHART_PADDING_RIGHT = 30;
  var CHART_PADDING_BOTTOM = 35;
  var CHART_PADDING_TOP = 20;
  var AXIS_PADDING_LEFT = 55;
  var AXIS_PADDING_RIGHT = 30;
  var AXIS_PADDING_BOTTOM = 35;
  var AXIS_PADDING_TOP = 20;
  var AXIS_TICK_SIZE = 5;
  var AXIS_LABEL_PADDING = 5;
  var VERTICAL_TICKS = 5;
  var HUE_CHAR_CODE_ADJUSTMENT = 5.7;

  /**
   * Provides a chart showing the cumulative time spent in Skia operations
   * during picture rasterization.
   *
   * @constructor
   */
  var PictureOpsChartView = tvcm.ui.define('picture-ops-chart-view');

  PictureOpsChartView.prototype = {
    __proto__: HTMLUnknownElement.prototype,

    decorate: function() {
      this.picture_ = undefined;
      this.pictureOps_ = undefined;
      this.opCosts_ = undefined;

      this.chartScale_ = window.devicePixelRatio;

      this.chart_ = document.createElement('canvas');
      this.chartCtx_ = this.chart_.getContext('2d');
      this.appendChild(this.chart_);

      this.selectedOpIndex_ = undefined;
      this.chartWidth_ = 0;
      this.chartHeight_ = 0;
      this.dimensionsHaveChanged_ = true;

      this.currentBarMouseOverTarget_ = undefined;

      this.ninetyFifthPercentileCost_ = 0;
      this.totalOpCost_ = 0;

      this.chart_.addEventListener('click', this.onClick_.bind(this));
      this.chart_.addEventListener('mousemove', this.onMouseMove_.bind(this));

      this.usePercentileScale_ = false;
      this.usePercentileScaleCheckbox_ = tvcm.ui.createCheckBox(
          this, 'usePercentileScale',
          'PictureOpsChartView.usePercentileScale', false,
          'Limit to 95%-ile');
      this.usePercentileScaleCheckbox_.classList.add('use-percentile-scale');
      this.appendChild(this.usePercentileScaleCheckbox_);
    },

    get dimensionsHaveChanged() {
      return this.dimensionsHaveChanged_;
    },

    set dimensionsHaveChanged(dimensionsHaveChanged) {
      this.dimensionsHaveChanged_ = dimensionsHaveChanged;
    },

    get usePercentileScale() {
      return this.usePercentileScale_;
    },

    set usePercentileScale(usePercentileScale) {
      this.usePercentileScale_ = usePercentileScale;
      this.drawChartContents_();
    },

    get numOps() {
      return this.opCosts_.length;
    },

    get selectedOpIndex() {
      return this.selectedOpIndex_;
    },

    set selectedOpIndex(selectedOpIndex) {
      if (selectedOpIndex < 0) throw new Error('Invalid index');
      if (selectedOpIndex >= this.numOps) throw new Error('Invalid index');

      this.selectedOpIndex_ = selectedOpIndex;
    },

    get picture() {
      return this.picture_;
    },

    set picture(picture) {
      this.picture_ = picture;
      this.pictureOps_ = picture.tagOpsWithTimings(picture.getOps());
      this.currentBarMouseOverTarget_ = undefined;
      this.processPictureData_();
      this.dimensionsHaveChanged = true;
    },

    processPictureData_: function() {
      if (this.pictureOps_ === undefined)
        return;

      var totalOpCost = 0;

      // Take a copy of the picture ops data for sorting.
      this.opCosts_ = this.pictureOps_.map(function(op) {
        totalOpCost += op.cmd_time;
        return op.cmd_time;
      });
      this.opCosts_.sort();

      var ninetyFifthPercentileCostIndex = Math.floor(
          this.opCosts_.length * 0.95);
      this.ninetyFifthPercentileCost_ =
          this.opCosts_[ninetyFifthPercentileCostIndex];
      this.maxCost_ = this.opCosts_[this.opCosts_.length - 1];

      this.totalOpCost_ = totalOpCost;
    },

    extractBarIndex_: function(e) {

      var index = undefined;

      if (this.pictureOps_ === undefined ||
          this.pictureOps_.length === 0)
        return index;

      var x = e.offsetX;
      var y = e.offsetY;

      var totalBarWidth = (BAR_WIDTH + BAR_PADDING) * this.pictureOps_.length;

      var chartLeft = CHART_PADDING_LEFT;
      var chartTop = 0;
      var chartBottom = this.chartHeight_ - CHART_PADDING_BOTTOM;
      var chartRight = chartLeft + totalBarWidth;

      if (x < chartLeft || x > chartRight || y < chartTop || y > chartBottom)
        return index;

      index = Math.floor((x - chartLeft) / totalBarWidth *
          this.pictureOps_.length);

      index = tvcm.clamp(index, 0, this.pictureOps_.length - 1);

      return index;
    },

    onClick_: function(e) {

      var barClicked = this.extractBarIndex_(e);

      if (barClicked === undefined)
        return;

      // If we click on the already selected item we should deselect.
      if (barClicked === this.selectedOpIndex)
        this.selectedOpIndex = undefined;
      else
        this.selectedOpIndex = barClicked;

      e.preventDefault();

      tvcm.dispatchSimpleEvent(this, 'selection-changed', false);
    },

    onMouseMove_: function(e) {

      var lastBarMouseOverTarget = this.currentBarMouseOverTarget_;
      this.currentBarMouseOverTarget_ = this.extractBarIndex_(e);

      if (this.currentBarMouseOverTarget_ === lastBarMouseOverTarget)
        return;

      this.drawChartContents_();
    },

    scrollSelectedItemIntoViewIfNecessary: function() {

      if (this.selectedOpIndex === undefined)
        return;

      var width = this.offsetWidth;
      var left = this.scrollLeft;
      var right = left + width;
      var targetLeft = CHART_PADDING_LEFT +
          (BAR_WIDTH + BAR_PADDING) * this.selectedOpIndex;

      if (targetLeft > left && targetLeft < right)
        return;

      this.scrollLeft = (targetLeft - width * 0.5);
    },

    updateChartContents: function() {

      if (this.dimensionsHaveChanged)
        this.updateChartDimensions_();

      this.drawChartContents_();
    },

    updateChartDimensions_: function() {

      if (!this.pictureOps_)
        return;

      var width = CHART_PADDING_LEFT + CHART_PADDING_RIGHT +
          ((BAR_WIDTH + BAR_PADDING) * this.pictureOps_.length);

      if (width < this.offsetWidth)
        width = this.offsetWidth;

      // Allow the element to be its natural size as set by flexbox, then lock
      // the width in before we set the width of the canvas.
      this.chartWidth_ = width;
      this.chartHeight_ = this.getBoundingClientRect().height;

      // Scale up the canvas according to the devicePixelRatio, then reduce it
      // down again via CSS. Finally we apply a scale to the canvas so that
      // things are drawn at the correct size.
      this.chart_.width = this.chartWidth_ * this.chartScale_;
      this.chart_.height = this.chartHeight_ * this.chartScale_;

      this.chart_.style.width = this.chartWidth_ + 'px';
      this.chart_.style.height = this.chartHeight_ + 'px';

      this.chartCtx_.scale(this.chartScale_, this.chartScale_);

      this.dimensionsHaveChanged = false;
    },

    drawChartContents_: function() {

      this.clearChartContents_();

      if (this.pictureOps_ === undefined ||
          this.pictureOps_.length === 0 ||
          this.pictureOps_[0].cmd_time === undefined) {

        this.showNoTimingDataMessage_();
        return;
      }

      this.drawSelection_();
      this.drawBars_();
      this.drawChartAxes_();
      this.drawLinesAtTickMarks_();
      this.drawLineAtBottomOfChart_();

      if (this.currentBarMouseOverTarget_ === undefined)
        return;

      this.drawTooltip_();
    },

    drawSelection_: function() {

      if (this.selectedOpIndex === undefined)
        return;

      var width = (BAR_WIDTH + BAR_PADDING) * this.selectedOpIndex;
      this.chartCtx_.fillStyle = 'rgb(223, 235, 230)';
      this.chartCtx_.fillRect(CHART_PADDING_LEFT, CHART_PADDING_TOP,
          width, this.chartHeight_ - CHART_PADDING_TOP - CHART_PADDING_BOTTOM);
    },

    drawChartAxes_: function() {

      var min = this.opCosts_[0];
      var max = this.opCosts_[this.opCosts_.length - 1];
      var height = this.chartHeight_ - AXIS_PADDING_TOP - AXIS_PADDING_BOTTOM;

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
      this.chartCtx_.beginPath();
      this.chartCtx_.moveTo(AXIS_PADDING_LEFT, AXIS_PADDING_TOP);
      this.chartCtx_.lineTo(AXIS_PADDING_LEFT, this.chartHeight_ -
          AXIS_PADDING_BOTTOM);
      this.chartCtx_.lineTo(this.chartWidth_ - AXIS_PADDING_RIGHT,
          this.chartHeight_ - AXIS_PADDING_BOTTOM);
      this.chartCtx_.stroke();
      this.chartCtx_.closePath();

      // Y-axis ticks.
      this.chartCtx_.translate(AXIS_PADDING_LEFT, AXIS_PADDING_TOP);

      this.chartCtx_.font = '10px Arial';
      this.chartCtx_.textAlign = 'right';
      this.chartCtx_.textBaseline = 'middle';

      this.chartCtx_.beginPath();
      for (var t = 0; t < VERTICAL_TICKS; t++) {

        tickYPosition = Math.round(t * tickYInterval);
        tickVal = (max - t * tickValInterval).toFixed(4);

        this.chartCtx_.moveTo(0, tickYPosition);
        this.chartCtx_.lineTo(-AXIS_TICK_SIZE, tickYPosition);
        this.chartCtx_.fillText(tickVal,
            -AXIS_TICK_SIZE - AXIS_LABEL_PADDING, tickYPosition);

      }

      this.chartCtx_.stroke();
      this.chartCtx_.closePath();

      this.chartCtx_.restore();
    },

    drawLinesAtTickMarks_: function() {

      var height = this.chartHeight_ - AXIS_PADDING_TOP - AXIS_PADDING_BOTTOM;
      var width = this.chartWidth_ - AXIS_PADDING_LEFT - AXIS_PADDING_RIGHT;
      var tickYInterval = height / (VERTICAL_TICKS - 1);
      var tickYPosition = 0;

      this.chartCtx_.save();

      this.chartCtx_.translate(AXIS_PADDING_LEFT + 0.5, AXIS_PADDING_TOP + 0.5);
      this.chartCtx_.beginPath();
      this.chartCtx_.strokeStyle = 'rgba(0,0,0,0.05)';

      for (var t = 0; t < VERTICAL_TICKS; t++) {
        tickYPosition = Math.round(t * tickYInterval);

        this.chartCtx_.moveTo(0, tickYPosition);
        this.chartCtx_.lineTo(width, tickYPosition);
        this.chartCtx_.stroke();
      }

      this.chartCtx_.restore();
      this.chartCtx_.closePath();
    },

    drawLineAtBottomOfChart_: function() {
      this.chartCtx_.strokeStyle = '#AAA';
      this.chartCtx_.beginPath();
      this.chartCtx_.moveTo(0, this.chartHeight_ - 0.5);
      this.chartCtx_.lineTo(this.chartWidth_, this.chartHeight_ - 0.5);
      this.chartCtx_.stroke();
      this.chartCtx_.closePath();
    },

    drawTooltip_: function() {

      var tooltipData = this.pictureOps_[this.currentBarMouseOverTarget_];
      var tooltipTitle = tooltipData.cmd_string;
      var tooltipTime = tooltipData.cmd_time.toFixed(4);
      var toolTipTimePercentage =
          ((tooltipData.cmd_time / this.totalOpCost_) * 100).toFixed(2);

      var tooltipWidth = 120;
      var tooltipHeight = 40;
      var chartInnerWidth = this.chartWidth_ - CHART_PADDING_RIGHT -
          CHART_PADDING_LEFT;
      var barWidth = BAR_WIDTH + BAR_PADDING;
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
      this.chartCtx_.textAlign = 'left';
      this.chartCtx_.textBaseline = 'top';
      this.chartCtx_.font = '800 12px Arial';
      this.chartCtx_.fillText(tooltipTitle, left + 8, top + 8);

      this.chartCtx_.fillStyle = '#555';
      this.chartCtx_.font = '400 italic 10px Arial';
      this.chartCtx_.fillText(tooltipTime + 'ms (' +
          toolTipTimePercentage + '%)', left + 8, top + 22);
    },

    drawBars_: function() {

      var op;
      var opColor = 0;
      var opHeight = 0;
      var opWidth = BAR_WIDTH + BAR_PADDING;
      var opHover = false;

      var bottom = this.chartHeight_ - CHART_PADDING_BOTTOM;
      var maxHeight = this.chartHeight_ - CHART_PADDING_BOTTOM -
          CHART_PADDING_TOP;

      var maxValue;
      if (this.usePercentileScale)
        maxValue = this.ninetyFifthPercentileCost_;
      else
        maxValue = this.maxCost_;

      for (var b = 0; b < this.pictureOps_.length; b++) {

        op = this.pictureOps_[b];
        opHeight = Math.round(
            (op.cmd_time / maxValue) * maxHeight);
        opHeight = Math.max(opHeight, 1);
        opHover = (b === this.currentBarMouseOverTarget_);
        opColor = this.getOpColor_(op.cmd_string, opHover);

        if (b === this.selectedOpIndex)
          this.chartCtx_.fillStyle = '#FFFF00';
        else
          this.chartCtx_.fillStyle = opColor;

        this.chartCtx_.fillRect(CHART_PADDING_LEFT + b * opWidth,
            bottom - opHeight, BAR_WIDTH, opHeight);
      }

    },

    getOpColor_: function(opName, hover) {

      var characters = opName.split('');

      var hue = characters.reduce(this.reduceNameToHue, 0) % 360;
      var saturation = 30;
      var lightness = hover ? '75%' : '50%';

      return 'hsl(' + hue + ', ' + saturation + '%, ' + lightness + '%)';
    },

    reduceNameToHue: function(previousValue, currentValue, index, array) {
      // Get the char code and apply a magic adjustment value so we get
      // pretty colors from around the rainbow.
      return Math.round(previousValue + currentValue.charCodeAt(0) *
          HUE_CHAR_CODE_ADJUSTMENT);
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
    }
  };

  return {
    PictureOpsChartView: PictureOpsChartView
  };
});
