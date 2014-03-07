// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview GzipImporter inflates gzip compressed data and passes it along
 * to an actual importer.
 */
tvcm.require('tracing.importer.importer');
tvcm.require('tracing.trace_model');
tvcm.requireRawScript('jszip.js');
tvcm.requireRawScript('jszip-inflate.js');

tvcm.exportTo('tracing.importer', function() {

  var Importer = tracing.importer.Importer;

  var GZIP_HEADER_ID1 = 0x1f;
  var GZIP_HEADER_ID2 = 0x8b;
  var GZIP_DEFLATE_COMPRESSION = 8;

  function GzipImporter(model, eventData) {
    // Normalize the data into an Uint8Array.
    if (typeof(eventData) === 'string' || eventData instanceof String) {
      eventData = JSZip.utils.transformTo('uint8array', eventData);
    } else if (eventData instanceof ArrayBuffer) {
      eventData = new Uint8Array(eventData);
    } else
      throw new Error('Unknown gzip data format');
    this.model_ = model;
    this.gzipData_ = eventData;
  }

  /**
   * @param {eventData} Possibly gzip compressed data as a string or an
   *                    ArrayBuffer.
   * @return {boolean} Whether obj looks like gzip compressed data.
   */
  GzipImporter.canImport = function(eventData) {
    var header;
    if (eventData instanceof ArrayBuffer)
      header = new Uint8Array(eventData.slice(0, 3));
    else if (typeof(eventData) === 'string' || eventData instanceof String) {
      header = eventData.substring(0, 7);
      header =
          [header.charCodeAt(0), header.charCodeAt(1), header.charCodeAt(2)];
    } else
      return false;
    return header[0] == GZIP_HEADER_ID1 &&
        header[1] == GZIP_HEADER_ID2 &&
        header[2] == GZIP_DEFLATE_COMPRESSION;
  };

  /**
   * Inflates (decompresses) the data stored in the given gzip bitstream.
   * @return {string} Inflated data.
   */
  GzipImporter.inflateGzipData_ = function(data) {
    var position = 0;

    function getByte() {
      if (position >= data.length)
        throw new Error('Unexpected end of gzip data');
      return data[position++];
    }

    function getWord() {
      var low = getByte();
      var high = getByte();
      return (high << 8) + low;
    }

    function skipBytes(amount) {
      position += amount;
    }

    function skipZeroTerminatedString() {
      while (getByte() != 0) {}
    }

    var id1 = getByte();
    var id2 = getByte();
    if (id1 !== GZIP_HEADER_ID1 || id2 !== GZIP_HEADER_ID2)
      throw new Error('Not gzip data');
    var compression_method = getByte();
    if (compression_method !== GZIP_DEFLATE_COMPRESSION)
      throw new Error('Unsupported compression method: ' + compression_method);
    var flags = getByte();
    var have_header_crc = flags & (1 << 1);
    var have_extra_fields = flags & (1 << 2);
    var have_file_name = flags & (1 << 3);
    var have_comment = flags & (1 << 4);

    // Skip modification time, extra flags and OS.
    skipBytes(4 + 1 + 1);

    // Skip remaining fields before compressed data.
    if (have_extra_fields) {
      var bytes_to_skip = getWord();
      skipBytes(bytes_to_skip);
    }
    if (have_file_name)
      skipZeroTerminatedString();
    if (have_comment)
      skipZeroTerminatedString();
    if (have_header_crc)
      getWord();

    // Inflate the data using jszip.
    var inflated_data =
        JSZip.compressions['DEFLATE'].uncompress(data.subarray(position));
    return JSZip.utils.transformTo('string', inflated_data);
  },

  GzipImporter.prototype = {
    __proto__: Importer.prototype,

    /**
     * Called by the Model to extract subtraces from the event data. The
     * subtraces are passed on to other importers that can recognize them.
     */
    extractSubtraces: function() {
      var eventData = GzipImporter.inflateGzipData_(this.gzipData_);
      return eventData ? [eventData] : [];
    }
  };

  tracing.TraceModel.registerImporter(GzipImporter);

  return {
    GzipImporter: GzipImporter
  };
});
