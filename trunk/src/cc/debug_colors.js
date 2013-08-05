// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Mapping of different tile configuration
 * to border colors and widths.
 */


base.exportTo('cc', function() {
  var tileTypes = {
    highRes: 'highRes',
    lowRes: 'lowRes',
    extraHighRes: 'extraHighRes',
    extraLowRes: 'extraLowRes',
    missing: 'missing',
    culled: 'culled',
    solidColor: 'solidColor',
    picture: 'picture',
    directPicture: 'directPicture',
    unknown: 'unknown'
  };

  var tileBorder = {
    highRes: {
      color: 'rgba(80, 200, 200, 0.7)',
      width: 1
    },
    lowRes: {
      color: 'rgba(212, 83, 192, 0.7)',
      width: 2
    },
    extraHighRes: {
      color: 'rgba(239, 231, 20, 0.7)',
      width: 2
    },
    extraLowRes: {
      color: 'rgba(93, 186, 18, 0.7)',
      width: 2
    },
    missing: {
      color: 'rgba(255, 0, 0, 0.7)',
      width: 1
    },
    culled: {
      color: 'rgba(160, 100, 0, 0.8)',
      width: 1
    },
    solidColor: {
      color: 'rgba(128, 128, 128, 0.7)',
      width: 1
    },
    picture: {
      color: 'rgba(64, 64, 64, 0.7)',
      width: 1
    },
    directPicture: {
      color: 'rgba(127, 255, 0, 1.0)',
      width: 1
    },
    unknown: {
      color: 'rgba(0, 0, 0, 1.0)',
      width: 2
    }
  };

  return {
    tileTypes: tileTypes,
    tileBorder: tileBorder
  };
});

