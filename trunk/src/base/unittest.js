// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview A test harness loosely based on Python unittest, but that
 * installs global assert methods during the test for backward compatibility
 * with Closure tests.
 */
base.requireStylesheet('base.unittest');
base.require('base.settings');
base.exportTo('base', function() {

  var NOCATCH_MODE = false;

  // Uncomment the line below to make unit test failures throw exceptions.
  //NOCATCH_MODE = true;

  function TestCaseElement(testName, opt_href, opt_alwaysShowErrorLink) {
    var el = document.createElement('test-case');
    el.__proto__ = TestCaseElement.prototype;
    el.decorate(testName, opt_href, opt_alwaysShowErrorLink);
    return el;
  }

  TestCaseElement.prototype = {
    __proto__: HTMLElement.prototype,

    decorate: function(testName, opt_href, opt_alwaysShowErrorLink) {
      this.testName = testName;
      if (opt_href)
        this.href_ = opt_href;
      else
        this.href_ = '#' + testName;
      this.alwaysShowErrorLink = opt_alwaysShowErrorLink || false;

      var titleBlockEl = document.createElement('title');
      titleBlockEl.style.display = 'inline';
      this.appendChild(titleBlockEl);

      this.titleEl = document.createElement('span');
      this.titleEl.style.marginRight = '20px';
      this.titleEl.className = 'unittest-test-case-title';
      titleBlockEl.appendChild(this.titleEl);

      this.errorLink = document.createElement('a');
      this.errorLink.textContent = 'Run individually...';
      this.errorLink.href = this.href_;
      this.errorLink.style.display = 'none';
      titleBlockEl.appendChild(this.errorLink);

      this.status_ = undefined;
      this.status = 'READY';
      this.duration_ = undefined;
    },

    set duration(duration) {
      this.duration_ = duration;

      if (!this.statusSpan_)
        return;

      var spanClass = '';
      if (this.duration_ > 0.5)
        spanClass = 'class="unittest-red"';

      this.statusSpan_.innerHTML = this.status_ +
          ' <span' + spanClass + '>(' + this.duration_.toFixed(2) + 's)</span>';
    },

    get status() {
      return this.status_;
    },

    set status(status) {
      this.status_ = status;
      this.titleEl.textContent = '';

      var testNameSpan = this.ownerDocument.createElement('a');
      testNameSpan.className = 'unittest-test-case-title-test-name';
      testNameSpan.textContent = this.testName;
      testNameSpan.setAttribute('href', this.href_);
      updateClassListGivenStatus(testNameSpan, this.status_);
      this.titleEl.appendChild(testNameSpan);

      this.statusSpan_ = this.ownerDocument.createElement('span');
      this.statusSpan_.className = 'unittest-test-case-title-test-status';

      var status = this.status_;
      if (this.duration_) {
        var spanClass = '';
        if (this.duration_ > 0.5)
          spanClass = 'class="unittest-red"';
        status += ' <span ' + spanClass + '>(' + this.duration_.toFixed(2) +
            's)</span>';
      }

      this.statusSpan_.innerHTML = status;
      this.titleEl.appendChild(this.statusSpan_);

      updateClassListGivenStatus(this.titleEl, this.status_);
      if (this.status_ == 'FAILED' || this.alwaysShowErrorLink)
        this.errorLink.style.display = '';
      else
        this.errorLink.style.display = 'none';
    },

    addError: function(test, e) {
      var errorEl = createErrorDiv(test, e);
      this.appendChild(errorEl);
      return errorEl;
    },

    addHTMLOutput: function(opt_title, opt_element) {
      var outputEl = createOutputDiv(opt_title, opt_element);
      this.appendChild(outputEl);
      return outputEl.contents;
    }
  };

  function IFrameTestCase(test) {
    var testCaseEl = new TestCaseElement(test, test, true);
    testCaseEl.__proto__ = IFrameTestCase.prototype;
    testCaseEl.decorate(test);
    return testCaseEl;
  }

  IFrameTestCase.prototype = {
    __proto__: TestCaseElement.prototype,

    decorate: function(test) {
      this.status = 'READY';
      this.iframe = document.createElement('iframe');
      this.iframe.src = test;
      this.iframe.style.position = 'fixed';
      this.iframe.style.top = '-10000px';
      this.iframe.style.right = '-10000px';
      this.iframe.style.visibility = 'hidden';
    },

    begin: function() {
      this.status = 'RUNNING';
      this.appendChild(this.iframe);
    },

    get done() {
      if (this.status == 'READY' ||
          this.status == 'RUNNING')
        return false;
      return true;
    },

    get stats() {
      return this.stats_;
    },

    checkForDone: function() {
      var iframe = this.iframe;
      if (!iframe.contentWindow)
        return;

      if (!iframe.contentWindow.G_testRunner)
        return;

      var childRunner = iframe.contentWindow.G_testRunner;
      if (!childRunner.done)
        return;

      this.stats_ = childRunner.computeResultStats();
      if (this.stats_.numTestsRun && !this.stats_.numTestsWithErrors)
        this.status = 'PASSED';
      else
        this.status = 'FAILED';

      if (this.status === 'FAILED') {
        iframe.removeAttribute('style');
        iframe.style.position = 'relative';
        iframe.style.width = '100%';
        iframe.style.height =
            iframe.contentWindow.document.body.scrollHeight + 'px';
        iframe.style.visibility = 'visible';
      }
    }
  };

  function createErrorDiv(test, e) {
    var el = document.createElement('test-case-error');
    el.className = 'unittest-error';

    var stackEl = document.createElement('test-case-stack');
    if (typeof e == 'string') {
      stackEl.textContent = e;
    } else if (e.stack) {
      var i = document.location.pathname.lastIndexOf('/');
      var path = document.location.origin +
          document.location.pathname.substring(0, i);
      var pathEscaped = path.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      var cleanStack = e.stack.replace(new RegExp(pathEscaped, 'g'), '.');
      stackEl.textContent = cleanStack;
    } else {
      stackEl.textContent = e;
    }
    el.appendChild(stackEl);
    return el;
  }

  function createOutputDiv(opt_title, opt_element) {
    var el = document.createElement('test-case-output');
    if (opt_title) {
      var titleEl = document.createElement('div');
      titleEl.textContent = opt_title;
      el.appendChild(titleEl);
    }
    var contentEl = opt_element || document.createElement('div');
    el.appendChild(contentEl);

    el.__defineGetter__('contents', function() {
      return contentEl;
    });
    return el;
  }

  function statusToClassName(status) {
    if (status == 'PASSED')
      return 'unittest-green';
    else if (status == 'RUNNING' || status == 'READY')
      return 'unittest-yellow';
    else
      return 'unittest-red';
  }

  function updateClassListGivenStatus(el, status) {
    var newClass = statusToClassName(status);
    if (newClass != 'unittest-green')
      el.classList.remove('unittest-green');
    if (newClass != 'unittest-yellow')
      el.classList.remove('unittest-yellow');
    if (newClass != 'unittest-red')
      el.classList.remove('unittest-red');

    el.classList.add(newClass);
  }

  function HTMLTestRunner(opt_title, opt_curHash) {
    // This constructs a HTMLDivElement and then adds our own runner methods to
    // it. This is usually done via ui.js' define system, but we dont want our
    // test runner to be dependent on the UI lib. :)
    var outputEl = document.createElement('unittest-test-runner');
    outputEl.__proto__ = HTMLTestRunner.prototype;
    this.decorate.call(outputEl, opt_title, opt_curHash);
    return outputEl;
  }

  HTMLTestRunner.prototype = {
    __proto__: HTMLDivElement.prototype,

    decorate: function(opt_title, opt_curHash) {
      this.running = false;

      this.currentTest_ = undefined;
      this.results = undefined;
      if (opt_curHash) {
        var trimmedHash = opt_curHash.substring(1);
        this.filterFunc_ = function(testName) {
          return testName.indexOf(trimmedHash) == 0;
        };
      } else
        this.filterFunc_ = function(testName) { return true; };

      this.statusEl_ = document.createElement('title');
      this.appendChild(this.statusEl_);

      this.resultsEl_ = document.createElement('div');
      this.appendChild(this.resultsEl_);

      this.title_ = opt_title || document.title;

      this.updateStatus();
    },

    computeResultStats: function() {
      var numTestsRun = 0;
      var numTestsPassed = 0;
      var numTestsWithErrors = 0;
      if (this.results) {
        for (var i = 0; i < this.results.length; i++) {
          numTestsRun++;
          if (this.results[i].errors.length)
            numTestsWithErrors++;
          else
            numTestsPassed++;
        }
      }
      return {
        numTestsRun: numTestsRun,
        numTestsPassed: numTestsPassed,
        numTestsWithErrors: numTestsWithErrors
      };
    },

    updateStatus: function() {
      var stats = this.computeResultStats();
      var status;
      if (!this.results) {
        status = 'READY';
      } else if (this.running) {
        status = 'RUNNING';
      } else {
        if (stats.numTestsRun && stats.numTestsWithErrors == 0)
          status = 'PASSED';
        else
          status = 'FAILED';
      }
      updateClassListGivenStatus(this.statusEl_, status);

      var status = this.title_ + ' [' + status + ']';
      if (this.duration_)
        status += ' (' + this.duration_.toFixed(2) + 's)';
      this.statusEl_.textContent = status;
    },

    get done() {
      return this.results && this.running == false;
    },

    run: function(tests) {
      this.results = [];
      this.running = true;
      this.updateStatus();

      for (var i = 0; i < tests.length; i++) {
        if (!this.filterFunc_(tests[i].testName))
          continue;
        tests[i].run(this);
        this.updateStatus();
      }
      this.running = false;
      this.updateStatus();

      if (parent)
        parent.postMessage('complete ' + document.location.pathname, '*');
    },

    willRunTest: function(test) {
      this.currentTest_ = test;
      this.currentResults_ = {testName: test.testName,
        errors: []};
      this.results.push(this.currentResults_);

      this.currentTestCaseEl_ = new TestCaseElement(test.testName);
      this.currentTestCaseEl_.status = 'RUNNING';
      this.resultsEl_.appendChild(this.currentTestCaseEl_);
    },

    /**
     * Adds some html content to the currently running test
     * @param {String=} opt_title The title for the output.
     * @param {HTMLElement=} opt_element The element to add. If not added, then.
     * @return {HTMLElement} The element added, or if !opt_element, the element
     * created.
     */
    addHTMLOutput: function(opt_title, opt_element) {
      return this.currentTestCaseEl_.addHTMLOutput(opt_title, opt_element);
    },

    addError: function(e) {
      this.currentResults_.errors.push(e);
      return this.currentTestCaseEl_.addError(this.currentTest_, e);
    },

    didRunTest: function(test) {
      if (!this.currentResults_.errors.length)
        this.currentTestCaseEl_.status = 'PASSED';
      else
        this.currentTestCaseEl_.status = 'FAILED';

      this.currentResults_ = undefined;
      this.currentTest_ = undefined;
    }
  };

  function AsyncTestRunner() {
    var resultsEl = document.createElement('div');
    resultsEl.__proto__ = AsyncTestRunner.prototype;
    resultsEl.decorate();
    return resultsEl;
  }

  AsyncTestRunner.prototype = {
    __proto__: HTMLDivElement.prototype,

    decorate: function() {
      this.className = 'unittest';
      this.maxNumTestsToRunAtOnce_ = 2;
      this.tests_ = {};
      this.readyTests_ = [];
      this.runningTests_ = [];

      this.start_ = new Date().getTime() / 1000;
      this.stats_ = {
        numTestsRun: 0,
        numTestsPassed: 0,
        numWithErrors: 0
      };

      window.addEventListener('message', function(msg) {
        var test = this.tests_[msg.data.substr(9)];
        if (!test) {
          console.log("Can't find " + msg.data.substr(9));
          return;
        }

        test.duration =
            (new Date().getTime() / 1000) - test.startTime;
        for (var i = 0; i < this.runningTests_.length; ++i) {
          if (this.runningTests_[i] === test)
            break;
        }
        test.checkForDone();

        this.stats_.numTestsRun += test.stats.numTestsRun;
        this.stats_.numTestsPassed += test.stats.numTestsPassed;
        this.stats_.numWithErrors += test.stats.numTestsWithErrors;

        if (i < this.runningTests_.length)
          this.runningTests_.splice(i, 1);

        this.processTestQueues_();

        if (this.readyTests_.length === 0 && this.runningTests_.length === 0)
          this.onDone_();
      }.bind(this));
    },

    get maxNumTestsToRunAtOnce() {
      return this.maxNumTestsToRunAtOnce_;
    },

    set maxNumTestsToRunAtOnce(value) {
      this.maxNumTestsToRunAtOnce_ = value;
      processTestQueues_();
    },

    set statsBlock(value) {
      this.statsBlock_ = value;
    },

    enqueueTests: function(tests) {
      for (var i = 0; i < tests.length; i++) {
        var test = new IFrameTestCase(tests[i]);
        if (test.done)
          throw new Error('Cannot enqueue test that is done.');

        this.tests_[tests[i]] = test;
        this.readyTests_.push(test);
        this.appendChild(test);
      }
      if (this.readyTests_.length)
        this.processTestQueues_();
    },

    processTestQueues_: function() {
      while (this.readyTests_.length > 0 &&
             this.runningTests_.length < this.maxNumTestsToRunAtOnce_) {
        var test = this.readyTests_.shift();
        test.startTime = new Date().getTime() / 1000;
        test.begin();
        this.runningTests_.push(test);
      }
    },

    onDone_: function() {
      var end = new Date().getTime() / 1000;
      var stats = this.stats_;
      this.statsBlock_.innerHTML = 'Ran ' +
          '<span id="test_count">' + stats.numTestsRun + '</span> tests, ' +
          '<span id="pass_count">' + stats.numTestsPassed + '</span> passed ' +
          'and <span id="fail_count">' + stats.numWithErrors + '</span> ' +
          'failed in <span id="test_time">' +
          (end - this.start_).toFixed(2) +
          '</span> seconds.';
    }
  };

  function TestError(opt_message) {
    var that = new Error(opt_message);
    Error.captureStackTrace(that, TestError);
    that.__proto__ = TestError.prototype;
    return that;
  }

  TestError.prototype = {
    __proto__: Error.prototype
  };

  /*
   * @constructor TestCase
   */
  function TestCase(testMethod, opt_testMethodName) {
    if (!testMethod)
      throw new Error('testMethod must be provided');
    if (testMethod.name == '' && !opt_testMethodName)
      throw new Error('testMethod must have a name, ' +
                      'or opt_testMethodName must be provided.');

    this.testMethod_ = testMethod;
    this.testMethodName_ = opt_testMethodName || testMethod.name;
    this.results_ = undefined;
  };

  function forAllAssertAndEnsureMethodsIn_(prototype, fn) {
    for (var fieldName in prototype) {
      if (fieldName.indexOf('assert') != 0 &&
          fieldName.indexOf('ensure') != 0)
        continue;
      var fieldValue = prototype[fieldName];
      if (typeof fieldValue != 'function')
        continue;
      fn(fieldName, fieldValue);
    }
  }

  TestCase.prototype = {
    __proto__: Object.prototype,

    get testName() {
      return this.testMethodName_;
    },

    bindGlobals_: function() {
      forAllAssertAndEnsureMethodsIn_(TestCase.prototype,
          function(fieldName, fieldValue) {
            global[fieldName] = fieldValue.bind(this);
          });
    },

    unbindGlobals_: function() {
      forAllAssertAndEnsureMethodsIn_(TestCase.prototype,
          function(fieldName, fieldValue) {
            delete global[fieldName];
          });
    },

    /**
     * Adds some html content to the currently running test
     * @param {String=} opt_title The title for the output.
     * @param {HTMLElement=} opt_element The element to add. If not added, then.
     * @return {HTMLElement} The element added, or if !opt_element, the element
     * created.
     */
    addHTMLOutput: function(opt_title, opt_element) {
      return this.results_.addHTMLOutput(opt_title, opt_element);
    },

    assertTrue: function(a, opt_message) {
      if (a)
        return;
      var message = opt_message || 'Expected true, got ' + a;
      throw new TestError(message);
    },

    assertFalse: function(a, opt_message) {
      if (!a)
        return;
      var message = opt_message || 'Expected false, got ' + a;
      throw new TestError(message);
    },

    assertUndefined: function(a, opt_message) {
      if (a === undefined)
        return;
      var message = opt_message || 'Expected undefined, got ' + a;
      throw new TestError(message);
    },

    assertNotUndefined: function(a, opt_message) {
      if (a !== undefined)
        return;
      var message = opt_message || 'Expected not undefined, got ' + a;
      throw new TestError(message);
    },

    assertNull: function(a, opt_message) {
      if (a === null)
        return;
      var message = opt_message || 'Expected null, got ' + a;
      throw new TestError(message);
    },

    assertNotNull: function(a, opt_message) {
      if (a !== null)
        return;
      var message = opt_message || 'Expected non-null, got ' + a;
      throw new TestError(message);
    },

    assertEquals: function(a, b, opt_message) {
      if (a == b)
        return;
      var message = opt_message || 'Expected "' + a + '", got "' + b + '"';
      throw new TestError(message);
    },

    assertNotEquals: function(a, b, opt_message) {
      if (a != b)
        return;
      var message = opt_message || 'Expected something not equal to ' + b;
      throw new TestError(message);
    },

    assertArrayEquals: function(a, b, opt_message) {
      if (a.length == b.length) {
        var ok = true;
        for (var i = 0; i < a.length; i++) {
          ok &= a[i] === b[i];
        }
        if (ok)
          return;
      }

      var message = opt_message || 'Expected array ' + a + ', got array ' + b;
      throw new TestError(message);
    },

    assertArrayShallowEquals: function(a, b, opt_message) {
      if (a.length == b.length) {
        var ok = true;
        for (var i = 0; i < a.length; i++) {
          ok &= a[i] === b[i];
        }
        if (ok)
          return;
      }

      var message = opt_message || 'Expected array ' + b + ', got array ' + a;
      throw new TestError(message);
    },

    assertAlmostEquals: function(a, b, opt_message) {
      if (Math.abs(a - b) < 0.00001)
        return;
      var message = opt_message || 'Expected almost ' + a + ', got ' + b;
      throw new TestError(message);
    },

    assertVec2Equals: function(a, b, opt_message) {
      if (a[0] == b[0] &&
          a[1] == b[1])
        return;
      var message = opt_message || 'Expected (' + a[0] + ',' + a[1] +
          ') but got (' + b[0] + ',' + b[1] + ')';
      throw new TestError(message);
    },

    assertVec3Equals: function(a, b, opt_message) {
      if (a[0] == b[0] &&
          a[1] == b[1] &&
          a[2] == b[2])
        return;
      var message = opt_message || 'Expected ' + vec3.toString(a) +
          ' but got ' + vec3.toString(b);
      throw new TestError(message);
    },

    assertQuadEquals: function(a, b, opt_message) {
      var ok = true;
      ok &= a.p1[0] == b.p1[0] && a.p1[1] == b.p1[1];
      ok &= a.p2[0] == b.p2[0] && a.p2[1] == b.p2[1];
      ok &= a.p3[0] == b.p3[0] && a.p3[1] == b.p3[1];
      ok &= a.p4[0] == b.p4[0] && a.p4[1] == b.p4[1];
      if (ok)
        return;
      var message = opt_message || 'Expected "' + a.toString() +
          '", got "' + b.toString() + '"';
      throw new TestError(message);
    },

    assertRectEquals: function(a, b, opt_message) {
      var ok = true;
      if (a.x == b.x && a.y == b.y &&
          a.width == b.width && a.height == b.height) {
        return;
      }

      var message = opt_message || 'Expected "' + a.toString() +
          '", got "' + b.toString() + '"';
      throw new TestError(message);
    },

    assertObjectEquals: function(a, b, opt_message) {
      // TODO(nduca): This is an expedient implementation. We can of course do
      // better.
      var a_ = JSON.stringify(a);
      var b_ = JSON.stringify(b);
      if (a_ == b_)
        return;
      var message = opt_message || 'Expected ' + a_ + ', got ' + b_;
      throw new TestError(message);
    },

    assertThrows: function(fn, opt_message) {
      try {
        fn();
      } catch (e) {
        return;
      }
      var message = opt_message || 'Expected throw from ' + fn;
      throw new TestError(message);
    },

    assertApproxEquals: function(a, b, opt_epsilon, opt_message) {
      if (a == b)
        return;
      var epsilon = opt_epsilon || 0.000001; // 6 digits.
      a = Math.abs(a);
      b = Math.abs(b);
      var delta = Math.abs(a - b);
      var sum = a + b;
      var relative_error = delta / sum;
      if (relative_error < epsilon)
        return;
      var message = opt_message || 'Expect ' + a + ' and ' + b +
          ' to be within ' + epsilon + ' was ' + relative_error;
      throw new TestError(message);
    },

    setUp: function() {
      global.sessionStorage.clear();
      base.Settings.setAlternativeStorageInstance(global.sessionStorage);
    },

    run: function(results) {
      this.bindGlobals_();
      try {
        this.results_ = results;
        results.willRunTest(this);

        var start = new Date().getTime() / 1000;
        if (NOCATCH_MODE) {
          this.setUp();
          this.testMethod_();
          this.tearDown();
        } else {
          // Set up.
          try {
            this.setUp();
          } catch (e) {
            results.addError(e);
            return;
          }

          // Run.
          try {
            this.testMethod_();
          } catch (e) {
            results.addError(e);
          }

          // Tear down.
          try {
            this.tearDown();
          } catch (e) {
            if (typeof e == 'string')
              e = new TestError(e);
            results.addError(e);
          }
        }
      } finally {
        results.currentTestCaseEl_.duration =
            (new Date().getTime() / 1000) - start;

        this.unbindGlobals_();
        results.didRunTest(this);
        this.results_ = undefined;
      }
    },

    tearDown: function() {
    }

  };


  /**
   * Returns an array of TestCase objects correpsonding to the tests
   * found in the given object. This considers any functions beginning with test
   * as a potential test.
   *
   * @param {object=} opt_objectToEnumerate The object to enumerate, or global
   * if not specified.
   * @param {RegExp=} opt_filter Return only tests that match this regexp.
   */
  function discoverTests(opt_objectToEnumerate, opt_filter) {
    var objectToEnumerate = opt_objectToEnumerate || global;

    var tests = [];
    for (var testMethodName in objectToEnumerate) {
      if (testMethodName.search(/^test.+/) != 0)
        continue;

      if (opt_filter && testMethodName.search(opt_filter) == -1)
        continue;

      var testMethod = objectToEnumerate[testMethodName];
      if (typeof testMethod != 'function')
        continue;
      var testCase = new TestCase(testMethod, testMethodName);
      tests.push(testCase);
    }
    tests.sort(function(a, b) {
      return a.testName < b.testName;
    });
    return tests;
  }

  /**
   * Runs all unit tests.
   */
  function runAllTests(opt_objectToEnumerate) {
    var runner;
    function init() {
      if (runner)
        runner.parentElement.removeChild(runner);
      runner = new HTMLTestRunner(document.title, document.location.hash);
      // Stash the runner on global so that the global test runner
      // can get to it.
      global.G_testRunner = runner;
    }

    function append() {
      document.body.appendChild(runner);
    }

    function run() {
      var objectToEnumerate = opt_objectToEnumerate || global;
      var tests = discoverTests(objectToEnumerate);
      runner.run(tests);
    }

    global.addEventListener('hashchange', function() {
      init();
      append();
      run();
    });

    init();
    if (document.body)
      append();
    else
      document.addEventListener('DOMContentLoaded', append);
    global.addEventListener('load', run);
  }

  if (/_test.html$/.test(document.location.pathname))
    runAllTests();

  return {
    unittest: {
      AsyncTestRunner: AsyncTestRunner,
      TestError: TestError,
      TestCase: TestCase,

      discoverTests_: discoverTests,
      createErrorDiv_: createErrorDiv,
      HTMLTestRunner_: HTMLTestRunner,
      TestCaseElement_: TestCaseElement
    }
  };
});
