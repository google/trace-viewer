// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.require('base.utils');

base.exportTo('base', function() {
  // Setting this to true will cause stack traces to get dumped into the
  // tasks. When an exception happens the original stack will be printed.
  //
  // NOTE: This should never be set committed as true.
  var recordRAFStacks = false;

  var pendingPreAFs = [];
  var pendingRAFs = [];
  var pendingIdleCallbacks = [];
  var currentRAFDispatchList = undefined;

  var rafScheduled = false;

  function scheduleRAF() {
    if (rafScheduled)
      return;
    rafScheduled = true;
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(processRequests);
    } else {
      var delta = Date.now() - window.performance.now();
      window.webkitRequestAnimationFrame(function(domTimeStamp) {
        processRequests(domTimeStamp - delta);
      });
    }
  }

  function onAnimationFrameError(e, opt_stack) {
    if (opt_stack)
      console.log(opt_stack);

    if (e.message)
      console.error(e.message, e.stack);
    else
      console.error(e);
  }

  function runTask(task, frameBeginTime) {
    try {
      task.callback.call(task.context, frameBeginTime);
    } catch (e) {
      base.onAnimationFrameError(e, task.stack);
    }
  }

  function processRequests(frameBeginTime) {
    // We assume that we want to do a maximum of 10ms optional work per frame.
    // Hopefully rAF will eventually pass this in for us.
    var rafCompletionDeadline = frameBeginTime + 10;

    rafScheduled = false;

    var currentPreAFs = pendingPreAFs;
    currentRAFDispatchList = pendingRAFs;
    pendingPreAFs = [];
    pendingRAFs = [];
    var hasRAFTasks = currentPreAFs.length || currentRAFDispatchList.length;

    for (var i = 0; i < currentPreAFs.length; i++)
      runTask(currentPreAFs[i], frameBeginTime);

    while (currentRAFDispatchList.length > 0)
      runTask(currentRAFDispatchList.shift(), frameBeginTime);
    currentRAFDispatchList = undefined;

    if (!hasRAFTasks) {
      while (pendingIdleCallbacks.length > 0) {
        runTask(pendingIdleCallbacks.shift());
        // Check timer after running at least one idle task to avoid buggy
        // window.performance.now() on some platforms from blocking the idle
        // task queue.
        if (window.performance.now() >= rafCompletionDeadline)
          break;
      }
    }

    if (pendingIdleCallbacks.length > 0)
      scheduleRAF();
  }

  function getStack_() {
    if (!recordRAFStacks)
      return '';

    var stackLines = base.stackTrace();
    // Strip off getStack_.
    stackLines.shift();
    return stackLines.join('\n');
  }

  function requestPreAnimationFrame(callback, opt_this) {
    pendingPreAFs.push({
      callback: callback,
      context: opt_this || window,
      stack: getStack_()});
    scheduleRAF();
  }

  function requestAnimationFrameInThisFrameIfPossible(callback, opt_this) {
    if (!currentRAFDispatchList) {
      requestAnimationFrame(callback, opt_this);
      return;
    }
    currentRAFDispatchList.push({
      callback: callback,
      context: opt_this || window,
      stack: getStack_()});
    return;
  }

  function requestAnimationFrame(callback, opt_this) {
    pendingRAFs.push({
      callback: callback,
      context: opt_this || window,
      stack: getStack_()});
    scheduleRAF();
  }

  function requestIdleCallback(callback, opt_this) {
    pendingIdleCallbacks.push({
      callback: callback,
      context: opt_this || window,
      stack: getStack_()});
    scheduleRAF();
  }

  function forcePendingRAFTasksToRun(frameBeginTime) {
    if (!rafScheduled)
      return;
    processRequests(frameBeginTime);
  }

  return {
    onAnimationFrameError: onAnimationFrameError,
    requestPreAnimationFrame: requestPreAnimationFrame,
    requestAnimationFrame: requestAnimationFrame,
    requestAnimationFrameInThisFrameIfPossible:
        requestAnimationFrameInThisFrameIfPossible,
    requestIdleCallback: requestIdleCallback,
    forcePendingRAFTasksToRun: forcePendingRAFTasksToRun
  };
});
