namespace backend.DTOs;

public class AuthResponseDto
{
    public string Token { get; set;}= string.Empty;
    public string Username {get;set;} =string.Empty;
    public DateTime Expiration { get; set; }
}