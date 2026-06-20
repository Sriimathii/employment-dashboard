namespace EmploymentDashboard.API.Models;

public class Feedback
{
    public int      FeedbackId   { get; set; }
    public int      UserId       { get; set; }
    public User     User         { get; set; } = null!;
    public string   Title        { get; set; } = string.Empty;
    public string   Description  { get; set; } = string.Empty;
    // Category: Suggestion | Complaint | Feature Request | General Feedback
    public string   Category     { get; set; } = "General Feedback";
    // Status: New | Reviewed | Resolved
    public string   Status       { get; set; } = "New";
    public string?  AdminReply   { get; set; }
    public DateTime SubmittedAt  { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt  { get; set; }
}