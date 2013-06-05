// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.exportTo('base', function() {
  function Color(opt_r, opt_g, opt_b, opt_a) {
    this.r = Math.floor(opt_r) || 0;
    this.g = Math.floor(opt_g) || 0;
    this.b = Math.floor(opt_b) || 0;
    this.a = opt_a;
  }

  Color.fromString = function(str) {
    var tmp;
    var values;
    if (str.substr(0, 4) == 'rgb(') {
      tmp = str.substr(4, str.length - 5);
      values = tmp.split(',').map(function(v) {
        return v.replace(/^\s+/, '', 'g');
      });
      if (values.length != 3)
        throw new Error('Malformatted rgb-expression');
      return new Color(
          parseInt(values[0]),
          parseInt(values[1]),
          parseInt(values[2]));
    } else if (str.substr(0, 5) == 'rgba(') {
      tmp = str.substr(5, str.length - 6);
      values = tmp.split(',').map(function(v) {
        return v.replace(/^\s+/, '', 'g');
      });
      if (values.length != 4)
        throw new Error('Malformatted rgb-expression');
      return new Color(
          parseInt(values[0]),
          parseInt(values[1]),
          parseInt(values[2]),
          parseFloat(values[3]));
    } else if (str[0] == '#' && str.length == 7) {
      return new Color(
          parseInt(str.substr(1, 2), 16),
          parseInt(str.substr(3, 2), 16),
          parseInt(str.substr(5, 2), 16));
    } else {
      throw new Error('Unrecognized string format.');
    }
  };

  Color.lerp = function(a, b, percent) {
    if (a.a !== undefined && b.a !== undefined)
      return Color.lerpRGBA(a, b, percent);
    return Color.lerpRGB(a, b, percent);
  }
  Color.lerpRGB = function(a, b, percent) {
    return new Color(
        ((b.r - a.r) * percent) + a.r,
        ((b.g - a.g) * percent) + a.g,
        ((b.b - a.b) * percent) + a.b);
  }

  Color.lerpRGBA = function(a, b, percent) {
    return new Color(
        ((b.r - a.r) * percent) + a.r,
        ((b.g - a.g) * percent) + a.g,
        ((b.b - a.b) * percent) + a.b,
        ((b.a - a.a) * percent) + a.a);
  }

  Color.prototype = {
    brighten: function(opt_k) {
      var k;
      k = opt_k || 0.45;

      return new Color(
          Math.min(255, this.r + Math.floor(this.r * k)),
          Math.min(255, this.g + Math.floor(this.g * k)),
          Math.min(255, this.b + Math.floor(this.b * k)));
    },

    darken: function(opt_k) {
      var k;
      k = opt_k || 0.45;

      return new Color(
          Math.min(255, this.r - Math.floor(this.r * k)),
          Math.min(255, this.g - Math.floor(this.g * k)),
          Math.min(255, this.b - Math.floor(this.b * k)));
    },

    withAlpha: function(a) {
      return new Color(this.r, this.g, this.b, a);
    },

    toString: function() {
      if (this.a !== undefined) {
        return 'rgba(' +
            this.r + ',' + this.g + ',' +
            this.b + ',' + this.a + ')';
      }
      return 'rgb(' + this.r + ',' + this.g + ',' + this.b + ')';
    }
  };

  return {
    Color: Color
  };
});
