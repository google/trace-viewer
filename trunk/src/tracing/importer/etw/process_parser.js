// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Parses processes events in the Windows event trace format.
 */
tvcm.require('tracing.importer.etw.parser');

tvcm.exportTo('tracing.importer.etw', function() {

  var Parser = tracing.importer.etw.Parser;

  // Constants for Process events.
  var guid = '3D6FA8D0-FE05-11D0-9DDA-00C04FD7BA7C';
  var kProcessStartOpcode = 1;
  var kProcessEndOpcode = 2;
  var kProcessDCStartOpcode = 3;
  var kProcessDCEndOpcode = 4;
  var kProcessDefunctOpcode = 39;

  /**
   * Parses Windows process trace events.
   * @constructor
   */
  function ProcessParser(importer) {
    Parser.call(this, importer);

    // Register handlers.
    importer.registerEventHandler(guid, kProcessStartOpcode,
        ProcessParser.prototype.decodeStart.bind(this));
    importer.registerEventHandler(guid, kProcessEndOpcode,
        ProcessParser.prototype.decodeEnd.bind(this));
    importer.registerEventHandler(guid, kProcessDCStartOpcode,
        ProcessParser.prototype.decodeDCStart.bind(this));
    importer.registerEventHandler(guid, kProcessDCEndOpcode,
        ProcessParser.prototype.decodeDCEnd.bind(this));
    importer.registerEventHandler(guid, kProcessDefunctOpcode,
        ProcessParser.prototype.decodeDefunct.bind(this));
  }

  ProcessParser.prototype = {
    __proto__: Parser.prototype,

    decodeFields: function(header, decoder) {
      if (header.version > 5)
        throw new Error('Incompatible Process event version.');

      var pageDirectoryBase;
      if (header.version == 1)
        pageDirectoryBase = decoder.decodeUInteger(header.is64);

      var uniqueProcessKey;
      if (header.version >= 2)
        uniqueProcessKey = decoder.decodeUInteger(header.is64);

      var processId = decoder.decodeUInt32();
      var parentId = decoder.decodeUInt32();

      var sessionId;
      var exitStatus;
      if (header.version >= 1) {
        sessionId = decoder.decodeUInt32();
        exitStatus = decoder.decodeInt32();
      }

      var directoryTableBase;
      if (header.version >= 3)
        directoryTableBase = decoder.decodeUInteger(header.is64);

      var flags;
      if (header.version >= 4)
        flags = decoder.decodeUInt32();

      var userSID = decoder.decodeSID(header.is64);

      var imageFileName;
      if (header.version >= 1)
        imageFileName = decoder.decodeString();

      var commandLine;
      if (header.version >= 2)
        commandLine = decoder.decodeW16String();

      var packageFullName;
      var applicationId;
      if (header.version >= 4) {
        packageFullName = decoder.decodeW16String();
        applicationId = decoder.decodeW16String();
      }

      var exitTime;
      if (header.version == 5 && header.opcode == kProcessDefunctOpcode)
        exitTime = decoder.decodeUInt64ToString();

      return {
        pageDirectoryBase: pageDirectoryBase,
        uniqueProcessKey: uniqueProcessKey,
        processId: processId,
        parentId: parentId,
        sessionId: sessionId,
        exitStatus: exitStatus,
        directoryTableBase: directoryTableBase,
        flags: flags,
        userSID: userSID,
        imageFileName: imageFileName,
        commandLine: commandLine,
        packageFullName: packageFullName,
        applicationId: applicationId,
        exitTime: exitTime
      };
    },

    decodeStart: function(header, decoder) {
      var fields = this.decodeFields(header, decoder);
      // TODO(etienneb): Update the TraceModel with |fields|.
      return true;
    },

    decodeEnd: function(header, decoder) {
      var fields = this.decodeFields(header, decoder);
      // TODO(etienneb): Update the TraceModel with |fields|.
      return true;
    },

    decodeDCStart: function(header, decoder) {
      var fields = this.decodeFields(header, decoder);
      // TODO(etienneb): Update the TraceModel with |fields|.
      return true;
    },

    decodeDCEnd: function(header, decoder) {
      var fields = this.decodeFields(header, decoder);
      // TODO(etienneb): Update the TraceModel with |fields|.
      return true;
    },

    decodeDefunct: function(header, decoder) {
      var fields = this.decodeFields(header, decoder);
      // TODO(etienneb): Update the TraceModel with |fields|.
      return true;
    }

  };

  Parser.registerSubtype(ProcessParser);

  return {
    ProcessParser: ProcessParser
  };
});
