# Copyright (c) 2014 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import base64
import optparse
import sys
import os
import re
import StringIO

from tvcm import js_utils


srcdir = os.path.abspath(os.path.join(os.path.dirname(__file__),
                                      "..", "..", "..", "src"))

html_warning_message = """


<!--
WARNING: This file is auto generated.

         Do not edit directly.
-->
"""

js_warning_message = """
// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* WARNING: This file is auto generated.
 *
 * Do not edit directly.
 */
"""

css_warning_message = """
/* Copyright (c) 2014 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file. */

/* WARNING: This file is auto-generated.
 *
 * Do not edit directly.
 */
"""

def GenerateJSToFile(f,
                     load_sequence,
                     use_include_tags_for_scripts=False,
                     dir_for_include_tag_root=None):
  if use_include_tags_for_scripts and dir_for_include_tag_root == None:
    raise Exception('Must provide dir_for_include_tag_root')

  f.write(js_warning_message)
  f.write('\n')
  f.write("window.FLATTENED = {};\n")
  f.write("window.FLATTENED_RAW_SCRIPTS = {};\n")

  for module in load_sequence:
    module.AppendTVCMJSControlCodeToFile(f)

  for module in load_sequence:
    module.AppendJSContentsToFile(f,
                                  use_include_tags_for_scripts,
                                  dir_for_include_tag_root)

def GenerateDepsJS(load_sequence, project):
  chunks = [js_warning_message, '\n']
  loader = load_sequence[0].loader
  for module in loader.loaded_modules.values():
    chunks.append("tvcm.setResourceFileName('%s','%s');\n" % (
        module.name, module.resource.unix_style_relative_path))

  for module in load_sequence:
    for dependent_module in module.dependent_modules:
      chunks.append("tvcm.addModuleDependency('%s','%s');\n" % (
          module.name, dependent_module.name));

    for dependent_raw_script in module.dependent_raw_scripts:
      relative_path = dependent_raw_script.resource.unix_style_relative_path
      chunks.append(
          "tvcm.addModuleRawScriptDependency('%s','%s');\n" % (
           module.name, relative_path));

    for style_sheet in module.style_sheets:
      chunks.append("tvcm.addModuleStylesheet('%s','%s');\n" % (
          module.name, style_sheet.name));
  return "".join(chunks)

def GenerateHTMLForCombinedTemplates(load_sequence):
  chunks = []
  for module in load_sequence:
    for html_template in module.html_templates:
      chunks.append(html_template.contents)
  return "\n".join(chunks)

class ExtraScript(object):
  def __init__(self, script_id=None, text_content=None, content_type=None):
    if script_id != None:
      assert script_id[0] != '#'
    self.script_id = script_id
    self.text_content = text_content
    self.content_type = content_type

  def WriteToFile(self, output_file):
    attrs = []
    if self.script_id:
      attrs.append('id="%s"' % self.script_id)
    if self.content_type:
      attrs.append('content-type="%s"' % self.content_type)

    if len(attrs) > 0:
      output_file.write('<script %s>\n' % ' '.join(attrs))
    else:
      output_file.write('<script>\n')
    if self.text_content:
      output_file.write(self.text_content)
    output_file.write('</script>\n')


def GenerateStandaloneHTMLAsString(*args, **kwargs):
  f = StringIO.StringIO()
  GenerateStandaloneHTMLToFile(f, *args, **kwargs)
  return f.getvalue()

def _GenerateCSS(load_sequence):
  style_sheet_chunks = [css_warning_message, '\n']
  for module in load_sequence:
    for style_sheet in module.style_sheets:
      style_sheet_chunks.append(style_sheet.contents_with_inlined_images)
      style_sheet_chunks.append('\n')
  return ''.join(style_sheet_chunks)

def GenerateStandaloneHTMLToFile(output_file,
                                 load_sequence,
                                 title,
                                 flattened_js_url=None,
                                 extra_scripts=None):
  extra_scripts = extra_scripts or []

  output_file.write("""<!DOCTYPE HTML>
<html>
  <head i18n-values="dir:textdirection;">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>%s</title>
""" % title)

  output_file.write('<style>\n')
  output_file.write(_GenerateCSS(load_sequence))
  output_file.write('\n')
  output_file.write('</style>\n')

  output_file.write(GenerateHTMLForCombinedTemplates(load_sequence))

  for module in load_sequence:
    module.AppendHTMLContentsToFile(output_file)

  if flattened_js_url:
    output_file.write('<script src="%s"></script>\n' % flattened_js_url)
  else:
    output_file.write('<script>\n')
    output_file.write(GenerateJS(load_sequence))
    output_file.write('</script>\n')

  for extra_script in extra_scripts:
    extra_script.WriteToFile(output_file)

  output_file.write("""</head>
<body>
""")

  output_file.write("""</body>
</html>
""")
