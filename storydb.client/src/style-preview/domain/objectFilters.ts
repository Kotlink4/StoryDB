import type { StoryObject } from '../../types'

export type ObjectCardsFilter = 'all' | 'active'

export const getFilteredStoryObjects = (objects: StoryObject[], filter: ObjectCardsFilter) => {
  if (filter === 'active') {
    return objects.filter((storyObject) => storyObject.currentStatus?.trim())
  }

  return objects
}
