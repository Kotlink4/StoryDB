namespace StoryDB.Api.Data.Entities;

public class RelationGraphLayoutItem
{
    public int Id { get; set; }
    public int RelationGraphLayoutId { get; set; }
    public int StoryObjectId { get; set; }
    public decimal X { get; set; }
    public decimal Y { get; set; }
    public decimal Width { get; set; }
    public decimal Height { get; set; }
    public bool IsPinned { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public RelationGraphLayout? RelationGraphLayout { get; set; }
}
