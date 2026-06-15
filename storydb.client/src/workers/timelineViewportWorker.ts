import {
  buildTimelineViewportModel,
  type TimelineViewportModelRequest,
} from '../timeline/timelineViewportModel'

type TimelineViewportWorkerRequest = {
  payload: TimelineViewportModelRequest
  requestId: number
}

self.onmessage = (event: MessageEvent<TimelineViewportWorkerRequest>) => {
  const { payload, requestId } = event.data
  const model = buildTimelineViewportModel(payload)

  self.postMessage({
    model,
    requestId,
  })
}
