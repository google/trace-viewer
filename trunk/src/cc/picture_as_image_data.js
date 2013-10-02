// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.exportTo('cc', function() {

  /**
   * @constructor
   */
  function PictureAsImageData(picture, errorOrImageData) {
    this.picture_ = picture;
    if (errorOrImageData instanceof ImageData) {
      this.error_ = undefined;
      this.imageData_ = errorOrImageData;
    } else {
      this.error_ = errorOrImageData;
      this.imageData_ = undefined;
    }
  };

  /**
   * Creates a new pending PictureAsImageData (no image data and no error).
   *
   * @return {PictureAsImageData} a new pending PictureAsImageData.
   */
  PictureAsImageData.Pending = function(picture) {
    return new PictureAsImageData(picture, undefined);
  };

  PictureAsImageData.prototype = {
    get picture() {
      return this.picture_;
    },

    get error() {
      return this.error_;
    },

    get imageData() {
      return this.imageData_;
    },

    isPending: function() {
      return this.error_ === undefined && this.imageData_ === undefined;
    },

    asCanvas: function() {
      if (!this.imageData_)
        return;

      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');

      canvas.width = this.imageData_.width;
      canvas.height = this.imageData_.height;
      ctx.putImageData(this.imageData_, 0, 0);
      return canvas;
    }
  };

  return {
    PictureAsImageData: PictureAsImageData
  };
});
