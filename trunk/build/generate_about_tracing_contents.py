#!/usr/bin/env python
# Copyright (c) 2012 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
import optparse
import parse_deps
import sys
import os

srcdir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../src"))

html_warning_message = """


<!------------------------------------------------------------------------------
WARNING: This file is generated by generate_about_tracing_contents.py

         Do not edit directly.


------------------------------------------------------------------------------->


"""

js_warning_message = """/**
// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

* WARNING: This file is generated by generate_about_tracing_contents.py
*
*        Do not edit directly.
*/
"""

def generate_html():
  f = open(os.path.join(srcdir, "about_tracing.html.template"), 'r')
  template = f.read()
  f.close()

  assert template.find("<WARNING_MESSAGE></WARNING_MESSAGE>") != -1
  assert template.find("<STYLE_SHEET_CONTENTS></STYLE_SHEET_CONTENTS>") != -1

  filenames = [os.path.join(srcdir, x) for x in ["base.js", "about_tracing/profiling_view.js"]]
  filenames = [os.path.relpath(x, srcdir) for x in filenames]

  load_sequence = parse_deps.calc_load_sequence(filenames, srcdir)

  style_sheet_contents = ""
  for module in load_sequence:
    for style_sheet in module.style_sheets:
      rel_filename = os.path.relpath(style_sheet.filename, srcdir)
      link_tag = """<link rel="stylesheet" href="%s">\n""" % rel_filename
      style_sheet_contents += link_tag

  result = template
  result = result.replace("<WARNING_MESSAGE></WARNING_MESSAGE>", html_warning_message)
  result = result.replace("<STYLE_SHEET_CONTENTS></STYLE_SHEET_CONTENTS>", style_sheet_contents)

  return result

def generate_js():
  f = open(os.path.join(srcdir, "about_tracing.js.template"), 'r')
  template = f.read()
  f.close()

  assert template.find("<WARNING_MESSAGE></WARNING_MESSAGE>") != -1
  assert template.find("<SCRIPT_CONTENTS></SCRIPT_CONTENTS>") != -1

  filenames = [os.path.join(srcdir, x) for x in ["base.js", "about_tracing/profiling_view.js"]]
  filenames = [os.path.relpath(x, srcdir) for x in filenames]

  import parse_deps
  load_sequence = parse_deps.calc_load_sequence(filenames, srcdir)
  script_contents = ""
  script_contents += "window.FLATTENED = {};\n"
  script_contents += "window.FLATTENED_RAW_SCRIPTS = {};\n"
  for module in load_sequence:
    for dependent_raw_script_name in module.dependent_raw_script_names:
      script_contents += (
        "window.FLATTENED_RAW_SCRIPTS['%s'] = true;\n" %
        dependent_raw_script_name)
    script_contents += "window.FLATTENED['%s'] = true;\n" % module.name

  for module in load_sequence:
    for dependent_raw_script in module.dependent_raw_scripts:
      rel_filename = os.path.relpath(dependent_raw_script.filename, srcdir)
      script_contents += """<include src="%s">\n""" % rel_filename

    rel_filename = os.path.relpath(module.filename, srcdir)
    script_contents += """<include src="%s">\n""" % rel_filename


  result = template
  result = result.replace("<WARNING_MESSAGE></WARNING_MESSAGE>",
                          js_warning_message)
  result = result.replace("<SCRIPT_CONTENTS></SCRIPT_CONTENTS>", script_contents)

  return result

def is_out_of_date():
  olddir = os.getcwd()
  try:
    os.chdir(srcdir)

    o = open(os.path.join(srcdir, "about_tracing.html"), 'r')
    existing_result_html = o.read()
    o.close()

    result_html = generate_html()

    if result_html != existing_result_html:
      return True

    o = open(os.path.join(srcdir, "about_tracing.js"), 'r')
    existing_result_js = o.read()
    o.close()

    result_js = generate_js()

    if result_js != existing_result_js:
      return True

  finally:
    os.chdir(olddir)
  return False


def main(args):
  parser = optparse.OptionParser()
  options, args = parser.parse_args(args)

  olddir = os.getcwd()
  try:
    os.chdir(srcdir)

    try:
      result_html = generate_html()
    except parse_deps.DepsException, ex:
      sys.stderr.write("Error: %s\n\n" % str(ex))
      return 255

    o = open(os.path.join(srcdir, "about_tracing.html"), 'w')
    o.write(result_html)
    o.close()

    result_js = generate_js()
    o = open(os.path.join(srcdir, "about_tracing.js"), 'w')
    o.write(result_js)
    o.close()

  finally:
    os.chdir(olddir)

  return 0

if __name__ == "__main__":
  sys.exit(main(sys.argv))
