# Copyright (c) 2014 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
import unittest
import tempfile
import os

from trace_viewer.build import trace2html

class Trace2HTMLTests(unittest.TestCase):
  def test_writeHTMLForTracesToFile(self):
    with tempfile.NamedTemporaryFile(mode='w', delete=False) as tmpfile:
      simple_trace_path = os.path.join(os.path.dirname(__file__),
                                    '..', '..', 'test_data', 'simple_trace.json')
      big_trace_path = os.path.join(os.path.dirname(__file__),
                                    '..', '..', 'test_data', 'big_trace.json')      
      res = trace2html.WriteHTMLForTracesToFile([big_trace_path, simple_trace_path], tmpfile)