// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tracing.trace_model.event');
tvcm.require('tvcm.ui.color_scheme');

/**
 * @fileoverview Provides color scheme related functions.
 */
tvcm.exportTo('tracing', function() {

  var paletteRaw = tvcm.ui.getRawColorPalette();
  var palette = tvcm.ui.getColorPalette();

  var SelectionState = tracing.trace_model.SelectionState;

  /**
   * Provides methods to get view values for events.
   */
  var EventPresenter = {
    getAlpha_: function(event) {
      if (event.selectionState === SelectionState.DIMMED)
        return 0.3;
      return 1.0;
    },

    getColorIdOffset_: function(event) {
      if (event.selectionState === SelectionState.SELECTED)
        return tvcm.ui.paletteProperties.highlightIdBoost;
      return 0;
    },

    getTextColor: function(event) {
      if (event.selectionState === SelectionState.DIMMED)
        return 'rgb(60,60,60)';
      return 'rgb(0,0,0)';
    },

    getSliceColorId: function(slice) {
      return slice.colorId + this.getColorIdOffset_(slice);
    },

    getSliceAlpha: function(slice, async) {
      var alpha = this.getAlpha_(slice);
      if (async)
        alpha *= 0.3;
      return alpha;
    },

    getInstantSliceColor: function(instant) {
      var colorId = instant.colorId + this.getColorIdOffset_(instant);
      return tvcm.ui.colorToRGBAString(paletteRaw[colorId],
                                       this.getAlpha_(instant));
    },

    getObjectInstanceColor: function(instance) {
      var colorId = instance.colorId + this.getColorIdOffset_(instance);
      return tvcm.ui.colorToRGBAString(paletteRaw[colorId], 0.25);
    },

    getObjectSnapshotColor: function(snapshot) {
      var colorId =
          snapshot.objectInstance.colorId + this.getColorIdOffset_(snapshot);
      return palette[colorId];
    },

    getCounterSeriesColor: function(colorId, selectionState) {
      return tvcm.ui.colorToRGBAString(
          paletteRaw[colorId],
          this.getAlpha_({selectionState: selectionState}));
    },

    getBarSnapshotColor: function(snapshot, offset) {
      var colorId =
          (snapshot.objectInstance.colorId + offset) %
          tvcm.ui.paletteProperties.numRegularColorIds;
      colorId += this.getColorIdOffset_(snapshot);
      return tvcm.ui.colorToRGBAString(paletteRaw[colorId],
                                       this.getAlpha_(snapshot));
    }
  };

  return {
    EventPresenter: EventPresenter
  };
});
