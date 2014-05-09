// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Provides the Process class.
 */
tvcm.require('tracing.trace_model.cpu');
tvcm.require('tracing.trace_model.process_base');
tvcm.require('tvcm.iteration_helpers');

tvcm.exportTo('tracing.trace_model', function() {

  var Cpu = tracing.trace_model.Cpu;
  var ProcessBase = tracing.trace_model.ProcessBase;

  /**
   * The Kernel represents kernel-level objects in the
   * model.
   * @constructor
   */
  function Kernel(model) {
    if (model === undefined)
      throw new Error('model must be provided');
    ProcessBase.call(this, model);
    this.cpus = {};
    this.softwareMeasuredCpuCount_ = undefined;
  };

  /**
   * Comparison between kernels is pretty meaningless.
   */
  Kernel.compare = function(x, y) {
    return 0;
  };

  Kernel.prototype = {
    __proto__: ProcessBase.prototype,

    compareTo: function(that) {
      return Kernel.compare(this, that);
    },

    get userFriendlyName() {
      return 'Kernel';
    },

    get userFriendlyDetails() {
      return 'Kernel';
    },

    /**
     * @return {Cpu} Gets a specific Cpu or creates one if
     * it does not exist.
     */
    getOrCreateCpu: function(cpuNumber) {
      if (!this.cpus[cpuNumber])
        this.cpus[cpuNumber] = new Cpu(this, cpuNumber);
      return this.cpus[cpuNumber];
    },

    get softwareMeasuredCpuCount() {
      return this.softwareMeasuredCpuCount_;
    },

    set softwareMeasuredCpuCount(softwareMeasuredCpuCount) {
      if (this.softwareMeasuredCpuCount_ !== undefined &&
          this.softwareMeasuredCpuCount_ !== softwareMeasuredCpuCount) {
        throw new Error(
            'Cannot change the softwareMeasuredCpuCount once it is set');
      }

      this.softwareMeasuredCpuCount_ = softwareMeasuredCpuCount;
    },

    /**
     * Estimates how many cpus are in the system, for use in system load
     * estimation.
     *
     * If kernel trace was provided, uses that data. Otherwise, uses the
     * software measured cpu count.
     */
    get bestGuessAtCpuCount() {
      var realCpuCount = tvcm.dictionaryLength(this.cpus);
      if (realCpuCount !== 0)
        return realCpuCount;
      return this.softwareMeasuredCpuCount;
    },

    shiftTimestampsForward: function(amount) {
      ProcessBase.prototype.shiftTimestampsForward.call(this);
      for (var cpuNumber in this.cpus)
        this.cpus[cpuNumber].shiftTimestampsForward(amount);
    },

    updateBounds: function() {
      ProcessBase.prototype.updateBounds.call(this);
      for (var cpuNumber in this.cpus) {
        var cpu = this.cpus[cpuNumber];
        cpu.updateBounds();
        this.bounds.addRange(cpu.bounds);
      }
    },

    createSubSlices: function() {
      ProcessBase.prototype.createSubSlices.call(this);
      for (var cpuNumber in this.cpus) {
        var cpu = this.cpus[cpuNumber];
        cpu.createSubSlices();
      }
    },

    addCategoriesToDict: function(categoriesDict) {
      ProcessBase.prototype.addCategoriesToDict.call(this, categoriesDict);
      for (var cpuNumber in this.cpus)
        this.cpus[cpuNumber].addCategoriesToDict(categoriesDict);
    },

    getSettingsKey: function() {
      return 'kernel';
    },

    iterateAllEvents: function(callback, opt_this) {
      for (var cpuNumber in this.cpus)
        this.cpus[cpuNumber].iterateAllEvents(callback, opt_this);

      ProcessBase.prototype.iterateAllEvents.call(this, callback, opt_this);
    }
  };

  return {
    Kernel: Kernel
  };
});
