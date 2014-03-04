// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tracing.test_utils');
tvcm.require('tracing.importer.etw_importer');
tvcm.require('tracing.importer.etw.process_parser');

tvcm.unittest.testSuite('tracing.importer.etw.process_parser_test', function() { // @suppress longLineCheck

  // Constants for Process events.
  var guid = '3D6FA8D0-FE05-11D0-9DDA-00C04FD7BA7C';
  var kProcessStartOpcode = 1;
  var kProcessDefunctOpcode = 39;

  var kProcessStartPayload32bitV1 =
      'AAAAAPAGAADcAwAAAQAAAAMBAAAAAAAAAAAAAAEFAAAAAAAFFQAAAJYs7Cxo/TEG8dyk0' +
      '+gDAABub3RlcGFkLmV4ZQA=';

  var kProcessStartPayload32bitV2 =
      'AAAAAPAGAADcAwAAAQAAAAMBAAAAAAAAAAAAAAEFAAAAAAAFFQAAAJYs7Cxo/TEG8dyk0' +
      '+gDAABub3RlcGFkLmV4ZQAiAEMAOgBcAFcAaQBuAGQAbwB3AHMAXABzAHkAcwB0AGUAbQ' +
      'AzADIAXABuAG8AdABlAHAAYQBkAC4AZQB4AGUAIgAgAAAA';

  var kProcessStartPayload32bitV3 =
      'AAAAAPAGAADcAwAAAQAAAAMBAAAAAAAAAAAAAAAAAAABBQAAAAAABRUAAACWLOwsaP0xB' +
      'vHcpNPoAwAAbm90ZXBhZC5leGUAIgBDADoAXABXAGkAbgBkAG8AdwBzAFwAcwB5AHMAdA' +
      'BlAG0AMwAyAFwAbgBvAHQAZQBwAGEAZAAuAGUAeABlACIAIAAAAA==';

  var kProcessStartPayload64bitV3 =
      'YIBiD4D6//8AGgAAoBwAAAEAAAADAQAAAPBDHQEAAAAwVlMVoPj//wAAAACg+P//AQUAA' +
      'AAAAAUVAAAAAgMBAgMEBQYHCAkKCwwAAHhwZXJmLmV4ZQB4AHAAZQByAGYAIAAgAC0AZA' +
      'AgAG8AdQB0AC4AZQB0AGwAAAA=';

  var kProcessStartPayload64bitV4 =
      'gED8GgDg//+MCgAACBcAAAUAAAADAQAAALCiowAAAAAAAAAAkPBXBADA//8AAAAAAAAAA' +
      'AEFAAAAAAAFFQAAAAECAwQFBgcICQoLBukDAAB4cGVyZi5leGUAeABwAGUAcgBmACAAIA' +
      'AtAHMAdABvAHAAAAAAAAAA';

  var kProcessDefunctPayload64bitV5 =
      'wMXyBgDg//9IGQAAEAgAAAEAAAAAAAAAAGDLTwAAAAAAAAAA8OU7AwDA//8AAAAAAAAMA' +
      'AEFAAAAAAAFFQAAAMDBwsPExcbH0NHS09QDAABjaHJvbWUuZXhlAAAAAAAAAI1Jovns+s' +
      '4B';

  test('DecodeFields', function() {

    var importer = new tracing.importer.EtwImporter('dummy', []);
    var decoder = importer.decoder_;
    var parser = new tracing.importer.etw.ProcessParser(importer);
    var header;
    var fields;

    // Validate a version 1 32-bit payload.
    header = { guid: guid, opcode: kProcessStartOpcode, version: 1, is64: 0 };
    decoder.reset(kProcessStartPayload32bitV1);
    fields = parser.decodeFields(header, decoder);

    assertTrue(fields.pageDirectoryBase == 0);
    assertTrue(fields.processId == 1776);
    assertTrue(fields.parentId == 988);
    assertTrue(fields.sessionId == 1);
    assertTrue(fields.exitStatus == 259);
    assertTrue(fields.imageFileName === 'notepad.exe');

    // Validate a version 2 32-bit payload.
    header = { guid: guid, opcode: kProcessStartOpcode, version: 2, is64: 0 };
    decoder.reset(kProcessStartPayload32bitV2);
    fields = parser.decodeFields(header, decoder);

    assertTrue(fields.uniqueProcessKey == 0);
    assertTrue(fields.processId == 1776);
    assertTrue(fields.parentId == 988);
    assertTrue(fields.sessionId == 1);
    assertTrue(fields.exitStatus == 259);
    assertTrue(fields.imageFileName === 'notepad.exe');
    assertTrue(fields.commandLine ===
               '\"C:\\Windows\\system32\\notepad.exe\" ');

    // Validate a version 3 32-bit payload.
    header = { guid: guid, opcode: kProcessStartOpcode, version: 3, is64: 0 };
    decoder.reset(kProcessStartPayload32bitV3);
    fields = parser.decodeFields(header, decoder);

    assertTrue(fields.uniqueProcessKey == 0);
    assertTrue(fields.processId == 1776);
    assertTrue(fields.parentId == 988);
    assertTrue(fields.sessionId == 1);
    assertTrue(fields.exitStatus == 259);
    assertTrue(fields.directoryTableBase == 0);
    assertTrue(fields.imageFileName === 'notepad.exe');
    assertTrue(fields.commandLine ===
               '\"C:\\Windows\\system32\\notepad.exe\" ');

    // Validate a version 3 64-bit payload.
    header = { guid: guid, opcode: kProcessStartOpcode, version: 3, is64: 1 };
    decoder.reset(kProcessStartPayload64bitV3);
    fields = parser.decodeFields(header, decoder);

    assertTrue(fields.uniqueProcessKey === 'fffffa800f628060');
    assertTrue(fields.processId == 6656);
    assertTrue(fields.parentId == 7328);
    assertTrue(fields.sessionId == 1);
    assertTrue(fields.exitStatus == 259);
    assertTrue(fields.directoryTableBase === '000000011d43f000');
    assertTrue(fields.imageFileName === 'xperf.exe');
    assertTrue(fields.commandLine === 'xperf  -d out.etl');

    // Validate a version 4 64-bit payload.
    header = { guid: guid, opcode: kProcessStartOpcode, version: 4, is64: 1 };
    decoder.reset(kProcessStartPayload64bitV4);
    fields = parser.decodeFields(header, decoder);

    assertTrue(fields.uniqueProcessKey == 'ffffe0001afc4080');
    assertTrue(fields.processId == 2700);
    assertTrue(fields.parentId == 5896);
    assertTrue(fields.sessionId == 5);
    assertTrue(fields.exitStatus == 259);
    assertTrue(fields.directoryTableBase == '00000000a3a2b000');
    assertTrue(fields.flags == 0);
    assertTrue(fields.imageFileName === 'xperf.exe');
    assertTrue(fields.commandLine === 'xperf  -stop');
    assertTrue(fields.packageFullName === '');
    assertTrue(fields.applicationId === '');

    // Validate a version 5 64-bit payload.
    header = { guid: guid, opcode: kProcessDefunctOpcode, version: 5, is64: 1 };
    decoder.reset(kProcessDefunctPayload64bitV5);
    fields = parser.decodeFields(header, decoder);

    assertTrue(fields.uniqueProcessKey === 'ffffe00006f2c5c0');
    assertTrue(fields.processId == 6472);
    assertTrue(fields.parentId == 2064);
    assertTrue(fields.sessionId == 1);
    assertTrue(fields.exitStatus == 0);
    assertTrue(fields.directoryTableBase === '000000004fcb6000');
    assertTrue(fields.flags == 0);
    assertTrue(fields.imageFileName === 'chrome.exe');
    assertTrue(fields.commandLine === '');
    assertTrue(fields.packageFullName === '');
    assertTrue(fields.applicationId === '');
    assertTrue(fields.exitTime === '01cefaecf9a2498d');
  });
});
