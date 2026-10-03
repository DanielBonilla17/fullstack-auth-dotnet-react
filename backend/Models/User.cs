using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class User {
    [Key]
    public int Id{get;set;}

    [Required]
    [EmailAddress]
    [MaxLength(150)]
    public string Email {get; set;} = string.Empty;

    [Required]
    public string PasswordHash {get; set;} = string.Empty;
    
    public DateTime CreatedAt {get;set;} = DateTime.UtcNow;

    
}