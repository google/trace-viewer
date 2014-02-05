// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';
base.require('base.unittest');
base.require('base.unittest.suite_loader');
base.require('base.unittest.test_runner');
base.require('base.unittest.html_test_results');

base.requireStylesheet('base.unittest.common');
base.requireTemplate('base.unittest.interactive_test_runner');

base.exportTo('base.unittest', function() {
  /**
   * @constructor
   */
  var InteractiveTestRunner = ui.define('x-base-interactive-test-runner');

  InteractiveTestRunner.prototype = {
    __proto__: HTMLUnknownElement.prototype,

    decorate: function() {
      this.allTests_ = undefined;

      this.suppressStateChange_ = false;

      this.testFilterString_ = '';
      this.testTypeToRun_ = base.unittest.TestTypes.UNITTEST;
      this.shortFormat_ = false;

      this.rerunPending_ = false;
      this.runner_ = undefined;
      this.results_ = undefined;

      this.onResultsStatsChanged_ = this.onResultsStatsChanged_.bind(this);
      this.onTestFailed_ = this.onTestFailed_.bind(this);
      this.onTestPassed_ = this.onTestPassed_.bind(this);


      this.appendChild(base.instantiateTemplate(
          '#x-base-interactive-test-runner-template'));

      this.querySelector(
          'input[name=test-type-to-run][value=unit]').checked = true;
      var testTypeToRunEls = base.asArray(this.querySelectorAll(
          'input[name=test-type-to-run]'));

      testTypeToRunEls.forEach(
          function(inputEl) {
            inputEl.addEventListener(
                'click', this.onTestTypeToRunClick_.bind(this));
          }, this);

      var shortFormatEl = this.querySelector('#short-format');
      shortFormatEl.checked = this.shortFormat_;
      shortFormatEl.addEventListener(
          'click', this.onShortFormatClick_.bind(this));
      this.updateShortFormResultsDisplay_();
    },

    set title(title) {
      this.querySelector('#title').textContent = title;
    },

    get allTests() {
      return this.allTests_;
    },

    set allTests(allTests) {
      this.allTests_ = allTests;
      this.scheduleRerun_();
    },

    get testLinks() {
      return this.testLinks_;
    },
    set testLinks(testLinks) {
      this.testLinks_ = testLinks;
      var linksEl = this.querySelector('#links');
      linksEl.textContent = '';
      this.testLinks_.forEach(function(l) {
        var link = document.createElement('a');
        link.href = l.linkPath;
        link.textContent = l.title;
        linksEl.appendChild(link);
      }, this);
    },

    get testFilterString() {
      return this.testFilterString_;
    },

    set testFilterString(testFilterString) {
      this.testFilterString_ = testFilterString;
      this.scheduleRerun_();
      if (!this.suppressStateChange_)
        base.dispatchSimpleEvent(this, 'statechange');
    },

    get shortFormat() {
      return this.shortFormat_;
    },

    set shortFormat(shortFormat) {
      this.shortFormat_ = shortFormat;
      this.querySelector('#short-format').checked = shortFormat;
      if (this.results_)
        this.results_.shortFormat = shortFormat;
      if (!this.suppressStateChange_)
        base.dispatchSimpleEvent(this, 'statechange');
    },

    onShortFormatClick_: function(e) {
      this.shortFormat_ = this.querySelector('#short-format').checked;
      this.updateShortFormResultsDisplay_();
      this.updateResultsGivenShortFormat_();
      if (!this.suppressStateChange_)
        base.dispatchSimpleEvent(this, 'statechange');
    },

    updateShortFormResultsDisplay_: function() {
      var display = this.shortFormat_ ? '' : 'none';
      this.querySelector('#shortform-results').style.display = display;
    },

    updateResultsGivenShortFormat_: function() {
      if (!this.results_)
        return;

      if (this.testFilterString_.length)
        this.results_.showHTMLOutput = true;
      else
        this.results_.showHTMLOutput = false;
      this.results_.showPendingAndPassedTests = this.shortFormat_;
    },

    get testTypeToRun() {
      return this.testTypeToRun_;
    },

    set testTypeToRun(testTypeToRun) {
      this.testTypeToRun_ = testTypeToRun;
      var sel;
      if (testTypeToRun == base.unittest.TestTypes.UNITTEST)
        sel = 'input[name=test-type-to-run][value=unit]';
      else
        sel = 'input[name=test-type-to-run][value=perf]';
      this.querySelector(sel).checked = true;
      this.scheduleRerun_();
      if (!this.suppressStateChange_)
        base.dispatchSimpleEvent(this, 'statechange');
    },

    onTestTypeToRunClick_: function(e) {
      if (e.target.value == 'unit')
        this.testTypeToRun_ = base.unittest.TestTypes.UNITTEST;
      else // e.value == 'perf'
        this.testTypeToRun_ = base.unittest.TestTypes.PERFTEST;
      this.scheduleRerun_();
      if (!this.suppressStateChange_)
        base.dispatchSimpleEvent(this, 'statechange');
    },

    onTestPassed_: function() {
      this.querySelector('#shortform-results').textContent += '.';
    },

    onTestFailed_: function() {
      this.querySelector('#shortform-results').textContent += 'F';
    },

    onResultsStatsChanged_: function() {
      var statsEl = this.querySelector('#stats');
      var stats = this.results_.getStats();
      var numTests = this.runner_.testCases.length;
      statsEl.innerHTML =
          '<span class="unittest-passed">' + numTests + '</span> tests, ' +
          '<span class="unittest-failed">' + stats.numTestsThatFailed +
          '</span> failures, ' +
          ' in ' + stats.totalRunTime.toFixed(2) + 'ms.';
    },

    scheduleRerun_: function() {
      if (this.rerunPending_)
        return;
      if (this.runner_) {
        this.rerunPending_ = true;
        this.runner_.beginToStopRunning();
        var doRerun = function() {
          this.rerunPending_ = false;
          this.scheduleRerun_();
        }.bind(this);
        this.runner_.runCompletedPromise.then(
            doRerun, doRerun);
        return;
      }
      this.beginRunning_();
    },

    beginRunning_: function() {
      var resultsContainer = this.querySelector('#results-container');
      if (this.results_) {
        this.results_.removeEventListener('testpassed',
                                          this.onTestPassed_);
        this.results_.removeEventListener('testfailed',
                                          this.onTestFailed_);
        this.results_.removeEventListener('statschange',
                                          this.onResultsStatsChanged_);
        delete this.results_.getHRefForTestCase;
        resultsContainer.removeChild(this.results_);
      }

      this.results_ = new base.unittest.HTMLTestResults();
      this.results_.getHRefForTestCase = this.getHRefForTestCase.bind(this);
      this.updateResultsGivenShortFormat_();

      this.results_.shortFormat = this.shortFormat_;
      this.results_.addEventListener('testpassed',
                                     this.onTestPassed_);
      this.results_.addEventListener('testfailed',
                                     this.onTestFailed_);
      this.results_.addEventListener('statschange',
                                     this.onResultsStatsChanged_);
      resultsContainer.appendChild(this.results_);

      var tests = this.allTests_.filter(function(test) {
        var i = test.fullyQualifiedName.indexOf(this.testFilterString_);
        if (i == -1)
          return false;
        if (test.testType != this.testTypeToRun_)
          return false;
        return true;
      }, this);

      this.runner_ = new base.unittest.TestRunner(this.results_, tests);
      this.runner_.beginRunning();

      this.runner_.runCompletedPromise.then(
          this.runCompleted_.bind(this),
          this.runCompleted_.bind(this));
    },

    setState: function(state) {
      this.suppressStateChange_ = true;
      if (state.testFilterString !== undefined)
        this.testFilterString = state.testFilterString;
      else
        this.testFilterString = [];

      if (state.shortFormat === undefined)
        this.shortFormat = false;
      else
        this.shortFormat = state.shortFormat;

      if (state.testTypeToRun === undefined)
        this.testTypeToRun = base.unittest.TestTypes.UNITTEST;
      else
        this.testTypeToRun = state.testTypeToRun;

      this.suppressStateChange_ = false;
      this.onShortFormatClick_();
      this.scheduleRerun_();
    },

    getState: function() {
      return {
        testFilterString: this.testFilterString_,
        shortFormat: this.shortFormat_,
        testTypeToRun: this.testTypeToRun_
      };
    },

    getHRefForTestCase: function(testCases) {
      return undefined;
    },

    runCompleted_: function() {
      this.runner_ = undefined;
      if (this.results_.getStats().numTestsThatFailed > 0) {
        this.querySelector('#shortform-results').textContent +=
            '[THERE WERE FAILURES]';
      } else {
        this.querySelector('#shortform-results').textContent += '[DONE]';
      }
    }
  };

  return {
    InteractiveTestRunner: InteractiveTestRunner
  };
});
