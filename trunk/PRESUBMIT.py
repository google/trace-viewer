# Copyright (c) 2012 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import os
_EXCLUDED_PATHS = []

_LICENSE_HEADER = (
  r".*? Copyright \(c\) 20\d\d The Chromium Authors\. All rights reserved\."
    "\n"
  r".*? Use of this source code is governed by a BSD-style license that can "
    "be\n"
  r".*? found in the LICENSE file\."
    "\n"
)

def _CheckIfAboutTracingIsOutOfdate(input_api, output_api):
  import build.generate_about_tracing_contents as generator1
  import build.parse_deps

  try:
    out_of_date = generator1.is_out_of_date()
  except build.parse_deps.DepsException, ex:
    return [output_api.PresubmitError(str(ex))]

  if out_of_date:
    return [output_api.PresubmitError(
        'This change affects the about_tracing files. '
        'Please run ./build/generate_about_tracing_contents.py')]
  return []

def _CommonChecks(input_api, output_api):
  results = []
  results.extend(input_api.canned_checks.PanProjectChecks(
      input_api, output_api, excluded_paths=_EXCLUDED_PATHS))
  results.extend(_CheckIfAboutTracingIsOutOfdate(input_api, output_api))

  from web_dev_style import css_checker, js_checker

  src_dir = os.path.join(input_api.change.RepositoryRoot(), "src")
  FILES_TO_NOT_LINT = [
    input_api.os_path.join(src_dir, "about_tracing.js"),
  ]

  def IsResource(maybe_resource):
    f = maybe_resource.AbsoluteLocalPath()
    print f
    if not f.endswith(('.css', '.html', '.js')):
      return False
    for ignored in FILES_TO_NOT_LINT:
      if input_api.os_path.samefile(f, ignored):
        return False
    return True


  results.extend(css_checker.CSSChecker(input_api, output_api,
                                        file_filter=IsResource).RunChecks())
  results.extend(js_checker.JSChecker(input_api, output_api,
                                      file_filter=IsResource).RunChecks())

  black_list = input_api.DEFAULT_BLACK_LIST
  sources = lambda x: input_api.FilterSourceFile(x, black_list=black_list)
  results.extend(input_api.canned_checks.CheckLicense(
                 input_api, output_api, _LICENSE_HEADER,
                 source_file_filter=sources))
  return results

def GetPathsToPrepend(input_api):
  web_dev_style_path = input_api.os_path.join(
    input_api.change.RepositoryRoot(),
    "third_party",
    "web_dev_style")
  return [input_api.PresubmitLocalPath(), web_dev_style_path]

def RunWithPrependedPath(prepended_path, fn, *args):
  import sys
  old_path = sys.path

  try:
    sys.path = prepended_path + old_path
    return fn(*args)
  finally:
    sys.path = old_path

def CheckChangeOnUpload(input_api, output_api):
  def go():
    results = []
    results.extend(_CommonChecks(input_api, output_api))
    return results
  return RunWithPrependedPath(GetPathsToPrepend(input_api), go)

def CheckChangeOnCommit(input_api, output_api):
  def go():
    results = []
    results.extend(_CommonChecks(input_api, output_api))
    return results
  return RunWithPrependedPath(GetPathsToPrepend(input_api), go)
