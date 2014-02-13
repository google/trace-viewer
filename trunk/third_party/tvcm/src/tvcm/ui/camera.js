// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.require('tvcm.ui');
tvcm.require('tvcm.settings');

tvcm.exportTo('tvcm.ui', function() {

  var constants = {
    DEFAULT_SCALE: 0.5,
    DEFAULT_EYE_DISTANCE: 10000,
    MINIMUM_DISTANCE: 1000,
    MAXIMUM_DISTANCE: 100000,
    FOV: 15,
    RESCALE_TIMEOUT_MS: 200,
    MAXIMUM_TILT: 80,
    SETTINGS_NAMESPACE: 'tvcm.ui_camera'
  };


  var Camera = tvcm.ui.define('camera');

  Camera.prototype = {
    __proto__: HTMLUnknownElement.prototype,

    decorate: function(eventSource) {
      this.eventSource_ = eventSource;

      this.eventSource_.addEventListener('beginpan',
          this.onPanBegin_.bind(this));
      this.eventSource_.addEventListener('updatepan',
          this.onPanUpdate_.bind(this));
      this.eventSource_.addEventListener('endpan',
          this.onPanEnd_.bind(this));

      this.eventSource_.addEventListener('beginzoom',
          this.onZoomBegin_.bind(this));
      this.eventSource_.addEventListener('updatezoom',
          this.onZoomUpdate_.bind(this));
      this.eventSource_.addEventListener('endzoom',
          this.onZoomEnd_.bind(this));

      this.eventSource_.addEventListener('beginrotate',
          this.onRotateBegin_.bind(this));
      this.eventSource_.addEventListener('updaterotate',
          this.onRotateUpdate_.bind(this));
      this.eventSource_.addEventListener('endrotate',
          this.onRotateEnd_.bind(this));

      this.eye_ = [0, 0, constants.DEFAULT_EYE_DISTANCE];
      this.gazeTarget_ = [0, 0, 0];
      this.rotation_ = [0, 0];

      this.pixelRatio_ = window.devicePixelRatio || 1;
    },


    get modelViewMatrix() {
      var mvMatrix = mat4.create();

      mat4.lookAt(mvMatrix, this.eye_, this.gazeTarget_, [0, 1, 0]);
      return mvMatrix;
    },

    get projectionMatrix() {
      var rect =
          tvcm.windowRectForElement(this.canvas_).scaleSize(this.pixelRatio_);

      var aspectRatio = rect.width / rect.height;
      var matrix = mat4.create();
      mat4.perspective(
          matrix, tvcm.deg2rad(constants.FOV), aspectRatio, 1, 100000);

      return matrix;
    },

    set canvas(c) {
      this.canvas_ = c;
    },

    set deviceRect(rect) {
      this.deviceRect_ = rect;
    },

    get stackingDistanceDampening() {
      var gazeVector = [
        this.gazeTarget_[0] - this.eye_[0],
        this.gazeTarget_[1] - this.eye_[1],
        this.gazeTarget_[2] - this.eye_[2]];
      vec3.normalize(gazeVector, gazeVector);
      return 1 + gazeVector[2];
    },

    loadCameraFromSettings: function(settings) {
      this.eye_ = settings.get(
          'eye', this.eye_, constants.SETTINGS_NAMESPACE);
      this.gazeTarget_ = settings.get(
          'gaze_target', this.gazeTarget_, constants.SETTINGS_NAMESPACE);
      this.rotation_ = settings.get(
          'rotation', this.rotation_, constants.SETTINGS_NAMESPACE);

      this.dispatchRenderEvent_();
    },

    saveCameraToSettings: function(settings) {
      settings.set(
          'eye', this.eye_, constants.SETTINGS_NAMESPACE);
      settings.set(
          'gaze_target', this.gazeTarget_, constants.SETTINGS_NAMESPACE);
      settings.set(
          'rotation', this.rotation_, constants.SETTINGS_NAMESPACE);
    },

    resetCamera: function() {
      this.eye_ = [0, 0, constants.DEFAULT_EYE_DISTANCE];
      this.gazeTarget_ = [0, 0, 0];
      this.rotation_ = [0, 0];

      var settings = tvcm.SessionSettings();
      var keys = settings.keys(constants.SETTINGS_NAMESPACE);
      if (keys.length !== 0) {
        this.loadCameraFromSettings(settings);
        return;
      }

      if (this.deviceRect_) {
        var rect =
            tvcm.windowRectForElement(this.canvas_).scaleSize(this.pixelRatio_);

        this.eye_[0] = this.deviceRect_.width / 2;
        this.eye_[1] = this.deviceRect_.height / 2;

        this.gazeTarget_[0] = this.deviceRect_.width / 2;
        this.gazeTarget_[1] = this.deviceRect_.height / 2;
      }

      this.saveCameraToSettings(settings);
      this.dispatchRenderEvent_();
    },

    updatePanByDelta: function(delta) {
      var rect =
          tvcm.windowRectForElement(this.canvas_).scaleSize(this.pixelRatio_);

      // Get the eye vector, since we'll be adjusting gazeTarget.
      var eyeVector = [
        this.eye_[0] - this.gazeTarget_[0],
        this.eye_[1] - this.gazeTarget_[1],
        this.eye_[2] - this.gazeTarget_[2]];
      var length = vec3.length(eyeVector);
      vec3.normalize(eyeVector, eyeVector);

      var halfFov = constants.FOV / 2;
      var multiplier =
          2.0 * length * Math.tan(tvcm.deg2rad(halfFov)) / rect.height;

      // Get the up and right vectors.
      var up = [0, 1, 0];
      var rotMatrix = mat4.create();
      mat4.rotate(
          rotMatrix, rotMatrix, tvcm.deg2rad(this.rotation_[1]), [0, 1, 0]);
      mat4.rotate(
          rotMatrix, rotMatrix, tvcm.deg2rad(this.rotation_[0]), [1, 0, 0]);
      vec3.transformMat4(up, up, rotMatrix);

      var right = [0, 0, 0];
      vec3.cross(right, eyeVector, up);
      vec3.normalize(right, right);

      // Update the gaze target.
      for (var i = 0; i < 3; ++i) {
        this.gazeTarget_[i] +=
            delta[0] * multiplier * right[i] - delta[1] * multiplier * up[i];

        this.eye_[i] = this.gazeTarget_[i] + length * eyeVector[i];
      }

      // If we have some z offset, we need to reposition gazeTarget
      // to be on the plane z = 0 with normal [0, 0, 1].
      if (Math.abs(this.gazeTarget_[2]) > 1e-6) {
        var gazeVector = [-eyeVector[0], -eyeVector[1], -eyeVector[2]];
        var newLength = tvcm.clamp(
            -this.eye_[2] / gazeVector[2],
            constants.MINIMUM_DISTANCE,
            constants.MAXIMUM_DISTANCE);

        for (var i = 0; i < 3; ++i)
          this.gazeTarget_[i] = this.eye_[i] + newLength * gazeVector[i];
      }

      this.saveCameraToSettings(tvcm.SessionSettings());
      this.dispatchRenderEvent_();
    },

    updateZoomByDelta: function(delta) {
      var deltaY = delta[1];
      deltaY = tvcm.clamp(deltaY, -50, 50);
      var scale = 1.0 - deltaY / 100.0;

      var eyeVector = [0, 0, 0];
      vec3.subtract(eyeVector, this.eye_, this.gazeTarget_);

      var length = vec3.length(eyeVector);

      // Clamp the length to allowed values by changing the scale.
      if (length * scale < constants.MINIMUM_DISTANCE)
        scale = constants.MINIMUM_DISTANCE / length;
      else if (length * scale > constants.MAXIMUM_DISTANCE)
        scale = constants.MAXIMUM_DISTANCE / length;

      vec3.scale(eyeVector, eyeVector, scale);
      vec3.add(this.eye_, this.gazeTarget_, eyeVector);

      this.saveCameraToSettings(tvcm.SessionSettings());
      this.dispatchRenderEvent_();
    },

    updateRotateByDelta: function(delta) {
      delta[0] *= 0.5;
      delta[1] *= 0.5;

      if (Math.abs(this.rotation_[0] + delta[1]) > constants.MAXIMUM_TILT)
        return;
      if (Math.abs(this.rotation_[1] - delta[0]) > constants.MAXIMUM_TILT)
        return;

      var eyeVector = [0, 0, 0, 0];
      vec3.subtract(eyeVector, this.eye_, this.gazeTarget_);

      // Undo the current rotation.
      var rotMatrix = mat4.create();
      mat4.rotate(
          rotMatrix, rotMatrix, -tvcm.deg2rad(this.rotation_[0]), [1, 0, 0]);
      mat4.rotate(
          rotMatrix, rotMatrix, -tvcm.deg2rad(this.rotation_[1]), [0, 1, 0]);
      vec4.transformMat4(eyeVector, eyeVector, rotMatrix);

      // Update rotation values.
      this.rotation_[0] += delta[1];
      this.rotation_[1] -= delta[0];

      // Redo the new rotation.
      mat4.identity(rotMatrix);
      mat4.rotate(
          rotMatrix, rotMatrix, tvcm.deg2rad(this.rotation_[1]), [0, 1, 0]);
      mat4.rotate(
          rotMatrix, rotMatrix, tvcm.deg2rad(this.rotation_[0]), [1, 0, 0]);
      vec4.transformMat4(eyeVector, eyeVector, rotMatrix);

      vec3.add(this.eye_, this.gazeTarget_, eyeVector);

      this.saveCameraToSettings(tvcm.SessionSettings());
      this.dispatchRenderEvent_();
    },


    // Event callbacks.
    onPanBegin_: function(e) {
      this.panning_ = true;
      this.lastMousePosition_ = this.getMousePosition_(e);
    },

    onPanUpdate_: function(e) {
      if (!this.panning_)
        return;

      var delta = this.getMouseDelta_(e, this.lastMousePosition_);
      this.lastMousePosition_ = this.getMousePosition_(e);
      this.updatePanByDelta(delta);
    },

    onPanEnd_: function(e) {
      this.panning_ = false;
    },

    onZoomBegin_: function(e) {
      this.zooming_ = true;

      var p = this.getMousePosition_(e);

      this.lastMousePosition_ = p;
      this.zoomPoint_ = p;
    },

    onZoomUpdate_: function(e) {
      if (!this.zooming_)
        return;

      var delta = this.getMouseDelta_(e, this.lastMousePosition_);
      this.lastMousePosition_ = this.getMousePosition_(e);
      this.updateZoomByDelta(delta);
    },

    onZoomEnd_: function(e) {
      this.zooming_ = false;
      this.zoomPoint_ = undefined;
    },

    onRotateBegin_: function(e) {
      this.rotating_ = true;
      this.lastMousePosition_ = this.getMousePosition_(e);
    },

    onRotateUpdate_: function(e) {
      if (!this.rotating_)
        return;

      var delta = this.getMouseDelta_(e, this.lastMousePosition_);
      this.lastMousePosition_ = this.getMousePosition_(e);
      this.updateRotateByDelta(delta);
    },

    onRotateEnd_: function(e) {
      this.rotating_ = false;
    },


    // Misc helper functions.
    getMousePosition_: function(e) {
      var rect = tvcm.windowRectForElement(this.canvas_);
      return [(e.clientX - rect.x) * this.pixelRatio_,
              (e.clientY - rect.y) * this.pixelRatio_];
    },

    getMouseDelta_: function(e, p) {
      var newP = this.getMousePosition_(e);
      return [newP[0] - p[0], newP[1] - p[1]];
    },

    dispatchRenderEvent_: function() {
      tvcm.dispatchSimpleEvent(this, 'renderrequired', false, false);
    }
  };

  return {
    Camera: Camera
  };
});
