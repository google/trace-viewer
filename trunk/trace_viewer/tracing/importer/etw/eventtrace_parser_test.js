// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tracing.test_utils');
tvcm.require('tracing.importer.etw_importer');
tvcm.require('tracing.importer.etw.eventtrace_parser');

tvcm.unittest.testSuite('tracing.importer.etw.eventtrace_parser_test', function() { // @suppress longLineCheck

  // Constants for EventTrace events.
  var guid = '68FDD900-4A3E-11D1-84F4-0000F80464E3';
  var kEventTraceHeaderOpcode = 0;

  var kEventTraceHeaderPayload32bitV2 =
      'AAABAAYBAQWwHQAAEAAAABEs1WHICMwBYWECAGQAAAABAAAAAwAAAAEAAAAEAAAAAAAAA' +
      'FoJAAAFAAAABgAAACwBAABAAHQAegByAGUAcwAuAGQAbABsACwALQAxADEAMgAAAAAAAA' +
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALAAAAAQACAAAAAAAAAAAAAABAAHQ' +
      'AegByAGUAcwAuAGQAbABsACwALQAxADEAMQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
      'AAAAAAAAAAAAAAADAAAAAgACAAAAAAAAAMT///8AAAAAf0Ob368FzAGdrCMAAAAAACw0o' +
      '2DICMwBAQAAAAAAAABNAGEAawBlACAAVABlAHMAdAAgAEQAYQB0AGEAIABTAGUAcwBzAG' +
      'kAbwBuAAAAYwA6AFwAcwByAGMAXABzAGEAdwBiAHUAYwBrAFwAdAByAHUAbgBrAFwAcwB' +
      'yAGMAXABzAGEAdwBiAHUAYwBrAFwAbABvAGcAXwBsAGkAYgBcAHQAZQBzAHQAXwBkAGEA' +
      'dABhAFwAaQBtAGEAZwBlAF8AZABhAHQAYQBfADMAMgBfAHYAMAAuAGUAdABsAAAA';

  var kEventTraceHeaderPayload64bitV2 =
      'AAABAAYBAQWxHQAABAAAADsuzRRYLM8BYWECAAAAAAABAAEAtgEAAAEAAAAIAAAAHwAAA' +
      'KAGAAAAAAAAAAAAAAAAAAAAAAAALAEAAEAAdAB6AHIAZQBzAC4AZABsAGwALAAtADEAMQ' +
      'AyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAsAAAABAAIAAAAAAAA' +
      'AAAAAAEAAdAB6AHIAZQBzAC4AZABsAGwALAAtADEAMQAxAAAAAAAAAAAAAAAAAAAAAAAA' +
      'AAAAAAAAAAAAAAAAAAAAAAAAAAMAAAACAAIAAAAAAAAAxP///wAAAABZQyWiwCvPAX1GG' +
      'QAAAAAALWSZBFgszwEBAAAAAAAAAFIAZQBsAG8AZwBnAGUAcgAAAEMAOgBcAGsAZQByAG' +
      '4AZQBsAC4AZQB0AGwAAAA=';

  test('DecodeFields', function() {

    var importer = new tracing.importer.EtwImporter('dummy', []);
    var decoder = importer.decoder_;
    var parser = new tracing.importer.etw.EventTraceParser(importer);
    var header;
    var fields;

    // Validate a version 2 32-bit payload.
    header = {
      guid: guid, opcode: kEventTraceHeaderOpcode, version: 2, is64: 0
    };
    decoder.reset(kEventTraceHeaderPayload32bitV2);
    fields = parser.decodeFields(header, decoder);

    assertTrue(fields.bufferSize == 65536);
    assertTrue(fields.version == 83951878);
    assertTrue(fields.providerVersion == 7600);
    assertTrue(fields.numberOfProcessors == 16);
    assertTrue(fields.endTime === '01cc08c861d52c11');
    assertTrue(fields.timerResolution == 156001);
    assertTrue(fields.maxFileSize == 100);
    assertTrue(fields.logFileMode == 1);
    assertTrue(fields.buffersWritten == 3);
    assertTrue(fields.startBuffers == 1);
    assertTrue(fields.pointerSize == 4);
    assertTrue(fields.eventsLost == 0);
    assertTrue(fields.cpuSpeed == 2394);
    assertTrue(fields.loggerName == 5);
    assertTrue(fields.logFileName == 6);
    assertTrue(fields.timeZoneInformation.standardName === '@tzres.dll,-112');
    assertTrue(fields.timeZoneInformation.daylightName === '@tzres.dll,-111');
    assertTrue(fields.bootTime === '01cc05afdf9b437f');
    assertTrue(fields.perfFreq === '000000000023ac9d');
    assertTrue(fields.startTime === '01cc08c860a3342c');
    assertTrue(fields.reservedFlags == 1);
    assertTrue(fields.buffersLost == 0);
    assertTrue(fields.sessionNameString === 'Make Test Data Session');
    assertTrue(fields.logFileNameString ===
               'c:\\src\\sawbuck\\trunk\\src\\sawbuck\\log_lib\\' +
               'test_data\\image_data_32_v0.etl');

    // Validate a version 2 64-bit payload.
    header = {
      guid: guid, opcode: kEventTraceHeaderOpcode, version: 2, is64: 1
    };
    decoder.reset(kEventTraceHeaderPayload64bitV2);
    fields = parser.decodeFields(header, decoder);

    assertTrue(fields.bufferSize == 65536);
    assertTrue(fields.version == 83951878);
    assertTrue(fields.providerVersion == 7601);
    assertTrue(fields.numberOfProcessors == 4);
    assertTrue(fields.endTime === '01cf2c5814cd2e3b');
    assertTrue(fields.timerResolution == 156001);
    assertTrue(fields.maxFileSize == 0);
    assertTrue(fields.logFileMode == 0x10001);
    assertTrue(fields.buffersWritten == 438);
    assertTrue(fields.startBuffers == 1);
    assertTrue(fields.pointerSize == 8);
    assertTrue(fields.eventsLost == 31);
    assertTrue(fields.cpuSpeed == 1696);
    assertTrue(fields.loggerName == 0);
    assertTrue(fields.logFileName == 0);
    assertTrue(fields.timeZoneInformation.standardName === '@tzres.dll,-112');
    assertTrue(fields.timeZoneInformation.daylightName === '@tzres.dll,-111');
    assertTrue(fields.bootTime === '01cf2bc0a2254359');
    assertTrue(fields.perfFreq === '000000000019467d');
    assertTrue(fields.startTime === '01cf2c580499642d');
    assertTrue(fields.reservedFlags == 1);
    assertTrue(fields.buffersLost == 0);
    assertTrue(fields.sessionNameString === 'Relogger');
    assertTrue(fields.logFileNameString === 'C:\\kernel.etl');
  });

});
