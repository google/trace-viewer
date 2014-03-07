// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.events');
tvcm.require('tvcm.utils');
tvcm.require('tvcm.unittest.constants');
tvcm.require('tvcm.ui');

tvcm.requireTemplate('tvcm.unittest.html_test_results');
tvcm.requireStylesheet('tvcm.unittest.common');

tvcm.exportTo('tvcm.unittest', function() {
  var TestStatus = tvcm.unittest.TestStatus;
  var TestTypes = tvcm.unittest.TestTypes;

  /**
   * @constructor
   */
  var HTMLTestCaseResult = tvcm.ui.define('x-html-test-case-result');

  HTMLTestCaseResult.prototype = {
    __proto__: HTMLUnknownElement.prototype,

    decorate: function() {
      this.appendChild(tvcm.instantiateTemplate(
          '#x-html-test-case-result-template'));
      this.testCase_ = undefined;
      this.testCaseHRef_ = undefined;
      this.duration_ = undefined;
      this.testStatus_ = TestStatus.PENDING;
      this.testReturnValue_ = undefined;
      this.showHTMLOutput_ = false;
      this.updateColorAndStatus_();
    },

    get showHTMLOutput() {
      return this.showHTMLOutput_;
    },

    set showHTMLOutput(showHTMLOutput) {
      this.showHTMLOutput_ = showHTMLOutput;
      this.updateHTMLOutputDisplayState_();
    },

    get testCase() {
      return this.testCase_;
    },

    set testCase(testCase) {
      this.testCase_ = testCase;
      this.updateTitle_();
    },

    get testCaseHRef() {
      return this.testCaseHRef_;
    },

    set testCaseHRef(href) {
      this.testCaseHRef_ = href;
      this.updateTitle_();
    },
    updateTitle_: function() {
      var titleEl = this.querySelector('#title');
      if (this.testCase_ === undefined) {
        titleEl.textContent = '';
        return;
      }

      if (this.testCaseHRef_) {
        titleEl.innerHTML = '<a href="' + this.testCaseHRef_ + '">' +
            this.testCase_.fullyQualifiedName + '</a>';
      } else {
        titleEl.textContent = this.testCase_.fullyQualifiedName;
      }
    },

    addError: function(normalizedException) {
      var errorEl = document.createElement('x-html-test-case-error');
      errorEl.appendChild(tvcm.instantiateTemplate(
          '#x-html-test-case-error-template'));
      errorEl.querySelector('#stack').textContent = normalizedException.stack;
      this.querySelector('#details').appendChild(errorEl);
      this.updateColorAndStatus_();
    },

    addHTMLOutput: function(element) {
      var htmlResultEl = document.createElement('x-html-test-case-html-result');
      htmlResultEl.appendChild(element);
      this.querySelector('#details').appendChild(htmlResultEl);
    },

    updateHTMLOutputDisplayState_: function() {
      var htmlResults = this.querySelectorAll('x-html-test-case-html-result');
      var display;
      if (this.showHTMLOutput)
        display = '';
      else
        display = (this.testStatus_ == TestStatus.RUNNING) ? '' : 'none';
      for (var i = 0; i < htmlResults.length; i++)
        htmlResults[i].style.display = display;
    },

    get hadErrors() {
      return !!this.querySelector('x-html-test-case-error');
    },

    get duration() {
      return this.duration_;
    },

    set duration(duration) {
      this.duration_ = duration;
      this.updateColorAndStatus_();
    },

    get testStatus() {
      return this.testStatus_;
    },

    set testStatus(testStatus) {
      this.testStatus_ = testStatus;
      this.updateColorAndStatus_();
      this.updateHTMLOutputDisplayState_();
    },

    updateColorAndStatus_: function() {
      var colorCls;
      var status;
      if (this.hadErrors) {
        colorCls = 'unittest-failed';
        status = 'failed';
      } else if (this.testStatus_ == TestStatus.PENDING) {
        colorCls = 'unittest-pending';
        status = 'pending';
      } else if (this.testStatus_ == TestStatus.RUNNING) {
        colorCls = 'unittest-running';
        status = 'running';
      } else { // DONE_RUNNING and no errors
        colorCls = 'unittest-passed';
        status = 'passed';
      }

      var statusEl = this.querySelector('#status');
      if (this.duration_)
        statusEl.textContent = status + ' (' +
            this.duration_.toFixed(2) + 'ms)';
      else
        statusEl.textContent = status;
      statusEl.className = colorCls;
    },

    get testReturnValue() {
      return this.testReturnValue_;
    },

    set testReturnValue(testReturnValue) {
      this.testReturnValue_ = testReturnValue;
      this.querySelector('#return-value').textContent = testReturnValue;
    }
  };




  /**
   * @constructor
   */
  var HTMLTestResults = tvcm.ui.define('x-tvcm.unittest-test-results');

  HTMLTestResults.prototype = {
    __proto__: HTMLUnknownElement.prototype,

    decorate: function() {
      this.currentTestCaseStartTime_ = undefined;
      this.totalRunTime_ = 0;
      this.numTestsThatPassed_ = 0;
      this.numTestsThatFailed_ = 0;
      this.showHTMLOutput_ = false;
      this.showPendingAndPassedTests_ = false;
      this.linkifyCallback_ = undefined;
    },

    getHRefForTestCase: function(testCase) {
      /* Override this to create custom links */
      return undefined;
    },

    get showHTMLOutput() {
      return this.showHTMLOutput_;
    },

    set showHTMLOutput(showHTMLOutput) {
      this.showHTMLOutput_ = showHTMLOutput;
      var testCaseResults = this.querySelectorAll('x-html-test-case-result');
      for (var i = 0; i < testCaseResults.length; i++)
        testCaseResults[i].showHTMLOutput = showHTMLOutput;
    },

    get showPendingAndPassedTests() {
      return this.showPendingAndPassedTests_;
    },

    set showPendingAndPassedTests(showPendingAndPassedTests) {
      this.showPendingAndPassedTests_ = showPendingAndPassedTests;

      var testCaseResults = this.querySelectorAll('x-html-test-case-result');
      for (var i = 0; i < testCaseResults.length; i++)
        this.updateDisplayStateForResult_(testCaseResults[i]);
    },

    updateDisplayStateForResult_: function(res) {
      var display;
      if (this.showPendingAndPassedTests_) {
        if (res.testStatus == TestStatus.RUNNING ||
            res.hadErrors) {
          display = '';
        } else {
          display = 'none';
        }
      } else {
        display = '';
      }
      res.style.display = display;

      // This bit of mess gives res objects a dark class based on whether their
      // last visible sibling was not dark. It relies on the
      // updateDisplayStateForResult_ being called on all previous siblings of
      // an element before being called on the element itself. Yay induction.
      var dark;
      if (!res.previousSibling) {
        dark = true;
      } else {
        var lastVisible;
        for (var cur = res.previousSibling;
             cur;
             cur = cur.previousSibling) {
          if (cur.style.display == '') {
            lastVisible = cur;
            break;
          }
        }
        if (lastVisible) {
          dark = !lastVisible.classList.contains('dark');
        } else {
          dark = true;
        }
      }

      if (dark)
        res.classList.add('dark');
      else
        res.classList.remove('dark');
    },

    willRunTest: function(testCase) {
      this.currentTestCaseResult_ = new HTMLTestCaseResult();
      this.currentTestCaseResult_.showHTMLOutput = this.showHTMLOutput_;
      this.currentTestCaseResult_.testCase = testCase;
      var href = this.getHRefForTestCase(testCase);
      if (href)
        this.currentTestCaseResult_.testCaseHRef = href;
      this.currentTestCaseResult_.testStatus = TestStatus.RUNNING;
      this.currentTestCaseStartTime_ = window.performance.now();
      this.appendChild(this.currentTestCaseResult_);
      this.updateDisplayStateForResult_(this.currentTestCaseResult_);
      this.log_(testCase.fullyQualifiedName + ': ');
    },

    addErrorForCurrentTest: function(error) {
      this.log_('\n');

      var normalizedException = tvcm.normalizeException(error);
      this.log_('Exception: ' + normalizedException.message + '\n' +
          normalizedException.stack);

      this.currentTestCaseResult_.addError(normalizedException);
      this.updateDisplayStateForResult_(this.currentTestCaseResult_);
    },

    addHTMLOutputForCurrentTest: function(element) {
      this.currentTestCaseResult_.addHTMLOutput(element);
      this.updateDisplayStateForResult_(this.currentTestCaseResult_);
    },

    setReturnValueFromCurrentTest: function(returnValue) {
      this.currentTestCaseResult_.testReturnValue = returnValue;
    },

    didCurrentTestEnd: function() {
      var testCaseResult = this.currentTestCaseResult_;
      var testCaseDuration = window.performance.now() -
          this.currentTestCaseStartTime_;
      this.currentTestCaseResult_.testStatus = TestStatus.DONE_RUNNING;
      testCaseResult.duration = testCaseDuration;
      this.totalRunTime_ += testCaseDuration;
      if (testCaseResult.hadErrors) {
        this.log_('[FAILED]\n');
        this.numTestsThatFailed_ += 1;
        tvcm.dispatchSimpleEvent(this, 'testfailed');
      } else {
        this.log_('[PASSED]\n');
        this.numTestsThatPassed_ += 1;
        tvcm.dispatchSimpleEvent(this, 'testpassed');
      }

      this.updateDisplayStateForResult_(this.currentTestCaseResult_);
      this.currentTestCaseResult_ = undefined;
    },

    didRunTests: function() {
      this.log_('[DONE]\n');
    },

    getStats: function() {
      return {
        numTestsThatPassed: this.numTestsThatPassed_,
        numTestsThatFailed: this.numTestsThatFailed_,
        totalRunTime: this.totalRunTime_
      };
    },

    log_: function(msg) {
      //this.textContent += msg;
      tvcm.dispatchSimpleEvent(this, 'statschange');
    }
  };

  return {
    HTMLTestResults: HTMLTestResults
  };
});
