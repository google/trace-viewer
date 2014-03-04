// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Imports JSON file with the raw payloads from a Windows event
 * trace into the Tracemodel. This format is outputted by Chrome running
 * on a Windows system.
 *
 * This importer assumes the events arrived as a JSON file and the payloads are
 * undecoded sequence of bytes in hex format string. The unit tests provide
 * examples of the trace format.
 *
 * The format of the system trace is
 *     {
 *       name: 'ETW',
 *       content: [ <events> ]
 *     }
  *
 * where the <events> are dictionary values with fields.
 *
 *     {
 *       guid: "1234-...",    // The unique GUID for the event.
 *       op: 12,              // The opcode of the event.
 *       ver: 1,              // The encoding version of the event.
 *       cpu: 0,              // The cpu id on which the event was captured.
 *       ts: 1092,            // The thread id on which the event was captured.
 *       payload: "aaaa"      // A base64 encoded string of the raw payload.
 *     }
 *
 * The payload is an undecoded version of the raw event sent by ETW.
 * This importer uses specific parsers to decode recognized events.
 * A parser need to register the recognized event by calling
 * registerEventHandler(guid, opcode, handler). The parser is responsible to
 * decode the payload and update the TraceModel.
 *
 * The payload formats are described there:
 *   http://msdn.microsoft.com/en-us/library/windows/desktop/aa364085(v=vs.85).aspx
 *
 */
'use strict';

tvcm.require('tvcm.base64');
tvcm.require('tracing.trace_model');
tvcm.require('tracing.importer.importer');
tvcm.require('tracing.importer.etw.process_parser');
tvcm.require('tracing.importer.etw.thread_parser');

