// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.guid');
tvcm.require('tvcm.unittest.constants');

tvcm.exportTo('tvcm.unittest', function() {
  var TestTypes = tvcm.unittest.TestTypes;

  function TestCase(suite, testType, name, test, options) {
    this.guid_ = tvcm.GUID.allocate();
    this.suite_ = suite;
    this.testType_ = testType;
    this.name_ = name;

    this.options_ = options;

    this.test_ = test;
  }

  TestCase.parseFullyQualifiedName = function(fqn) {
    var i = fqn.lastIndexOf('.');
    if (i == -1)
      throw new Error('FullyQualifiedNames must have a period in them');
    return {
      suiteName: fqn.substr(0, i),
      testCaseName: fqn.substr(i + 1)
    };
  };

  TestCase.prototype = {
    __proto__: Object.prototype,

    get guid() {
      return this.guid;
    },

    get suite() {
      return this.suite_;
    },

    get testType() {
      return this.testType_;
    },

    get name() {
      return this.name_;
    },

    get fullyQualifiedName() {
      return this.suite_.name + '.' + this.name_;
    },

    get options() {
      return this.options_;
    },

    run: function(htmlHook) {
      return this.test_();
    },

    // TODO(nduca): The routing of this is a bit awkward. Probably better
    // to install a global function.
    addHTMLOutput: function(element) {
      tvcm.unittest.addHTMLOutputForCurrentTest(element);
    }
  };

  function PerfTestCase(suite, name, test, options) {
    TestCase.call(this, suite, TestTypes.PERFTEST, name, test, options);
  }

  PerfTestCase.prototype = {
    __proto__: TestCase.prototype
  };

  return {
    TestCase: TestCase,
    PerfTestCase: PerfTestCase
  };
});
