namespace StoryDB.Api.Data.Entities;

public class ObjectOwnership
{
    public int OwnerCharacterId { get; set; }
    public int ItemObjectId { get; set; }
    public int SortOrder { get; set; }

    public StoryObject? OwnerCharacter { get; set; }
    public StoryObject? ItemObject { get; set; }
}