tvcm.exportTo('tracing.importer', function() {

  var Importer = tracing.importer.Importer;

  /**
   * Represents the raw bytes payload decoder.
   * @constructor
   */
  function Decoder() {
    this.payload_ = new DataView(new ArrayBuffer(256));
  };

  Decoder.prototype = {
    __proto__: Object.prototype,

    reset: function(base64_payload) {
      var decoded_size = tvcm.Base64.getDecodedBufferLength(base64_payload);
      if (decoded_size > this.payload_.byteLength)
        this.payload_ = new DataView(new ArrayBuffer(decoded_size));

      tvcm.Base64.DecodeToTypedArray(base64_payload, this.payload_);
      this.position_ = 0;
    },

    skip: function(length) {
      this.position_ += length;
    },

    decodeUInt8: function() {
      var result = this.payload_.getUint8(this.position_, true);
      this.position_ += 1;
      return result;
    },

    decodeUInt16: function() {
      var result = this.payload_.getUint16(this.position_, true);
      this.position_ += 2;
      return result;
    },

    decodeUInt32: function() {
      var result = this.payload_.getUint32(this.position_, true);
      this.position_ += 4;
      return result;
    },

    decodeUInt64ToString: function() {
      // Javascript isn't able to manage 64-bit numeric values.
      var low = this.decodeUInt32();
      var high = this.decodeUInt32();
      var low_str = ('0000000' + low.toString(16)).substr(-8);
      var high_str = ('0000000' + high.toString(16)).substr(-8);
      var result = high_str + low_str;
      return result;
    },

    decodeInt8: function() {
      var result = this.payload_.getInt8(this.position_, true);
      this.position_ += 1;
      return result;
    },

    decodeInt16: function() {
      var result = this.payload_.getInt16(this.position_, true);
      this.position_ += 2;
      return result;
    },

    decodeInt32: function() {
      var result = this.payload_.getInt32(this.position_, true);
      this.position_ += 4;
      return result;
    },

    decodeInt64ToString: function() {
      // Javascript isn't able to manage 64-bit numeric values.
      // Fallback to unsigned 64-bit hexa value.
      return this.decodeUInt64ToString();
    },

    decodeUInteger: function(is64) {
      if (is64)
        return this.decodeUInt64ToString();
      return this.decodeUInt32();
    },

    decodeString: function() {
      var str = '';
      while (true) {
        var c = this.decodeUInt8();
        if (!c)
          return str;
        str = str + String.fromCharCode(c);
      }
    },

    decodeW16String: function() {
      var str = '';
      while (true) {
        var c = this.decodeUInt16();
        if (!c)
          return str;
        str = str + String.fromCharCode(c);
      }
    },

    decodeFixedW16String: function(length) {
      var old_position = this.position_;
      var str = '';
      for (var i = 0; i < length; i++) {
        var c = this.decodeUInt16();
        if (!c)
          break;
        str = str + String.fromCharCode(c);
      }

      // Move the position after the fixed buffer (i.e. wchar[length]).
      this.position_ = old_position + 2 * length;
      return str;
    },

    decodeBytes: function(length) {
      var bytes = [];
      for (var i = 0; i < length; ++i) {
        var c = this.decodeUInt8();
        bytes.push(c);
      }
      return bytes;
    },

    decodeSID: function(is64) {
      // Decode the TOKEN_USER structure.
      var pSid = this.decodeUInteger(is64);
      var attributes = this.decodeUInt32();

      // Skip padding.
      if (is64)
        this.decodeUInt32();

      // Decode the SID structure.
      var revision = this.decodeUInt8();
      var subAuthorityCount = this.decodeUInt8();
      this.decodeUInt16();
      this.decodeUInt32();

      if (revision != 1)
        throw 'Invalid SID revision: could not decode the SID structure.';

      var sid = this.decodeBytes(4 * subAuthorityCount);

      return {
        pSid: pSid,
        attributes: attributes,
        sid: sid
      };
    },

    decodeSystemTime: function() {
      // Decode the SystemTime structure.
      var wYear = this.decodeInt16();
      var wMonth = this.decodeInt16();
      var wDayOfWeek = this.decodeInt16();
      var wDay = this.decodeInt16();
      var wHour = this.decodeInt16();
      var wMinute = this.decodeInt16();
      var wSecond = this.decodeInt16();
      var wMilliseconds = this.decodeInt16();
      return {
        wYear: wYear,
        wMonth: wMonth,
        wDayOfWeek: wDayOfWeek,
        wDay: wDay,
        wHour: wHour,
        wMinute: wMinute,
        wSecond: wSecond,
        wMilliseconds: wMilliseconds
      };
    },

    decodeTimeZoneInformation: function() {
      // Decode the TimeZoneInformation structure.
      var bias = this.decodeUInt32();
      var standardName = this.decodeFixedW16String(32);
      var standardDate = this.decodeSystemTime();
      var standardBias = this.decodeUInt32();
      var daylightName = this.decodeFixedW16String(32);
      var daylightDate = this.decodeSystemTime();
      var daylightBias = this.decodeUInt32();
      return {
        bias: bias,
        standardName: standardName,
        standardDate: standardDate,
        standardBias: standardBias,
        daylightName: daylightName,
        daylightDate: daylightDate,
        daylightBias: daylightBias
      };
    }

  };

  /**
   * Imports Windows ETW kernel events into a specified model.
   * @constructor
   */
  function EtwImporter(model, events) {
    this.importPriority = 3;
    this.model_ = model;
    this.events_ = events;
    this.handlers_ = {};
    this.decoder_ = new Decoder();
    this.parsers_ = [];

    // A map of tids to their process pid. On Windows, the tid is global to
    // the system and doesn't need to belong to a process. As many events
    // only provide tid, this map allows to retrieve the parent process.
    this.tidsToPid_ = {};

    // Instantiate the parsers; this will register handlers for known events.
    var constructors = tracing.importer.etw.Parser.getSubtypeConstructors();
    for (var i = 0; i < constructors.length; ++i) {
      var parser = constructors[i];
      this.parsers_.push(new parser(this));
    }
  }

  /**
   * Guesses whether the provided events is from a Windows ETW trace.
   * The object must has a property named 'name' with the value 'ETW' and
   * a property 'content' with all the undecoded events.
   *
   * @return {boolean} True when events is a Windows ETW array.
   */
  EtwImporter.canImport = function(events) {
    if (!events.hasOwnProperty('name') ||
        !events.hasOwnProperty('content') ||
        events.name !== 'ETW') {
      return false;
    }

    return true;
  };

  EtwImporter.prototype = {
    __proto__: Importer.prototype,

    get model() {
      return this.model_;
    },

    createThreadIfNeeded: function(pid, tid) {
      this.tidsToPid_[tid] = pid;
    },

    getThreadFromWindowsTid: function(tid) {
      var pid = this.tidsToPid_[tid];
      if (pid == undefined)
        throw new Error('Process ID cannot be found.');
      return pid;
    },

    /**
     * Imports the data in this.events_ into this.model_.
     */
    importEvents: function(isSecondaryImport) {
      this.events_.content.forEach(this.parseEvent.bind(this));
    },

    parseEvent: function(event) {
      if (!event.hasOwnProperty('guid') ||
          !event.hasOwnProperty('op') ||
          !event.hasOwnProperty('ver') ||
          !event.hasOwnProperty('cpu') ||
          !event.hasOwnProperty('ts') ||
          !event.hasOwnProperty('payload')) {
        return false;
      }

      // Timestamp is 100-nanosecond intervals since midnight, January 1, 1601.
      // TODO(etienneb): substract the origin.
      var timestamp = (event.ts) / 10000.;
      var header = {
        guid: event.guid,
        opcode: event.op,
        version: event.ver,
        cpu: event.cpu,
        timestamp: timestamp,
        is64: event.ver
      };

      // Set the payload to decode.
      var decoder = this.decoder_;
      decoder.reset(event.payload);

      // Retrieve the handler to decode the payload.
      var handler = this.getEventHandler(header.guid, header.opcode);
      if (!handler)
        return false;

      if (!handler(header, decoder)) {
        this.model_.importWarning({
          type: 'parse_error',
          message: 'Malformed ' + header.guid + ' event (' + text + ')'
        });
        return false;
      }

      return true;
    },

    /**
     * Registers a windows ETW event handler used by parseEvent().
     */
    registerEventHandler: function(guid, opcode, handler) {
      if (this.handlers_[guid] == undefined)
        this.handlers_[guid] = [];
      this.handlers_[guid][opcode] = handler;
    },

    /**
     * Retrieves a registered event handler.
     */
    getEventHandler: function(guid, opcode) {
      if (this.handlers_[guid] == undefined)
        return undefined;
      return this.handlers_[guid][opcode];
    }

  };

  // Register the EtwImporter to the Importer.
  tracing.TraceModel.registerImporter(EtwImporter);

  return {
    EtwImporter: EtwImporter
  };

});
