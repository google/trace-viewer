# Copyright (c) 2012 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
import unittest
import socket
import httplib
import os
import json

from build import temporary_dev_server

class DevServerTests(unittest.TestCase):
  def setUp(self):
    self.server = temporary_dev_server.TemporaryDevServer()

  def tearDown(self):
    self.server.Close()

  def testBasic(self):
    src_path = os.path.abspath(os.path.join(os.path.dirname(__file__),
                                           '..', 'src'))
    self.server.CallOnServer('AddSourcePathMapping', '/src/', src_path)
    resp_str = self.server.Get('/src/base.js')
    with open(os.path.join(src_path, 'base.js'), 'r') as f:
      base_str = f.read()
    self.assertEquals(resp_str, base_str)

  def testDeps(self):
    src_path = os.path.abspath(os.path.join(os.path.dirname(__file__),
                                           '..', 'src'))
    self.server.CallOnServer('AddSourcePathMapping', '/src/', src_path)

    # Just smoke test that it works.
    resp_str = self.server.Get('/deps.js')

  def testTests(self):
    src_path = os.path.abspath(os.path.join(os.path.dirname(__file__),
                                           '..', 'src'))
    self.server.CallOnServer('AddSourcePathMapping', '/src/', src_path)

    # Just smoke test for a known test to see if things worked.
    resp_str = self.server.Get('/json/tests')
    resp = json.loads(resp_str)
    self.assertTrue('/src/base/raf_test.js' in resp)
