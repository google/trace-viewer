// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.exportTo('cc', function() {
  /**
   * This class represents a tile (from impl side) and its final rect on the
   * layer. Note that the rect is determined by what is needed to cover all
   * of the layer without overlap.
   * @constructor
   */
  function TileCoverageRect(rect, tile) {
    this.geometryRect = rect;
    this.tile = tile;
  }

  return {
    TileCoverageRect: TileCoverageRect
  };
});
