// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.exportTo('tvcm.unittest', function() {
  var TestStatus = {
    PENDING: 'pending-status',
    RUNNING: 'running-status',
    DONE_RUNNING: 'done-running-status'
  };

  var TestTypes = {
    UNITTEST: 'unittest-type',
    PERFTEST: 'perftest-type'
  };

  return {
    TestStatus: TestStatus,
    TestTypes: TestTypes
  };
});
