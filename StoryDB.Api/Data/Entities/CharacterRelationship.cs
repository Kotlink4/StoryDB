namespace StoryDB.Api.Data.Entities;

public class CharacterRelationship
{
    public int Id { get; set; }
    public int SourceCharacterId { get; set; }
    public int TargetCharacterId { get; set; }
    public required string RelationType { get; set; }
    public int Strength { get; set; }
    public int Tension { get; set; }
    public bool IsBidirectional { get; set; }
    public string? Description { get; set; }
    public int SortOrder { get; set; }

    public StoryObject? SourceCharacter { get; set; }
    public StoryObject? TargetCharacter { get; set; }
}
