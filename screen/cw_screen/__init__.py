# SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
"""The screen: the Combat Writing plugin's full-screen terminal interface.

It renders; it never computes the run. Every number it shows is the output of the plugin's
own render-state.js, read from the run folder it watches. It writes nothing inside a run
folder, calls no provider and reads no key.
"""

__version__ = "0.1.0"
MOTTO = "Reading is Peace. Writing is War."
STATE_SCHEMA = 1
