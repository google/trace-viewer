#!/usr/bin/env python
# Copyright (c) 2012 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
"""Tests for the parse_deps module."""

import os
import unittest

from tvcm import project
from tvcm import parse_deps

class CalcLoadSequenceTest(unittest.TestCase):
  def test_one_toplevel_nodeps(self):
    load_sequence = parse_deps.calc_load_sequence_internal(
        [os.path.join('tvcm', 'guid.js')], project.Project())
    name_sequence = [x.name for x in load_sequence]
    self.assertEquals(['tvcm.guid'], name_sequence)


if __name__ == '__main__':
  unittest.main()
