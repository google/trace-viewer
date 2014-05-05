// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.exportTo('tracing.importer', function() {
  /**
   * @constructor
   */
  function SimpleLineReader(text) {
    this.lines_ = text.split('\n');
    this.curLine_ = 0;

    this.savedLines_ = undefined;
  }

  SimpleLineReader.prototype = {
    advanceToLineMatching: function(regex) {
      for (; this.curLine_ < this.lines_.length; this.curLine_++) {
        var line = this.lines_[this.curLine_];
        if (this.savedLines_ !== undefined)
          this.savedLines_.push(line);
        if (regex.test(line))
          return true;
      }
      return false;
    },

    get curLineNumber() {
      return this.curLine_;
    },

    beginSavingLines: function() {
      this.savedLines_ = [];
    },

    endSavingLinesAndGetResult: function() {
      var tmp = this.savedLines_;
      this.savedLines_ = undefined;
      return tmp;
    }
  };

  return {
    SimpleLineReader: SimpleLineReader
  };
});
