// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.requireTemplate('cc.picture_debugger');
base.requireStylesheet('cc.picture_debugger');

base.require('base.key_event_manager');
base.require('base.utils');
base.require('cc.picture');
base.require('cc.picture_ops_list_view');
base.require('cc.picture_ops_chart_summary_view');
base.require('cc.picture_ops_chart_view');
base.require('tracing.analysis.generic_object_view');
base.require('ui.drag_handle');
base.require('ui.info_bar');
base.require('ui.list_view');
base.require('ui.overlay');
base.require('ui.mouse_mode_selector');

base.exportTo('cc', function() {

  /**
   * PictureDebugger is a view of a PictureSnapshot for inspecting
   * the picture in detail. (e.g., timing information, etc.)
   *
   * @constructor
   */
  var PictureDebugger = ui.define('picture-debugger');

  PictureDebugger.prototype = {
    __proto__: HTMLUnknownElement.prototype,

    decorate: function() {
      var node = base.instantiateTemplate('#picture-debugger-template');
      this.appendChild(node);

      this.pictureAsImageData_ = undefined;
      this.showOverdraw_ = false;
      this.zoomScaleValue_ = 1;

      this.sizeInfo_ = this.querySelector('.size');
      this.rasterArea_ = this.querySelector('raster-area');
      this.rasterCanvas_ = this.rasterArea_.querySelector('canvas');
      this.rasterCtx_ = this.rasterCanvas_.getContext('2d');

      this.filename_ = this.querySelector('.filename');

      this.drawOpsChartSummaryView_ = new cc.PictureOpsChartSummaryView();
      this.drawOpsChartView_ = new cc.PictureOpsChartView();
      this.drawOpsChartView_.addEventListener(
          'selection-changed', this.onChartBarClicked_.bind(this));

      this.exportButton_ = this.querySelector('.export');
      this.exportButton_.addEventListener(
          'click', this.onSaveAsSkPictureClicked_.bind(this));

      this.trackMouse_();

      var overdrawCheckbox = ui.createCheckBox(
          this, 'showOverdraw',
          'pictureView.showOverdraw', false,
          'Show overdraw');

      var chartCheckbox = ui.createCheckBox(
          this, 'showSummaryChart',
          'pictureView.showSummaryChart', false,
          'Show timing summary');

      var pictureInfo = this.querySelector('picture-info');
      pictureInfo.appendChild(overdrawCheckbox);
      pictureInfo.appendChild(chartCheckbox);

      this.drawOpsView_ = new cc.PictureOpsListView();
      this.drawOpsView_.addEventListener(
          'selection-changed', this.onChangeDrawOps_.bind(this));

      var leftPanel = this.querySelector('left-panel');
      leftPanel.appendChild(this.drawOpsChartSummaryView_);
      leftPanel.appendChild(this.drawOpsView_);

      var middleDragHandle = new ui.DragHandle();
      middleDragHandle.horizontal = false;
      middleDragHandle.target = leftPanel;

      var rightPanel = this.querySelector('right-panel');
      rightPanel.replaceChild(
          this.drawOpsChartView_,
          rightPanel.querySelector('picture-ops-chart-view'));

      this.infoBar_ = new ui.InfoBar();
      this.rasterArea_.appendChild(this.infoBar_);

      this.insertBefore(middleDragHandle, rightPanel);

      this.picture_ = undefined;

      base.KeyEventManager.instance.addListener(
          'keypress', this.onKeyPress_, this);

      // Add a mutation observer so that when the view is resized we can
      // update the chart summary view.
      this.mutationObserver_ = new MutationObserver(
          this.onMutation_.bind(this));
      this.mutationObserver_.observe(leftPanel, { attributes: true });
    },

    onKeyPress_: function(e) {
      if (e.keyCode == 'h'.charCodeAt(0)) {
        this.moveSelectedOpBy(-1);
        e.preventDefault();
        e.stopPropagation();
      } else if (e.keyCode == 'l'.charCodeAt(0)) {
        this.moveSelectedOpBy(1);
        e.preventDefault();
        e.stopPropagation();
      }
    },

    onMutation_: function(mutations) {

      for (var m = 0; m < mutations.length; m++) {
        // A style change would indicate that the element has resized
        // so we should re-render the chart.
        if (mutations[m].attributeName === 'style') {
          this.drawOpsChartSummaryView_.requiresRedraw = true;
          this.drawOpsChartSummaryView_.updateChartContents();

          this.drawOpsChartView_.dimensionsHaveChanged = true;
          this.drawOpsChartView_.updateChartContents();
          break;
        }
      }
    },

    onSaveAsSkPictureClicked_: function() {
      // Decode base64 data into a String
      var rawData = atob(this.picture_.getBase64SkpData());

      // Convert this String into an Uint8Array
      var length = rawData.length;
      var arrayBuffer = new ArrayBuffer(length);
      var uint8Array = new Uint8Array(arrayBuffer);
      for (var c = 0; c < length; c++)
        uint8Array[c] = rawData.charCodeAt(c);

      // Create a blob URL from the binary array.
      var blob = new Blob([uint8Array], {type: 'application/octet-binary'});
      var blobUrl = window.webkitURL.createObjectURL(blob);

      // Create a link and click on it. BEST API EVAR!
      var link = document.createElementNS('http://www.w3.org/1999/xhtml', 'a');
      link.href = blobUrl;
      link.download = this.filename_.value;
      var event = document.createEvent('MouseEvents');
      event.initMouseEvent(
          'click', true, false, window, 0, 0, 0, 0, 0,
          false, false, false, false, 0, null);
      link.dispatchEvent(event);
    },

    get picture() {
      return this.picture_;
    },

    set picture(picture) {
      this.drawOpsView_.picture = picture;
      this.drawOpsChartView_.picture = picture;
      this.drawOpsChartSummaryView_.picture = picture;
      this.picture_ = picture;

      this.exportButton_.disabled = !this.picture_.canSave;

      if (picture) {
        var size = this.getRasterCanvasSize_();
        this.rasterCanvas_.width = size.width;
        this.rasterCanvas_.height = size.height;
      }

      var bounds = this.rasterArea_.getBoundingClientRect();
      var selectorBounds = this.mouseModeSelector_.getBoundingClientRect();
      this.mouseModeSelector_.pos = {
        x: (bounds.right - selectorBounds.width - 10),
        y: bounds.top
      };

      this.rasterize_();

      this.scheduleUpdateContents_();
    },

    getRasterCanvasSize_: function() {
      var style = window.getComputedStyle(this.rasterArea_);
      var width =
          Math.max(parseInt(style.width), this.picture_.layerRect.width);
      var height =
          Math.max(parseInt(style.height), this.picture_.layerRect.height);

      return {
        width: width,
        height: height
      };
    },

    scheduleUpdateContents_: function() {
      if (this.updateContentsPending_)
        return;
      this.updateContentsPending_ = true;
      base.requestAnimationFrameInThisFrameIfPossible(
          this.updateContents_.bind(this)
      );
    },

    updateContents_: function() {
      this.updateContentsPending_ = false;

      if (this.picture_) {
        this.sizeInfo_.textContent = '(' +
            this.picture_.layerRect.width + ' x ' +
            this.picture_.layerRect.height + ')';
      }

      this.drawOpsChartView_.updateChartContents();
      this.drawOpsChartView_.scrollSelectedItemIntoViewIfNecessary();

      // Return if picture hasn't finished rasterizing.
      if (!this.pictureAsImageData_)
        return;

      this.infoBar_.visible = false;
      this.infoBar_.removeAllButtons();
      if (this.pictureAsImageData_.error) {
        this.infoBar_.message = 'Cannot rasterize...';
        this.infoBar_.addButton('More info...', function(e) {
          var overlay = new ui.Overlay();
          overlay.textContent = this.pictureAsImageData_.error;
          overlay.visible = true;
          e.stopPropagation();
          return false;
        }.bind(this));
        this.infoBar_.visible = true;
      }

      this.drawPicture_();
    },

    drawPicture_: function() {
      var size = this.getRasterCanvasSize_();
      if (size.width !== this.rasterCanvas_.width)
        this.rasterCanvas_.width = size.width;
      if (size.height !== this.rasterCanvas_.height)
        this.rasterCanvas_.heigth = size.height;

      this.rasterCtx_.clearRect(0, 0, size.width, size.height);

      if (!this.pictureAsImageData_.imageData)
        return;

      var imgCanvas = this.pictureAsImageData_.asCanvas();
      var w = imgCanvas.width;
      var h = imgCanvas.height;
      this.rasterCtx_.drawImage(imgCanvas, 0, 0, w, h,
                                0, 0, w * this.zoomScaleValue_,
                                h * this.zoomScaleValue_);
    },

    rasterize_: function() {
      if (this.picture_) {
        this.picture_.rasterize(
            {
              stopIndex: this.drawOpsView_.selectedOpIndex,
              showOverdraw: this.showOverdraw_
            },
            this.onRasterComplete_.bind(this));
      }
    },

    onRasterComplete_: function(pictureAsImageData) {
      this.pictureAsImageData_ = pictureAsImageData;
      this.scheduleUpdateContents_();
    },

    moveSelectedOpBy: function(increment) {
      if (this.selectedOpIndex === undefined) {
        this.selectedOpIndex = 0;
        return;
      }
      this.selectedOpIndex = base.clamp(
          this.selectedOpIndex + increment,
          0, this.numOps);
    },

    get numOps() {
      return this.drawOpsView_.numOps;
    },

    get selectedOpIndex() {
      return this.drawOpsView_.selectedOpIndex;
    },

    set selectedOpIndex(index) {
      this.drawOpsView_.selectedOpIndex = index;
      this.drawOpsChartView_.selectedOpIndex = index;
    },

    onChartBarClicked_: function(e) {
      this.drawOpsView_.selectedOpIndex =
          this.drawOpsChartView_.selectedOpIndex;
    },

    onChangeDrawOps_: function(e) {
      this.rasterize_();
      this.scheduleUpdateContents_();

      this.drawOpsChartView_.selectedOpIndex =
          this.drawOpsView_.selectedOpIndex;
    },

    set showOverdraw(v) {
      this.showOverdraw_ = v;
      this.rasterize_();
    },

    set showSummaryChart(chartShouldBeVisible) {
      if (chartShouldBeVisible)
        this.drawOpsChartSummaryView_.show();
      else
        this.drawOpsChartSummaryView_.hide();
    },

    trackMouse_: function() {
      this.mouseModeSelector_ = new ui.MouseModeSelector(this.rasterArea_);
      this.rasterArea_.appendChild(this.mouseModeSelector_);

      this.mouseModeSelector_.supportedModeMask = ui.MOUSE_SELECTOR_MODE.ZOOM;
      this.mouseModeSelector_.mode = ui.MOUSE_SELECTOR_MODE.ZOOM;
      this.mouseModeSelector_.defaultMode = ui.MOUSE_SELECTOR_MODE.ZOOM;
      this.mouseModeSelector_.settingsKey = 'pictureDebugger.mouseModeSelector';

      this.mouseModeSelector_.addEventListener('beginzoom',
          this.onBeginZoom_.bind(this));
      this.mouseModeSelector_.addEventListener('updatezoom',
          this.onUpdateZoom_.bind(this));
      this.mouseModeSelector_.addEventListener('endzoom',
          this.onEndZoom_.bind(this));
    },

    onBeginZoom_: function(e) {
      this.isZooming_ = true;

      this.lastMouseViewPos_ = this.extractRelativeMousePosition_(e);

      e.preventDefault();
    },

    onUpdateZoom_: function(e) {
      if (!this.isZooming_)
        return;

      var currentMouseViewPos = this.extractRelativeMousePosition_(e);

      // Take the distance the mouse has moved and we want to zoom at about
      // 1/1000th of that speed. 0.01 feels jumpy. This could possibly be tuned
      // more if people feel it's too slow.
      this.zoomScaleValue_ +=
          ((this.lastMouseViewPos_.y - currentMouseViewPos.y) * 0.001);
      this.zoomScaleValue_ = Math.max(this.zoomScaleValue_, 0.1);

      this.drawPicture_();

      this.lastMouseViewPos_ = currentMouseViewPos;
    },

    onEndZoom_: function(e) {
      this.lastMouseViewPos_ = undefined;
      this.isZooming_ = false;
      e.preventDefault();
    },

    extractRelativeMousePosition_: function(e) {
      return {
        x: e.clientX - this.rasterArea_.offsetLeft,
        y: e.clientY - this.rasterArea_.offsetTop
      };
    }
  };

  return {
    PictureDebugger: PictureDebugger
  };
});
