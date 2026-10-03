using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using backend.DTOs;
using Microsoft.IdentityModel.Tokens;

namespace backend.Services;

public interface ITokenService
{
    AuthResponseDto GenerateToken(string username);

}

public class TokenService : ITokenService

{
    private readonly IConfiguration _config;

    public TokenService(IConfiguration config)
    {
        _config = config;

    }

    public AuthResponseDto GenerateToken(string username)
    {
        var jwtSettings = _config.GetSection("Jwt");
        var secretKey= jwtSettings["Key"] ?? throw new InvalidOperationException("Chave JWT não configurada");

        var issuer = jwtSettings["Issuer"];
        var audience = jwtSettings["Audience"];

        
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));

        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, username),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Name, username)
        };

        var expiration= DateTime.UtcNow.AddHours(2);

        var token= new JwtSecurityToken(
            issuer:issuer,
            audience:audience,
            claims:claims,
            expires: expiration,
            signingCredentials:creds
        );

        return new AuthResponseDto
        {
            Token = new JwtSecurityTokenHandler().WriteToken(token),
            Username = username,
            Expiration = expiration
        };
          
    }

}