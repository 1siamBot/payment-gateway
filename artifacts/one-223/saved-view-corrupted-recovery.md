# Saved View Corrupted Payload Recovery

- Corrupted query payload sample: `{"version":999,"views":[]}`
- Corrupted storage payload sample: `{bad-json`
- Expected recovery behavior:
  - Saved views fall back to default empty state.
  - Recovery message is shown in the saved views panel.
  - `Reset Saved Views To Safe Defaults` clears payload and keeps query state safe.
