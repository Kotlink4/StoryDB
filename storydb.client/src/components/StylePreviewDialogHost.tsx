import type { ComponentProps } from 'react'

import { StylePreviewAttributeDialogs } from './StylePreviewAttributeDialogs'
import { StylePreviewCatalogDialogs } from './StylePreviewCatalogDialogs'
import { StylePreviewDetailDialogs } from './StylePreviewDetailDialogs'
import { StylePreviewObjectDialogs } from './StylePreviewObjectDialogs'
import { StylePreviewProjectDialogs } from './StylePreviewProjectDialogs'
import { StylePreviewTimelineDialogs } from './StylePreviewTimelineDialogs'

export function StylePreviewDialogHost({
  attributeDialogsProps,
  catalogDialogsProps,
  detailDialogsProps,
  objectDialogsProps,
  projectDialogsProps,
  timelineDialogsProps,
}: {
  attributeDialogsProps: ComponentProps<typeof StylePreviewAttributeDialogs>
  catalogDialogsProps: ComponentProps<typeof StylePreviewCatalogDialogs>
  detailDialogsProps: ComponentProps<typeof StylePreviewDetailDialogs>
  objectDialogsProps: ComponentProps<typeof StylePreviewObjectDialogs>
  projectDialogsProps: ComponentProps<typeof StylePreviewProjectDialogs>
  timelineDialogsProps: ComponentProps<typeof StylePreviewTimelineDialogs>
}) {
  return (
    <>
      <StylePreviewProjectDialogs {...projectDialogsProps} />
      <StylePreviewObjectDialogs {...objectDialogsProps} />
      <StylePreviewDetailDialogs {...detailDialogsProps} />
      <StylePreviewAttributeDialogs {...attributeDialogsProps} />
      <StylePreviewCatalogDialogs {...catalogDialogsProps} />
      <StylePreviewTimelineDialogs {...timelineDialogsProps} />
    </>
  )
}
