// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Log Reader is used to process log file produced by V8.
 */
base.exportTo('tracing.importer.v8', function() {
  /**
   * Creates a CSV lines parser.
   */
  function CsvParser() {
  };


  /**
   * A regex for matching a CSV field.
   * @private
   */
  CsvParser.CSV_FIELD_RE_ = /^"((?:[^"]|"")*)"|([^,]*)/;


  /**
   * A regex for matching a double quote.
   * @private
   */
  CsvParser.DOUBLE_QUOTE_RE_ = /""/g;


  /**
   * Parses a line of CSV-encoded values. Returns an array of fields.
   *
   * @param {string} line Input line.
   */
  CsvParser.prototype.parseLine = function(line) {
    var fieldRe = CsvParser.CSV_FIELD_RE_;
    var doubleQuoteRe = CsvParser.DOUBLE_QUOTE_RE_;
    var pos = 0;
    var endPos = line.length;
    var fields = [];
    if (endPos > 0) {
      do {
        var fieldMatch = fieldRe.exec(line.substr(pos));
        if (typeof fieldMatch[1] === 'string') {
          var field = fieldMatch[1];
          pos += field.length + 3;  // Skip comma and quotes.
          fields.push(field.replace(doubleQuoteRe, '"'));
        } else {
          // The second field pattern will match anything, thus
          // in the worst case the match will be an empty string.
          var field = fieldMatch[2];
          pos += field.length + 1;  // Skip comma.
          fields.push(field);
        }
      } while (pos <= endPos);
    }
    return fields;
  };

  /**
   * Base class for processing log files.
   *
   * @param {Array.<Object>} dispatchTable A table used for parsing and
   * processing log records.
   *
   * @constructor
   */
  function LogReader(dispatchTable) {
    /**
     * @type {Array.<Object>}
     */
    this.dispatchTable_ = dispatchTable;

    /**
     * Current line.
     * @type {number}
     */
    this.lineNum_ = 0;

    /**
     * CSV lines parser.
     * @type {CsvParser}
     */
    this.csvParser_ = new CsvParser();
  };


  /**
   * Used for printing error messages.
   *
   * @param {string} str Error message.
   */
  LogReader.prototype.printError = function(str) {
    // Do nothing.
  };


  /**
   * Processes a portion of V8 profiler event log.
   *
   * @param {string} chunk A portion of log.
   */
  LogReader.prototype.processLogChunk = function(chunk) {
    this.processLog_(chunk.split('\n'));
  };


  /**
   * Processes a line of V8 profiler event log.
   *
   * @param {string} line A line of log.
   */
  LogReader.prototype.processLogLine = function(line) {
    this.processLog_([line]);
  };


  /**
   * Processes stack record.
   *
   * @param {number} pc Program counter.
   * @param {number} func JS Function.
   * @param {Array.<string>} stack String representation of a stack.
   * @return {Array.<number>} Processed stack.
   */
  LogReader.prototype.processStack = function(pc, func, stack) {
    var fullStack = func ? [pc, func] : [pc];
    var prevFrame = pc;
    for (var i = 0, n = stack.length; i < n; ++i) {
      var frame = stack[i];
      var firstChar = frame.charAt(0);
      if (firstChar == '+' || firstChar == '-') {
        // An offset from the previous frame.
        prevFrame += parseInt(frame, 16);
        fullStack.push(prevFrame);
      // Filter out possible 'overflow' string.
      } else if (firstChar != 'o') {
        fullStack.push(parseInt(frame, 16));
      }
    }
    return fullStack;
  };


  /**
   * Returns whether a particular dispatch must be skipped.
   *
   * @param {!Object} dispatch Dispatch record.
   * @return {boolean} True if dispatch must be skipped.
   */
  LogReader.prototype.skipDispatch = function(dispatch) {
    return false;
  };


  /**
   * Does a dispatch of a log record.
   *
   * @param {Array.<string>} fields Log record.
   * @private
   */
  LogReader.prototype.dispatchLogRow_ = function(fields) {
    // Obtain the dispatch.
    var command = fields[0];
    if (!(command in this.dispatchTable_)) return;

    var dispatch = this.dispatchTable_[command];

    if (dispatch === null || this.skipDispatch(dispatch)) {
      return;
    }

    // Parse fields.
    var parsedFields = [];
    for (var i = 0; i < dispatch.parsers.length; ++i) {
      var parser = dispatch.parsers[i];
      if (parser === null) {
        parsedFields.push(fields[1 + i]);
      } else if (typeof parser == 'function') {
        parsedFields.push(parser(fields[1 + i]));
      } else {
        // var-args
        parsedFields.push(fields.slice(1 + i));
        break;
      }
    }

    // Run the processor.
    dispatch.processor.apply(this, parsedFields);
  };


  /**
   * Processes log lines.
   *
   * @param {Array.<string>} lines Log lines.
   * @private
   */
  LogReader.prototype.processLog_ = function(lines) {
    for (var i = 0, n = lines.length; i < n; ++i, ++this.lineNum_) {
      var line = lines[i];
      if (!line) {
        continue;
      }
      try {
        var fields = this.csvParser_.parseLine(line);
        this.dispatchLogRow_(fields);
      } catch (e) {
        this.printError('line ' + (this.lineNum_ + 1) + ': ' +
                        (e.message || e));
      }
    }
  };
  return {
    LogReader: LogReader
  };
});
