using StoryDB.Api.Contracts.Objects;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Services.Objects;

public partial class ObjectService
{
    private void SyncCharacterRelationships(
        StoryObject storyObject,
        string typeKey,
        IReadOnlyList<CharacterRelationshipSelection> requestedRelationships)
    {
        IReadOnlyList<CharacterRelationshipSelection> normalizedRelationships =
            typeKey == "characters" ? requestedRelationships : [];
        var existingRelationships = storyObject.OutgoingCharacterRelationships
            .Concat(storyObject.IncomingCharacterRelationships)
            .DistinctBy(relationship => relationship.Id)
            .OrderBy(relationship => relationship.SortOrder)
            .ThenBy(relationship => relationship.Id)
            .ToList();
        var requestedExistingIds = normalizedRelationships
            .Select(relationship => relationship.Id)
            .OfType<int>()
            .ToHashSet();

        foreach (var existingRelationship in existingRelationships
            .Where(relationship => !requestedExistingIds.Contains(relationship.Id))
            .ToList())
        {
            dbContext.CharacterRelationships.Remove(existingRelationship);
            storyObject.OutgoingCharacterRelationships.Remove(existingRelationship);
            storyObject.IncomingCharacterRelationships.Remove(existingRelationship);
        }

        for (var index = 0; index < normalizedRelationships.Count; index++)
        {
            var requestedRelationship = normalizedRelationships[index];
            var existingRelationship = requestedRelationship.Id is null
                ? null
                : existingRelationships.FirstOrDefault(relationship => relationship.Id == requestedRelationship.Id);
            var sourceCharacterId = requestedRelationship.SourceCharacterId > 0
                ? requestedRelationship.SourceCharacterId
                : storyObject.Id;

            if (existingRelationship is null)
            {
                dbContext.CharacterRelationships.Add(new CharacterRelationship
                {
                    SourceCharacterId = sourceCharacterId,
                    TargetCharacterId = requestedRelationship.TargetCharacterId,
                    RelationType = requestedRelationship.RelationType,
                    Strength = requestedRelationship.Strength,
                    Tension = requestedRelationship.Tension,
                    IsBidirectional = requestedRelationship.IsBidirectional,
                    Description = requestedRelationship.Description,
                    SortOrder = index,
                });
                continue;
            }

            existingRelationship.SourceCharacterId = sourceCharacterId;
            existingRelationship.TargetCharacterId = requestedRelationship.TargetCharacterId;
            existingRelationship.RelationType = requestedRelationship.RelationType;
            existingRelationship.Strength = requestedRelationship.Strength;
            existingRelationship.Tension = requestedRelationship.Tension;
            existingRelationship.IsBidirectional = requestedRelationship.IsBidirectional;
            existingRelationship.Description = requestedRelationship.Description;
            existingRelationship.SortOrder = index;
        }
    }
}
