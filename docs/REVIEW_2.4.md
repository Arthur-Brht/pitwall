# 2.4 session dashboard

This preview implements the validated one-circuit, one-run design. Dashboard and Overview merge into one home screen. A collapsible sidebar holds the circuit, date, start/end times and separate buffers (15 minutes each by default). Saved sessions can be selected; the automatic fallback starts now and covers three hours.

The first screen keeps rain timing/intensity, hourly source agreement, temperature, wind and gusts. One model timeline marks the run and buffers next to recent radar. Native regional rows retain real 15-minute intervals. Hourly rows remain hourly. Humidity, charts and methods are available on demand. Models defaults to the run plus buffers.

The hourly timing group is the largest overlapping group, rather than the earliest outlier. Regional signals remain separate. Rain outside the actual run is not included in run agreement. Partial-hour ensemble estimates disclose their surrounding whole-hour bounds. Clearing requires contiguous known dry evidence. The change line compares earlier saved captures for exactly the same hours and sources.

The app installs as Pitwall 2.4 Preview with a distinct application ID, profile and port (4184). It can coexist with Pitwall 2.3 Preview (4183). No user data are migrated automatically. Backups can copy plans and preferences; history remains separate. Native CI uses a checksum-pinned 2.3 reference for production-default coexistence checks.

Validation includes boundary, buffer, midnight/DST, missing-rain, timing-cluster and snapshot-comparability tests; responsive browser flows; both appearance modes and accessibility checks; packaged launch/reopen, native backup flows, and Windows installer lifecycle checks on disposable CI runners. Screenshots use explicitly labelled synthetic weather. Passing software checks does not establish forecast accuracy or signing/notarization.
