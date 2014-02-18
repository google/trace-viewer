#!/usr/bin/env python
# Copyright (c) 2012 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
import json
import optparse
import os
import sys
import time
import traceback
import base64

from tvcm import project as project_module
from tvcm import generate
from tvcm import resource_loader

import SocketServer
import SimpleHTTPServer
import BaseHTTPServer

DEPS_CHECK_DELAY = 30

class DevServerHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):
  def __init__(self, *args, **kwargs):
    SimpleHTTPServer.SimpleHTTPRequestHandler.__init__(self, *args, **kwargs)

  def send_response(self, code, message=None):
    SimpleHTTPServer.SimpleHTTPRequestHandler.send_response(self, code, message)
    if code == 200:
      self.send_header('Cache-Control', 'no-cache')

  def do_GET(self):
    if self.do_path_handler('GET'):
      return

    return SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)

  def do_POST(self):
    if self.do_path_handler('POST'):
      return
    return SimpleHTTPServer.SimpleHTTPRequestHandler.do_POST(self)


  def do_path_handler(self, method):
    handler = self.server.GetPathHandler(self.path, method)
    if handler:
      try:
        handler(self)
      except Exception, ex:
        msg = json.dumps({"details": traceback.format_exc(),
                          "message": ex.message});
        self.log_error('While parsing %s: %s', self.path, ex.message)
        self.send_response(500)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Content-Length', len(msg))
        self.end_headers()
        self.wfile.write(msg)
      return True
    return False

  def translate_path(self, path):
    path = path.split('?',1)[0]
    path = path.split('#',1)[0]
    for mapped_path in self.server.project.source_paths:
      rel = os.path.relpath(path, '/')
      candidate = os.path.join(mapped_path, rel)
      if os.path.exists(candidate):
        return candidate
    return ''

  def log_error(self, format, *args):
    if self.server._quiet:
      return
    if self.path == '/favicon.ico':
      return
    self.log_message("While processing %s: ", self.path)
    SimpleHTTPServer.SimpleHTTPRequestHandler.log_error(self, format, *args)

  def log_request(self, code='-', size='-'):
    # Dont spam the console unless it is important.
    pass

def do_GET_json_tests(self):
  test_module_resources = self.server.project.FindAllTestModuleResources()
  if self.server.test_module_resource_filter:
    cur_filter = self.server.test_module_resource_filter
  else:
    cur_filter = lambda x: True

  test_module_names = [x.name for x in test_module_resources if cur_filter(x)]

  tests = {'test_module_names': test_module_names,
           'test_links': self.server.test_links}
  tests_as_json = json.dumps(tests);

  self.send_response(200)
  self.send_header('Content-Type', 'application/json')
  self.send_header('Content-Length', len(tests_as_json))
  self.end_headers()
  self.wfile.write(tests_as_json)


def do_GET_deps(self):
  try:
    self.server.UpdateDepsAndTemplate()
  except Exception, ex:
    msg = json.dumps({"details": traceback.format_exc(),
                      "message": ex.message});
    self.log_error('While parsing deps: %s', ex.message)
    self.send_response(500)
    self.send_header('Content-Type', 'application/json')
    self.send_header('Cache-Control', 'no-cache')
    self.send_header('Content-Length', len(msg))
    self.end_headers()
    self.wfile.write(msg)
    return
  self.send_response(200)
  self.send_header('Content-Type', 'application/javascript')
  self.send_header('Content-Length', len(self.server.deps))
  self.end_headers()
  self.wfile.write(self.server.deps)

def do_GET_templates(self):
  self.server.UpdateDepsAndTemplate()
  self.send_response(200)
  self.send_header('Content-Type', 'text/html')
  self.send_header('Content-Length', len(self.server.templates))
  self.end_headers()
  self.wfile.write(self.server.templates)


class PathHandler(object):
  def __init__(self, path, handler, supports_get, supports_post):
    self.path = path
    self.handler = handler
    self.supports_get = supports_get
    self.supports_post = supports_post

  def CanHandle(self, path, method):
    if path != self.path:
      return False
    if method == 'GET' and self.supports_get:
      return True
    if method == 'POST' and self.supports_post:
      return True
    return False

def do_GET_root(request):
  request.send_response(301)
  request.send_header("Location", request.server.default_path)
  request.end_headers()

class DevServer(SocketServer.ThreadingMixIn, BaseHTTPServer.HTTPServer):
  def __init__(self, port, quiet=False, project=None):
    BaseHTTPServer.HTTPServer.__init__(self, ('', port), DevServerHandler)
    self._quiet = quiet
    if port == 0:
      port = self.server_address[1]
    self._port = port
    self._path_handlers = []
    self._test_links = []
    if project:
      self._project = project
    else:
      self._project = project_module.Project([])

    self._next_deps_check = -1
    self.test_module_resource_filter = None
    self.deps = None

    self.AddPathHandler('/', do_GET_root)
    self.AddPathHandler('', do_GET_root)
    self.default_path = '/tvcm/tests.html'
    # Redirect old tests.html places to the new location until folks have gotten used to its new
    # location.
    self.AddPathHandler('/src/tests.html', do_GET_root)
    self.AddPathHandler('/tests.html', do_GET_root)

    self.AddPathHandler('/tvcm/json/tests', do_GET_json_tests)
    self.AddPathHandler('/tvcm/all_templates.html', do_GET_templates)
    self.AddPathHandler('/tvcm/deps.js', do_GET_deps)

  def AddPathHandler(self, path, handler, supports_get=True, supports_post=False):
    self._path_handlers.append(PathHandler(path, handler, supports_get, supports_post))

  def GetPathHandler(self, path, method):
    for h in self._path_handlers:
      if h.CanHandle(path, method):
        return h.handler
    return None

  def SetTestFilterToAllowOnlyFilenamesMatching(self, x):
    def FilterOnX(r):
      return x in r.name
    self.test_module_resource_filter = FilterOnX

  def AddSourcePathMapping(self, file_system_path):
    self._project.AddSourcePath(file_system_path)

  def AddTestLink(self, path, title):
    self._test_links.append({'path': path,
                             'title': title})

  @property
  def test_links(self):
    return self._test_links

  @property
  def project(self):
    return self._project

  def UpdateDepsAndTemplate(self):
    current_time = time.time()
    if self._next_deps_check >= current_time:
      return

    if not self._quiet:
      sys.stderr.write('Regenerating deps and templates\n')

    self.project.ResetLoader()
    load_sequence = self.project.CalcLoadSequenceForAllModules()
    self.deps = generate.GenerateDepsJS(
        load_sequence, self.project)
    self.templates = generate.GenerateHTMLForCombinedTemplates(
        load_sequence)
    self._next_deps_check = current_time + DEPS_CHECK_DELAY

  @property
  def port(self):
    return self._port

  def serve_forever(self):
    if not self._quiet:
      sys.stderr.write("Now running on http://localhost:%i\n" % self._port)
    BaseHTTPServer.HTTPServer.serve_forever(self)
