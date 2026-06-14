import type { Dispatch, SetStateAction } from 'react'

import { getObjectFullName } from '../style-preview/domain/objectDisplay'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { RelationLinkDraft, StoryObject } from '../types'
import { PreviewDialog } from './StylePreviewPrimitives'

type RelationLinkDialogProps = {
  characters: StoryObject[]
  draft: RelationLinkDraft
  ui: PreviewText
  onCancel: () => void
  onDraftChange: Dispatch<SetStateAction<RelationLinkDraft>>
  onSave: () => void
}

export function RelationLinkDialog({
  characters,
  draft,
  ui,
  onCancel,
  onDraftChange,
  onSave,
}: RelationLinkDialogProps) {
  return (
    <PreviewDialog title={ui.linkCharacters} onClose={onCancel}>
      <div className="sp-form">
        <label>
          {ui.relationSourceCharacter}
          <select
            value={draft.sourceCharacterId}
            onChange={(event) =>
              onDraftChange((currentDraft) => ({
                ...currentDraft,
                sourceCharacterId: event.target.value,
                targetCharacterId:
                  event.target.value === currentDraft.targetCharacterId ? '' : currentDraft.targetCharacterId,
              }))
            }
          >
            <option value="">{ui.characters}</option>
            {characters.map((character) => (
              <option key={character.id} value={character.id}>
                {getObjectFullName(character)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {ui.relationTargetCharacter}
          <select
            value={draft.targetCharacterId}
            onChange={(event) =>
              onDraftChange((currentDraft) => ({ ...currentDraft, targetCharacterId: event.target.value }))
            }
          >
            <option value="">{ui.characters}</option>
            {characters.map((character) => (
              <option key={character.id} value={character.id} disabled={String(character.id) === draft.sourceCharacterId}>
                {getObjectFullName(character)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {ui.relationType}
          <input
            placeholder={ui.relationTypePlaceholder}
            value={draft.relationType}
            onChange={(event) => onDraftChange((currentDraft) => ({ ...currentDraft, relationType: event.target.value }))}
          />
        </label>
        <label>
          {ui.relationStrength}
          <input
            max={100}
            min={0}
            type="number"
            value={draft.strength}
            onChange={(event) => onDraftChange((currentDraft) => ({ ...currentDraft, strength: event.target.value }))}
          />
        </label>
        <label>
          {ui.relationTension}
          <input
            max={100}
            min={0}
            type="number"
            value={draft.tension}
            onChange={(event) => onDraftChange((currentDraft) => ({ ...currentDraft, tension: event.target.value }))}
          />
        </label>
        <label className="sp-checkline wide">
          <input
            checked={draft.isBidirectional}
            type="checkbox"
            onChange={(event) =>
              onDraftChange((currentDraft) => ({ ...currentDraft, isBidirectional: event.target.checked }))
            }
          />
          {ui.relationBidirectional}
        </label>
        <label className="wide">
          {ui.relationDescription}
          <textarea
            value={draft.description}
            onChange={(event) => onDraftChange((currentDraft) => ({ ...currentDraft, description: event.target.value }))}
          />
        </label>
        <div className="sp-dialog-actions">
          <button className="sp-button" type="button" onClick={onCancel}>
            {ui.cancel}
          </button>
          <button className="sp-button primary" type="button" onClick={onSave}>
            {ui.create}
          </button>
        </div>
      </div>
    </PreviewDialog>
  )
}
