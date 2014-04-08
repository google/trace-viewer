// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

tvcm.requireStylesheet('tracing.tracks.ruler_track');

tvcm.require('tracing.constants');
tvcm.require('tracing.tracks.track');
tvcm.require('tracing.tracks.heading_track');
tvcm.require('tracing.draw_helpers');
tvcm.require('tvcm.ui');

tvcm.exportTo('tracing.tracks', function() {

  /**
   * A track that displays the ruler.
   * @constructor
   * @extends {HeadingTrack}
   */

  var RulerTrack = tvcm.ui.define('ruler-track', tracing.tracks.HeadingTrack);

  var logOf10 = Math.log(10);
  function log10(x) {
    return Math.log(x) / logOf10;
  }

  RulerTrack.prototype = {
    __proto__: tracing.tracks.HeadingTrack.prototype,

    decorate: function(viewport) {
      tracing.tracks.HeadingTrack.prototype.decorate.call(this, viewport);
      this.classList.add('ruler-track');
      this.strings_secs_ = [];
      this.strings_msecs_ = [];

      this.viewportChange_ = this.viewportChange_.bind(this);
      viewport.addEventListener('change', this.viewportChange_);

    },

    detach: function() {
      tracing.tracks.HeadingTrack.prototype.detach.call(this);
      this.viewport.removeEventListener('change',
                                        this.viewportChange_);
    },

    viewportChange_: function() {
      if (this.viewport.interestRange.isEmpty)
        this.classList.remove('tall-mode');
      else
        this.classList.add('tall-mode');
    },

    draw: function(type, viewLWorld, viewRWorld) {
      switch (type) {
        case tracing.tracks.DrawType.SLICE:
          this.drawSlices_(viewLWorld, viewRWorld);
          break;
        case tracing.tracks.DrawType.MARKERS:
          if (!this.viewport.interestRange.isEmpty)
            this.viewport.interestRange.draw(this.context(),
                                             viewLWorld, viewRWorld);
          break;
      }
    },

    drawSlices_: function(viewLWorld, viewRWorld) {
      var ctx = this.context();
      var pixelRatio = window.devicePixelRatio || 1;

      var bounds = ctx.canvas.getBoundingClientRect();
      var width = bounds.width * pixelRatio;
      var height = bounds.height * pixelRatio;

      var hasInterestRange = !this.viewport.interestRange.isEmpty;

      var rulerHeight = hasInterestRange ? (height * 2) / 5 : height;

      var vp = this.viewport;
      var dt = vp.currentDisplayTransform;

      var idealMajorMarkDistancePix = 150 * pixelRatio;
      var idealMajorMarkDistanceWorld =
          dt.xViewVectorToWorld(idealMajorMarkDistancePix);

      var majorMarkDistanceWorld;

      // The conservative guess is the nearest enclosing 0.1, 1, 10, 100, etc.
      var conservativeGuess =
          Math.pow(10, Math.ceil(log10(idealMajorMarkDistanceWorld)));

      // Once we have a conservative guess, consider things that evenly add up
      // to the conservative guess, e.g. 0.5, 0.2, 0.1 Pick the one that still
      // exceeds the ideal mark distance.
      var divisors = [10, 5, 2, 1];
      for (var i = 0; i < divisors.length; ++i) {
        var tightenedGuess = conservativeGuess / divisors[i];
        if (dt.xWorldVectorToView(tightenedGuess) < idealMajorMarkDistancePix)
          continue;
        majorMarkDistanceWorld = conservativeGuess / divisors[i - 1];
        break;
      }

      var unit;
      var unitDivisor;
      var tickLabels = undefined;
      if (majorMarkDistanceWorld < 100) {
        unit = 'ms';
        unitDivisor = 1;
        tickLabels = this.strings_msecs_;
      } else {
        unit = 's';
        unitDivisor = 1000;
        tickLabels = this.strings_secs_;
      }

      var numTicksPerMajor = 5;
      var minorMarkDistanceWorld = majorMarkDistanceWorld / numTicksPerMajor;
      var minorMarkDistancePx = dt.xWorldVectorToView(minorMarkDistanceWorld);

      var firstMajorMark =
          Math.floor(viewLWorld / majorMarkDistanceWorld) *
              majorMarkDistanceWorld;

      var minorTickH = Math.floor(rulerHeight * 0.25);

      ctx.save();

      var pixelRatio = window.devicePixelRatio || 1;
      ctx.lineWidth = Math.round(pixelRatio);

      // Apply subpixel translate to get crisp lines.
      // http://www.mobtowers.com/html5-canvas-crisp-lines-every-time/
      var crispLineCorrection = (ctx.lineWidth % 2) / 2;
      ctx.translate(crispLineCorrection, -crispLineCorrection);

      ctx.fillStyle = 'rgb(0, 0, 0)';
      ctx.strokeStyle = 'rgb(0, 0, 0)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      ctx.font = (9 * pixelRatio) + 'px sans-serif';

      vp.majorMarkPositions = [];

      // Each iteration of this loop draws one major mark
      // and numTicksPerMajor minor ticks.
      //
      // Rendering can't be done in world space because canvas transforms
      // affect line width. So, do the conversions manually.
      ctx.beginPath();
      for (var curX = firstMajorMark;
           curX < viewRWorld;
           curX += majorMarkDistanceWorld) {

        var curXView = Math.floor(dt.xWorldToView(curX));

        var unitValue = curX / unitDivisor;
        var roundedUnitValue = Math.floor(unitValue * 100000) / 100000;

        if (!tickLabels[roundedUnitValue])
          tickLabels[roundedUnitValue] = roundedUnitValue + ' ' + unit;
        ctx.fillText(tickLabels[roundedUnitValue],
                     curXView + (2 * pixelRatio), 0);

        vp.majorMarkPositions.push(curXView);

        // Major mark
        tracing.drawLine(ctx, curXView, 0, curXView, rulerHeight);

        // Minor marks
        for (var i = 1; i < numTicksPerMajor; ++i) {
          var xView = Math.floor(curXView + minorMarkDistancePx * i);
          tracing.drawLine(ctx,
              xView, rulerHeight - minorTickH,
              xView, rulerHeight);
        }
      }

      // Draw bottom bar.
      ctx.strokeStyle = 'rgb(0, 0, 0)';
      tracing.drawLine(ctx, 0, height, width, height);
      ctx.stroke();

      // Give distance between directly adjacent markers.
      if (!hasInterestRange)
        return;

      // Draw middle bar.
      tracing.drawLine(ctx, 0, rulerHeight, width, rulerHeight);
      ctx.stroke();

      // Distance Variables.
      var displayDistance;
      var displayTextColor = 'rgb(0,0,0)';

      // Arrow Variables.
      var arrowSpacing = 10 * pixelRatio;
      var arrowColor = 'rgb(128,121,121)';
      var arrowPosY = rulerHeight * 1.75;
      var arrowWidthView = 3 * pixelRatio;
      var arrowLengthView = 10 * pixelRatio;
      var spaceForArrowsView = 2 * (arrowWidthView + arrowSpacing);

      ctx.textBaseline = 'middle';
      ctx.font = (14 * pixelRatio) + 'px sans-serif';
      var textPosY = arrowPosY;

      var interestRange = vp.interestRange;

      // If the range is zero, draw it's min timestamp next to the line.
      if (interestRange.range === 0) {
        var markerWorld = interestRange.min;
        var markerView = dt.xWorldToView(markerWorld);
        var displayValue = markerWorld / unitDivisor;
        displayValue = Math.abs((Math.floor(displayValue * 1000) / 1000));

        var textToDraw = displayValue + ' ' + unit;
        var textLeftView = markerView + 4 * pixelRatio;
        var textWidthView = ctx.measureText(textToDraw).width;

        // Put text to the left in case it gets cut off.
        if (textLeftView + textWidthView > width)
          textLeftView = markerView - 4 * pixelRatio - textWidthView;

        ctx.fillStyle = displayTextColor;
        ctx.fillText(textToDraw, textLeftView, textPosY);
        return;
      }

      var leftMarker = interestRange.min;
      var rightMarker = interestRange.max;

      var leftMarkerView = dt.xWorldToView(leftMarker);
      var rightMarkerView = dt.xWorldToView(rightMarker);

      var distanceBetweenMarkers = interestRange.range;
      var distanceBetweenMarkersView =
          dt.xWorldVectorToView(distanceBetweenMarkers);
      var positionInMiddleOfMarkersView =
          leftMarkerView + (distanceBetweenMarkersView / 2);

      // Determine units.
      if (distanceBetweenMarkers < 100) {
        unit = 'ms';
        unitDivisor = 1;
      } else {
        unit = 's';
        unitDivisor = 1000;
      }

      // Calculate display value to print.
      displayDistance = distanceBetweenMarkers / unitDivisor;
      var roundedDisplayDistance =
          Math.abs((Math.floor(displayDistance * 1000) / 1000));
      var textToDraw = roundedDisplayDistance + ' ' + unit;
      var textWidthView = ctx.measureText(textToDraw).width;
      var spaceForArrowsAndTextView =
          textWidthView + spaceForArrowsView + arrowSpacing;

      // Set text positions.
      var textLeftView = positionInMiddleOfMarkersView - textWidthView / 2;
      var textRightView = textLeftView + textWidthView;

      if (spaceForArrowsAndTextView > distanceBetweenMarkersView) {
        // Print the display distance text right of the 2 markers.
        textLeftView = rightMarkerView + 2 * arrowSpacing;

        // Put text to the left in case it gets cut off.
        if (textLeftView + textWidthView > width)
          textLeftView = leftMarkerView - 2 * arrowSpacing - textWidthView;

        ctx.fillStyle = displayTextColor;
        ctx.fillText(textToDraw, textLeftView, textPosY);

        // Draw the arrows pointing from outside in and a line in between.
        ctx.strokeStyle = arrowColor;
        ctx.beginPath();
        tracing.drawLine(ctx, leftMarkerView, arrowPosY, rightMarkerView,
            arrowPosY);
        ctx.stroke();

        ctx.fillStyle = arrowColor;
        tracing.drawArrow(ctx,
            leftMarkerView - 1.5 * arrowSpacing, arrowPosY,
            leftMarkerView, arrowPosY,
            arrowLengthView, arrowWidthView);
        tracing.drawArrow(ctx,
            rightMarkerView + 1.5 * arrowSpacing, arrowPosY,
            rightMarkerView, arrowPosY,
            arrowLengthView, arrowWidthView);

      } else if (spaceForArrowsView <= distanceBetweenMarkersView) {
        var leftArrowStart;
        var rightArrowStart;
        if (spaceForArrowsAndTextView <= distanceBetweenMarkersView) {
          // Print the display distance text.
          ctx.fillStyle = displayTextColor;
          ctx.fillText(textToDraw, textLeftView, textPosY);

          leftArrowStart = textLeftView - arrowSpacing;
          rightArrowStart = textRightView + arrowSpacing;
        } else {
          leftArrowStart = positionInMiddleOfMarkersView;
          rightArrowStart = positionInMiddleOfMarkersView;
        }

        // Draw the arrows pointing inside out.
        ctx.strokeStyle = arrowColor;
        ctx.fillStyle = arrowColor;
        tracing.drawArrow(ctx,
            leftArrowStart, arrowPosY,
            leftMarkerView, arrowPosY,
            arrowLengthView, arrowWidthView);
        tracing.drawArrow(ctx,
            rightArrowStart, arrowPosY,
            rightMarkerView, arrowPosY,
            arrowLengthView, arrowWidthView);
      }

      ctx.restore();
    },

    /**
     * Adds items intersecting the given range to a selection.
     * @param {number} loVX Lower X bound of the interval to search, in
     *     viewspace.
     * @param {number} hiVX Upper X bound of the interval to search, in
     *     viewspace.
     * @param {number} loVY Lower Y bound of the interval to search, in
     *     viewspace.
     * @param {number} hiVY Upper Y bound of the interval to search, in
     *     viewspace.
     * @param {Selection} selection Selection to which to add results.
     */
    addIntersectingItemsInRangeToSelection: function(
        loVX, hiVX, loY, hiY, selection) {
      // Does nothing. There's nothing interesting to pick on the ruler
      // track.
    },

    addAllObjectsMatchingFilterToSelection: function(filter, selection) {
    }
  };

  return {
    RulerTrack: RulerTrack
  };
});
