// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tracing.test_utils');
tvcm.require('tracing.importer.etw_importer');
tvcm.require('tracing.importer.etw.thread_parser');

tvcm.unittest.testSuite('tracing.importer.etw.thread_parser_test', function() {

  // Constants for Thread events.
  var guid = '3D6FA8D1-FE05-11D0-9DDA-00C04FD7BA7C';
  var kThreadStartOpcode = 1;
  var kThreadEndOpcode = 2;
  var kThreadDCStartOpcode = 3;
  var kThreadCSwitchOpcode = 36;

  var kThreadStartPayload32bitV1 =
      'BAAAAEwHAAAAYLfzADC38wAAAAAAAAAAhdse9wAAAAD/AAAA';

  var kThreadEndPayload32bitV1 = 'BAAAALQAAAA=';


  var kThreadDCStartPayload64bitV2 =
      'AAAAAAAAAAAAYPUCAPj//wAA9QIA+P//AAAAAAAAAAAAAAAAAAAAAIAlxwEA+P//gCXHA' +
      'QD4//8AAAAAAAAAAAAAAAA=';

  var kThreadStartPayload32bitV3 =
      'LAIAACwTAAAAUJixACCYsQAA1QAAwNQAAwAAAOkDq3cA4P1/AAAAAAkFAgA=';

  var kThreadStartPayload64bitV3 =
      'eCEAAJQUAAAAMA4nAND//wDQDScA0P//MP0LBgAAAAAAgAsGAAAAAP8AAAAAAAAALP1YX' +
      'AAAAAAAwBL/AAAAAAAAAAAIBQIA';

  var kThreadCSwitchPayload32bitV2 = 'AAAAACwRAAAACQAAFwABABIAAAAmSAAA';
  var kThreadCSwitchPayload64bitV2 = 'zAgAAAAAAAAIAAEAAAACBAEAAACHbYg0';

  test('DecodeFields', function() {

    var importer = new tracing.importer.EtwImporter('dummy', []);
    var decoder = importer.decoder_;
    var parser = new tracing.importer.etw.ThreadParser(importer);
    var header;
    var fields;

    // Validate a version 1 32-bit payload.
    header = { guid: guid, opcode: kThreadStartOpcode, version: 1, is64: 0 };
    decoder.reset(kThreadStartPayload32bitV1);
    fields = parser.decodeFields(header, decoder);

    assertTrue(fields.processId == 4);
    assertTrue(fields.threadId == 1868);
    assertTrue(fields.stackBase == 4088881152);
    assertTrue(fields.stackLimit == 4088868864);
    assertTrue(fields.userStackBase == 0);
    assertTrue(fields.userStackLimit == 0);
    assertTrue(fields.startAddr == 4145994629);
    assertTrue(fields.win32StartAddr == 0);
    assertTrue(fields.waitMode == -1);

    // Validate an End version 1 32-bit payload.
    header = { guid: guid, opcode: kThreadEndOpcode, version: 1, is64: 0 };
    decoder.reset(kThreadStartPayload32bitV1);
    fields = parser.decodeFields(header, decoder);

    assertTrue(fields.processId == 4);
    assertTrue(fields.threadId == 1868);

    // Validate a version 2 64-bit payload.
    header = { guid: guid, opcode: kThreadDCStartOpcode, version: 2, is64: 1 };
    decoder.reset(kThreadDCStartPayload64bitV2);
    fields = parser.decodeFields(header, decoder);

    assertTrue(fields.processId == 0);
    assertTrue(fields.threadId == 0);
    assertTrue(fields.stackBase === 'fffff80002f56000');
    assertTrue(fields.stackLimit == 'fffff80002f50000');
    assertTrue(fields.userStackBase === '0000000000000000');
    assertTrue(fields.userStackLimit === '0000000000000000');
    assertTrue(fields.startAddr === 'fffff80001c72580');
    assertTrue(fields.win32StartAddr === 'fffff80001c72580');
    assertTrue(fields.tebBase === '0000000000000000');
    assertTrue(fields.subProcessTag == 0);

    // Validate a version 3 32-bit payload.
    header = { guid: guid, opcode: kThreadStartOpcode, version: 3, is64: 0 };
    decoder.reset(kThreadStartPayload32bitV3);
    fields = parser.decodeFields(header, decoder);

    assertTrue(fields.processId == 556);
    assertTrue(fields.threadId == 4908);
    assertTrue(fields.stackBase == 2979549184);
    assertTrue(fields.stackLimit == 2979536896);
    assertTrue(fields.userStackBase == 13959168);
    assertTrue(fields.userStackLimit == 13942784);
    assertTrue(fields.affinity == 3);
    assertTrue(fields.win32StartAddr == 2007696361);
    assertTrue(fields.tebBase == 2147344384);
    assertTrue(fields.subProcessTag == 0);
    assertTrue(fields.basePriority == 9);
    assertTrue(fields.pagePriority == 5);
    assertTrue(fields.ioPriority == 2);
    assertTrue(fields.threadFlags == 0);

    // Validate a version 3 64-bit payload.
    header = { guid: guid, opcode: kThreadStartOpcode, version: 3, is64: 1 };
    decoder.reset(kThreadStartPayload64bitV3);
    fields = parser.decodeFields(header, decoder);

    assertTrue(fields.processId == 8568);
    assertTrue(fields.threadId == 5268);
    assertTrue(fields.stackBase === 'ffffd000270e3000');
    assertTrue(fields.stackLimit === 'ffffd000270dd000');
    assertTrue(fields.userStackBase === '00000000060bfd30');
    assertTrue(fields.userStackLimit === '00000000060b8000');
    assertTrue(fields.affinity === '00000000000000ff');
    assertTrue(fields.win32StartAddr === '000000005c58fd2c');
    assertTrue(fields.tebBase === '00000000ff12c000');
    assertTrue(fields.subProcessTag == 0);
    assertTrue(fields.basePriority == 8);
    assertTrue(fields.pagePriority == 5);
    assertTrue(fields.ioPriority == 2);
    assertTrue(fields.threadFlags == 0);
  });

  test('DecodeCSwitchFields', function() {
    var importer = new tracing.importer.EtwImporter('dummy', []);
    var decoder = importer.decoder_;
    var parser = new tracing.importer.etw.ThreadParser(importer);
    var header;
    var fields;


    // Validate a version 2 CSwitch 32-bit payload.
    header = { guid: guid, opcode: kThreadCSwitchOpcode, version: 2, is64: 0 };
    decoder.reset(kThreadCSwitchPayload32bitV2);
    fields = parser.decodeCSwitchFields(header, decoder);

    assertTrue(fields.newThreadId == 0);
    assertTrue(fields.oldThreadId == 4396);
    assertTrue(fields.newThreadPriority == 0);
    assertTrue(fields.oldThreadPriority == 9);
    assertTrue(fields.previousCState == 0);
    assertTrue(fields.spareByte == 0);
    assertTrue(fields.oldThreadWaitReason == 23);
    assertTrue(fields.oldThreadWaitMode == 0);
    assertTrue(fields.oldThreadState == 1);
    assertTrue(fields.oldThreadWaitIdealProcessor == 0);
    assertTrue(fields.newThreadWaitTime == 18);
    assertTrue(fields.reserved == 18470);

    // Validate a version 2 CSwitch 64-bit payload.
    header = { guid: guid, opcode: kThreadCSwitchOpcode, version: 2, is64: 1 };
    decoder.reset(kThreadCSwitchPayload64bitV2);
    fields = parser.decodeCSwitchFields(header, decoder);

    assertTrue(fields.newThreadId == 2252);
    assertTrue(fields.oldThreadId == 0);
    assertTrue(fields.newThreadPriority == 8);
    assertTrue(fields.oldThreadPriority == 0);
    assertTrue(fields.previousCState == 1);
    assertTrue(fields.spareByte == 0);
    assertTrue(fields.oldThreadWaitReason == 0);
    assertTrue(fields.oldThreadWaitMode == 0);
    assertTrue(fields.oldThreadState == 2);
    assertTrue(fields.oldThreadWaitIdealProcessor == 4);
    assertTrue(fields.newThreadWaitTime == 1);
    assertTrue(fields.reserved == 881356167);

  });
});
