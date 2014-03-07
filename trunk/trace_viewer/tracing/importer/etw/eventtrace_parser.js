// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Parses EventTrace events in the Windows event trace format.
 */
tvcm.require('tracing.importer.etw.parser');

tvcm.exportTo('tracing.importer.etw', function() {

  var Parser = tracing.importer.etw.Parser;

  // Constants for EventTrace events.
  var guid = '68FDD900-4A3E-11D1-84F4-0000F80464E3';
  var kEventTraceHeaderOpcode = 0;

  /**
   * Parses Windows EventTrace trace events.
   * @constructor
   */
  function EventTraceParser(importer) {
    Parser.call(this, importer);

    // Register handlers.
    importer.registerEventHandler(guid, kEventTraceHeaderOpcode,
        EventTraceParser.prototype.decodeHeader.bind(this));
  }

  EventTraceParser.prototype = {
    __proto__: Parser.prototype,

    decodeFields: function(header, decoder) {
      if (header.version != 2)
        throw new Error('Incompatible EventTrace event version.');

      var bufferSize = decoder.decodeUInt32();
      var version = decoder.decodeUInt32();
      var providerVersion = decoder.decodeUInt32();
      var numberOfProcessors = decoder.decodeUInt32();
      var endTime = decoder.decodeUInt64ToString();
      var timerResolution = decoder.decodeUInt32();
      var maxFileSize = decoder.decodeUInt32();
      var logFileMode = decoder.decodeUInt32();
      var buffersWritten = decoder.decodeUInt32();
      var startBuffers = decoder.decodeUInt32();
      var pointerSize = decoder.decodeUInt32();
      var eventsLost = decoder.decodeUInt32();
      var cpuSpeed = decoder.decodeUInt32();
      var loggerName = decoder.decodeUInteger(header.is64);
      var logFileName = decoder.decodeUInteger(header.is64);
      var timeZoneInformation = decoder.decodeTimeZoneInformation();
      var padding = decoder.decodeUInt32();
      var bootTime = decoder.decodeUInt64ToString();
      var perfFreq = decoder.decodeUInt64ToString();
      var startTime = decoder.decodeUInt64ToString();
      var reservedFlags = decoder.decodeUInt32();
      var buffersLost = decoder.decodeUInt32();
      var sessionNameString = decoder.decodeW16String();
      var logFileNameString = decoder.decodeW16String();

      return {
        bufferSize: bufferSize,
        version: version,
        providerVersion: providerVersion,
        numberOfProcessors: numberOfProcessors,
        endTime: endTime,
        timerResolution: timerResolution,
        maxFileSize: maxFileSize,
        logFileMode: logFileMode,
        buffersWritten: buffersWritten,
        startBuffers: startBuffers,
        pointerSize: pointerSize,
        eventsLost: eventsLost,
        cpuSpeed: cpuSpeed,
        loggerName: loggerName,
        logFileName: logFileName,
        timeZoneInformation: timeZoneInformation,
        bootTime: bootTime,
        perfFreq: perfFreq,
        startTime: startTime,
        reservedFlags: reservedFlags,
        buffersLost: buffersLost,
        sessionNameString: sessionNameString,
        logFileNameString: logFileNameString
      };
    },

    decodeHeader: function(header, decoder) {
      var fields = this.decodeFields(header, decoder);
      // TODO(etienneb): Update the TraceModel with |fields|.
      return true;
    }

  };

  Parser.registerSubtype(EventTraceParser);

  return {
    EventTraceParser: EventTraceParser
  };
});
