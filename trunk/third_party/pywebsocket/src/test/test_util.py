#!/usr/bin/env python
#
# Copyright 2011, Google Inc.
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are
# met:
#
#     * Redistributions of source code must retain the above copyright
# notice, this list of conditions and the following disclaimer.
#     * Redistributions in binary form must reproduce the above
# copyright notice, this list of conditions and the following disclaimer
# in the documentation and/or other materials provided with the
# distribution.
#     * Neither the name of Google Inc. nor the names of its
# contributors may be used to endorse or promote products derived from
# this software without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
# "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
# LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
# A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
# OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
# SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
# LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
# DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
# THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


"""Tests for util module."""


import os
import sys
import unittest

import set_sys_path  # Update sys.path to locate mod_pywebsocket module.

from mod_pywebsocket import util


_TEST_DATA_DIR = os.path.join(os.path.split(__file__)[0], 'testdata')


class UtilTest(unittest.TestCase):
    """A unittest for util module."""

    def test_get_stack_trace(self):
        self.assertEqual('None\n', util.get_stack_trace())
        try:
            a = 1 / 0  # Intentionally raise exception.
        except Exception:
            trace = util.get_stack_trace()
            self.failUnless(trace.startswith('Traceback'))
            self.failUnless(trace.find('ZeroDivisionError') != -1)

    def test_prepend_message_to_exception(self):
        exc = Exception('World')
        self.assertEqual('World', str(exc))
        util.prepend_message_to_exception('Hello ', exc)
        self.assertEqual('Hello World', str(exc))

    def test_get_script_interp(self):
        cygwin_path = 'c:\\cygwin\\bin'
        cygwin_perl = os.path.join(cygwin_path, 'perl')
        self.assertEqual(None, util.get_script_interp(
            os.path.join(_TEST_DATA_DIR, 'README')))
        self.assertEqual(None, util.get_script_interp(
            os.path.join(_TEST_DATA_DIR, 'README'), cygwin_path))
        self.assertEqual('/usr/bin/perl -wT', util.get_script_interp(
            os.path.join(_TEST_DATA_DIR, 'hello.pl')))
        self.assertEqual(cygwin_perl + ' -wT', util.get_script_interp(
            os.path.join(_TEST_DATA_DIR, 'hello.pl'), cygwin_path))

    def test_hexify(self):
        self.assertEqual('61 7a 41 5a 30 39 20 09 0d 0a 00 ff',
                         util.hexify('azAZ09 \t\r\n\x00\xff'))


class RepeatedXorMaskerTest(unittest.TestCase):
    """A unittest for RepeatedXorMasker class."""

    def test_mask(self):
        # Sample input e6,97,a5 is U+65e5 in UTF-8
        masker = util.RepeatedXorMasker('\xff\xff\xff')
        result = masker.mask('\xe6\x97\xa5')
        self.assertEqual('\x19\x68\x5a', result)

        masker = util.RepeatedXorMasker('\x00\x00\x00')
        result = masker.mask('\xe6\x97\xa5')
        self.assertEqual('\xe6\x97\xa5', result)

        masker = util.RepeatedXorMasker('\xe6\x97\xa5')
        result = masker.mask('\xe6\x97\xa5')
        self.assertEqual('\x00\x00\x00', result)

    def test_mask_twice(self):
        masker = util.RepeatedXorMasker('\x00\x7f\xff')
        # mask[0], mask[1], ... will be used.
        result = masker.mask('\x00\x00\x00\x00\x00')
        self.assertEqual('\x00\x7f\xff\x00\x7f', result)
        # mask[2], mask[0], ... will be used for the next call.
        result = masker.mask('\x00\x00\x00\x00\x00')
        self.assertEqual('\xff\x00\x7f\xff\x00', result)


if __name__ == '__main__':
    unittest.main()


# vi:sts=4 sw=4 et
