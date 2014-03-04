// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tracing.test_utils');
tvcm.require('tracing.importer.etw_importer');

tvcm.unittest.testSuite('tracing.importer.etw_importer_test', function() {

  test('canImport', function() {
    assertFalse(tracing.importer.EtwImporter.canImport('string'));
    assertFalse(tracing.importer.EtwImporter.canImport([]));

    // Must not parse an invalid name.
    var dummy = { name: 'dummy', content: [] };
    assertFalse(tracing.importer.EtwImporter.canImport(dummy));

    // Must parse  an empty valid trace.
    var valid = { name: 'ETW', content: [] };
    assertTrue(tracing.importer.EtwImporter.canImport(valid));
  });

  test('getModel', function() {
    var model = 'dummy';
    var events = [];
    var importer = new tracing.importer.EtwImporter(model, events);
    assertTrue(model === importer.model);
  });

  test('registerEventHandler', function() {
    // Create a dummy EtwImporter.
    var model = 'dummy';
    var events = ['events'];
    var importer = new tracing.importer.EtwImporter(model, events);
    var dummy_handler = function() {};

    // The handler must not exists.
    assertFalse(importer.getEventHandler('ABCDEF', 2));

    // Register an event handler for guid: ABCDEF and opcode: 2.
    importer.registerEventHandler('ABCDEF', 2, dummy_handler);

    // The handler exists now, must find it.
    assertTrue(importer.getEventHandler('ABCDEF', 2));

    // Must be able to manage an invalid handler.
    assertFalse(importer.getEventHandler('zzzzzz', 2));
  });

  test('parseEvent', function() {
    var model = 'dummy';
    var events = [];
    var importer = new tracing.importer.EtwImporter(model, events);
    var handler_called = false;
    var dummy_handler = function() { handler_called = true; return true; };

    // Register a valid handler.
    importer.registerEventHandler('aaaa', 42, dummy_handler);

    // Try to parse an invalid event with missing fields.
    var incomplet_event = { guid: 'aaaa', 'op': 42, 'ver': 0 };
    assertFalse(importer.parseEvent(incomplet_event));
    assertFalse(handler_called);

    // Try to parse a valid event.
    var valid_event = {
      guid: 'aaaa', 'op': 42, 'ver': 0, 'cpu': 0, 'ts': 0, 'payload': btoa('0')
    };
    assertTrue(importer.parseEvent(valid_event));
    assertTrue(handler_called);
  });

  test('resetTooSmall', function() {
    var importer = new tracing.importer.EtwImporter('dummy', []);
    var decoder = importer.decoder_;

    var oldByteLength = decoder.payload_.byteLength;
    // Decode a payload too big for the actual buffer.
    decoder.reset('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
                  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
                  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
                  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
                  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
                  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
                  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==');
    var newByteLength = decoder.payload_.byteLength;

    // Validate the buffer has been resized.
    assertTrue(oldByteLength < newByteLength);
  });

  test('decode', function() {
    var model = 'dummy';
    var events = [];
    var importer = new tracing.importer.EtwImporter(model, events);

    var decoder = importer.decoder_;

    decoder.reset('YQBiYw==');
    assertTrue(decoder.decodeInt32() == 0x63620061);

    // Decode unsigned numbers.
    decoder.reset('AQ==');
    assertTrue(decoder.decodeUInt8() == 0x01);

    decoder.reset('AQI=');
    assertTrue(decoder.decodeUInt16() == 0x0201);

    decoder.reset('AQIDBA==');
    assertTrue(decoder.decodeUInt32() == 0x04030201);

    decoder.reset('AQIDBAUGBwg=');
    assertTrue(decoder.decodeUInt64ToString() === '0807060504030201');

    // Decode signed numbers.
    decoder.reset('AQ==');
    assertTrue(decoder.decodeInt8() == 0x01);

    decoder.reset('AQI=');
    assertTrue(decoder.decodeInt16() == 0x0201);

    decoder.reset('AQIDBA==');
    assertTrue(decoder.decodeInt32() == 0x04030201);

    decoder.reset('AQIDBAUGBwg=');
    assertTrue(decoder.decodeInt64ToString() === '0807060504030201');

    // Last value before being a signed number.
    decoder.reset('fw==');
    assertTrue(decoder.decodeInt8() == 127);

    // Decode negative numbers.
    decoder.reset('1g==');
    assertTrue(decoder.decodeInt8() == -42);

    decoder.reset('gA==');
    assertTrue(decoder.decodeInt8() == -128);

    decoder.reset('hYI=');
    assertTrue(decoder.decodeInt16() == -32123);

    decoder.reset('hYL//w==');
    assertTrue(decoder.decodeInt32() == -32123);

    decoder.reset('Lv1ptv////8=');
    assertTrue(decoder.decodeInt32() == -1234567890);

    // Decode number with zero (nul) in the middle of the string.
    decoder.reset('YQBiYw==');
    assertTrue(decoder.decodeInt32() == 0x63620061);
  });

  test('decodeUInteger', function() {
    var importer = new tracing.importer.EtwImporter('dummy', []);
    var decoder = importer.decoder_;

    decoder.reset('AQIDBAUGBwg=');
    assertTrue(decoder.decodeUInteger(false) == 0x04030201);

    decoder.reset('AQIDBAUGBwg=');
    assertTrue(decoder.decodeUInteger(true) === '0807060504030201');
  });

  test('decodeString', function() {
    var importer = new tracing.importer.EtwImporter('dummy', []);
    var decoder = importer.decoder_;

    decoder.reset('dGVzdAA=');
    assertTrue(decoder.decodeString() === 'test');

    decoder.reset('VGhpcyBpcyBhIHRlc3Qu');
    assertTrue(decoder.decodeString() === 'This is a test.');
  });

  test('decodeW16String', function() {
    var importer = new tracing.importer.EtwImporter('dummy', []);
    var decoder = importer.decoder_;
    decoder.reset('dABlAHMAdAAAAA==');
    assertTrue(decoder.decodeW16String() === 'test');
  });

  test('decodeFixedW16String', function() {
    var importer = new tracing.importer.EtwImporter('dummy', []);
    var decoder = importer.decoder_;
    decoder.reset('dABlAHMAdAAAAA==');
    assertTrue(decoder.decodeFixedW16String(32) === 'test');
    assertTrue(decoder.position_ == 64);

    decoder.reset('dABlAHMAdAAAAA==');
    assertTrue(decoder.decodeFixedW16String(1) === 't');
    assertTrue(decoder.position_ == 2);
  });

  test('decodeBytes', function() {
    var importer = new tracing.importer.EtwImporter('dummy', []);
    var decoder = importer.decoder_;
    decoder.reset('AAECAwQFBgc=');
    var bytes = decoder.decodeBytes(8);
    for (var i = 0; i < length; ++i)
      assertTrue(bytes[i] == i);
  });

  test('decodeSID', function() {
    var importer = new tracing.importer.EtwImporter('dummy', []);
    var decoder = importer.decoder_;

    // Decode a SID structure with 64-bit pointer.
    decoder.reset(
        'AQIDBAECAwQFBAMCAAAAAAEFAAAAAAAFFQAAAAECAwQFBgcICQoLDA0DAAA=');
    var sid = decoder.decodeSID(true);

    assertTrue(sid.pSid === '0403020104030201');
    assertTrue(sid.attributes == 0x02030405);
    assertTrue(sid.sid.length == 20);
  });

  test('decodeSystemTime', function() {
    var importer = new tracing.importer.EtwImporter('dummy', []);
    var decoder = importer.decoder_;

    // Decode a SystemTime structure.
    decoder.reset('AQACAAMABAAFAAYABwAIAA==');
    var time = decoder.decodeSystemTime();
    assertTrue(time.wYear == 1);
    assertTrue(time.wMonth == 2);
    assertTrue(time.wDayOfWeek == 3);
    assertTrue(time.wDay == 4);
    assertTrue(time.wHour == 5);
    assertTrue(time.wMinute == 6);
    assertTrue(time.wSecond == 7);
    assertTrue(time.wMilliseconds == 8);
  });

  test('decodeTimeZoneInformation', function() {
    var importer = new tracing.importer.EtwImporter('dummy', []);
    var decoder = importer.decoder_;

    // Decode a TimeZoneInformation structure.
    decoder.reset('AQIDBGEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
                  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAIAAwAEAAUABgAHAAgABA' +
                  'MCAWIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
                  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAIAAwAEAAUABgAHAAgACAgI' +
                  'CA==');
    var time = decoder.decodeTimeZoneInformation();

    assertTrue(time.bias == 0x04030201);
    assertTrue(time.standardBias == 0x01020304);
    assertTrue(time.daylightBias == 0x08080808);
    assertTrue(time.standardName === 'a');
    assertTrue(time.daylightName === 'b');
  });

  test('manageThreads', function() {
    var events = [];
    var model = 'dummy';
    var importer = new tracing.importer.EtwImporter(model, events);

    // After initialisation, no threads must exists.
    assertTrue(Object.getOwnPropertyNames(importer.tidsToPid_).length == 0);

    // Add some threads.
    var thread10 = importer.createThreadIfNeeded(1, 10);
    var thread11 = importer.createThreadIfNeeded(1, 11);
    var thread20 = importer.createThreadIfNeeded(2, 20);

    assertTrue(Object.getOwnPropertyNames(importer.tidsToPid_).length == 3);
    assertTrue(importer.tidsToPid_.hasOwnProperty(10));
    assertTrue(importer.tidsToPid_.hasOwnProperty(11));
    assertTrue(importer.tidsToPid_.hasOwnProperty(20));

    // Retrieve existing threads and processes.
    var pid10 = importer.getThreadFromWindowsTid(10);
    var pid11 = importer.getThreadFromWindowsTid(11);
    var pid20 = importer.getThreadFromWindowsTid(20);

    assertTrue(pid10, 1);
    assertTrue(pid11, 1);
    assertTrue(pid20, 2);
  });

});
