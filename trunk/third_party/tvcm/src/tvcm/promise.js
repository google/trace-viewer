// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.requireRawScript('Promise.js');

tvcm.exportTo('tvcm', function() {
  var Promise = window.Promise;
  return {
    Promise: Promise
  };
});
