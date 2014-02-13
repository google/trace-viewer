// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.utils');
tvcm.require('tvcm.unittest.constants');
tvcm.require('tvcm.ui');

tvcm.exportTo('tvcm.unittest', function() {
  /**
   * @constructor
   */
  function TextTestResults() {
    this.bufferParts_ = [];
    this.numTestsThatPassed_ = 0;
    this.numTestsThatFailed_ = 0;
    this.currentTestCaseHadErrors_ = false;
    this.curHTMLOutput_ = [];
  }

  TextTestResults.prototype = {
    get buffer() {
      return this.bufferParts_.join('');
    },

    get numTestsThatFailed() {
      return this.numTestsThatFailed_;
    },

    get numTestsThatPassed() {
      return this.numTestsThatPassed_;
    },

    willRunTest: function(testCase) {
      this.currentTestCaseHadErrors_ = false;
    },

    addErrorForCurrentTest: function(error) {
      var normalizedException = tvcm.normalizeException(error);
      this.writeToBuffer('Exception: ' + normalizedException.message + '\n' +
          normalizedException.stack + '\n');
      this.currentTestCaseHadErrors_ = true;
    },

    addHTMLOutputForCurrentTest: function(element) {
      this.curHTMLOutput_.push(element);
      document.body.appendChild(element);
    },

    setReturnValueFromCurrentTest: function(returnValue) {
      this.writeToBuffer('[RESULT] ' + JSON.stringify(returnValue) + '\n');
    },

    didCurrentTestEnd: function() {
      for (var i = 0; i < this.curHTMLOutput_.length; i++)
        document.body.removeChild(this.curHTMLOutput_[i]);
      this.curHTMLOutput_ = [];

      if (this.currentTestCaseHadErrors_)
        this.numTestsThatFailed_ += 1;
      else
        this.numTestsThatPassed_ += 1;
    },

    didRunTests: function() {
    },

    writeToBuffer: function(msg) {
      this.bufferParts_.push(msg);
    }
  };

  return {
    TextTestResults: TextTestResults
  };
});
