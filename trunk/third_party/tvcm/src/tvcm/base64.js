// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.exportTo('tvcm', function() {

  function Base64() {
  }

  function b64ToUint6(nChr) {
    if (nChr > 64 && nChr < 91)
      return nChr - 65;
    if (nChr > 96 && nChr < 123)
      return nChr - 71;
    if (nChr > 47 && nChr < 58)
      return nChr + 4;
    if (nChr === 43)
      return 62;
    if (nChr === 47)
      return 63;
    return 0;
  }

  Base64.getDecodedBufferLength = function(input) {
    return input.length * 3 + 1 >> 2;
  }

  Base64.DecodeToTypedArray = function(input, output) {

    var nInLen = input.length;
    var nOutLen = nInLen * 3 + 1 >> 2;
    var nMod3 = 0;
    var nMod4 = 0;
    var nUint24 = 0;
    var nOutIdx = 0;

    if (nOutLen > output.byteLength)
      throw new Error('Output buffer too small to decode.');

    for (var nInIdx = 0; nInIdx < nInLen; nInIdx++) {
      nMod4 = nInIdx & 3;
      nUint24 |= b64ToUint6(input.charCodeAt(nInIdx)) << 18 - 6 * nMod4;
      if (nMod4 === 3 || nInLen - nInIdx === 1) {
        for (nMod3 = 0; nMod3 < 3 && nOutIdx < nOutLen; nMod3++, nOutIdx++) {
          output.setUint8(nOutIdx, nUint24 >>> (16 >>> nMod3 & 24) & 255);
        }
        nUint24 = 0;
      }
    }
    return nOutIdx - 1;
  }

  return {
    Base64: Base64
  };

});
