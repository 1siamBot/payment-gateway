# Saved View Apply State

- Saved view: `Open Queue`
- Action: Apply + Pin Default
- Expected query fields:
  - `exceptionStatus=open`
  - `exceptionPageSize=20`
  - `exceptionSavedViews=<serialized v1 payload>`
- Expected UI behavior:
  - Exception list reloads with matching filters.
  - Active saved view row is highlighted.
