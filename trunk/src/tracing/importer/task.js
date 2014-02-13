// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.raf');
tvcm.require('tvcm.promise');

tvcm.exportTo('tracing.importer', function() {
  /**
   * A task is a combination of a run callback, a set of subtasks, and an after
   * task.
   *
   * When executed, a task does the following things:
   * 1. Runs its callback
   * 2. Runs its subtasks
   * 3. Runs its after callback.
   *
   * The list of subtasks and after task can be mutated inside step #1 but as
   * soon as the task's callback returns, the subtask list and after task is
   * fixed and cannot be changed again.
   *
   * Use task.after().after().after() to describe the toplevel passes that make
   * up your computation. Then, use subTasks to add detail to each subtask as it
   * runs. For example:
   *    var pieces = [];
   *    taskA = new Task(function() { pieces = getPieces(); });
   *    taskA.after(function(taskA) {
   *      pieces.forEach(function(piece) {
   *        taskA.subTask(function(taskB) { piece.process(); }, this);
   *      });
   *    });
   *
   * @constructor
   */
  function Task(runCb, thisArg) {
    if (thisArg === undefined)
      throw new Error('Almost certainly, you meant to pass a thisArg.');
    this.runCb_ = runCb;
    this.thisArg_ = thisArg;
    this.afterTask_ = undefined;
    this.subTasks_ = [];
  }

  Task.prototype = {
    /*
     * See constructor documentation on semantics of subtasks.
     */
    subTask: function(cb, thisArg) {
      if (cb instanceof Task)
        this.subTasks_.push(cb);
      else
        this.subTasks_.push(new Task(cb, thisArg));
      return this.subTasks_[this.subTasks_.length - 1];
    },

    /**
     * Runs the current task and returns the task that should be executed next.
     */
    run: function() {
      this.runCb_.call(this.thisArg_, this);
      var subTasks = this.subTasks_;
      this.subTasks_ = undefined; // Prevent more subTasks from being posted.

      if (!subTasks.length)
        return this.afterTask_;

      // If there are subtasks, then we want to execute all the subtasks and
      // then this task's afterTask. To make this happen, we update the
      // afterTask of all the subtasks so the point upward to each other, e.g.
      // subTask[0].afterTask to subTask[1] and so on. Then, the last subTask's
      // afterTask points at this task's afterTask.
      for (var i = 1; i < subTasks.length; i++)
        subTasks[i - 1].afterTask_ = subTasks[i];
      subTasks[subTasks.length - 1].afterTask_ = this.afterTask_;
      return subTasks[0];
    },

    /*
     * See constructor documentation on semantics of after tasks.
     */
    after: function(cb, thisArg) {
      if (this.afterTask_)
        throw new Error('Has an after task already');
      if (cb instanceof Task)
        this.afterTask_ = cb;
      else
        this.afterTask_ = new Task(cb, thisArg);
      return this.afterTask_;
    }
  };

  Task.RunSynchronously = function(task) {
    var curTask = task;
    while (curTask)
      curTask = curTask.run();
  }

  /**
   * Runs a task using raf.requestIdleCallback, returning
   * a promise for its completion.
   */
  Task.RunWhenIdle = function(task) {
    return new tvcm.Promise(function(resolver) {
      var curTask = task;
      function runAnother() {
        try {
          curTask = curTask.run();
        } catch (e) {
          resolver.reject(e);
          console.log(e);
          return;
        }

        if (curTask) {
          tvcm.requestIdleCallback(runAnother);
          return;
        }

        resolver.resolve();
      }
      tvcm.requestIdleCallback(runAnother);
    });
  }

  return {
    Task: Task
  };
});
