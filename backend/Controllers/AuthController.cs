using backend.DTOs;
using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]

public class AuthController:ControllerBase{

    private readonly AppDbContext _context;
    private readonly ITokenService _tokenService;

    public AuthController(AppDbContext context,ITokenService tokenService)
    {    
        _context=context;
        _tokenService=tokenService;
    }

[HttpPost("register")]
public async Task<IActionResult> Register([FromBody] UserLoginDto registerDto)
{
    if(!ModelState.IsValid) 
    return BadRequest(ModelState);

    var userExists =await _context.Users.AnyAsync(u=> u.Email == registerDto.Username);
    if(userExists)
    return BadRequest(new{message ="Email ja cadastrado"});

    var passwordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password);

    var newUser = new User{
         Email=registerDto.Username,
         PasswordHash =passwordHash,
         CreatedAt = DateTime.UtcNow
    };

    _context.Users.Add(newUser);
    await _context.SaveChangesAsync();

    var authResponse = _tokenService.GenerateToken(newUser.Email);

    return StatusCode(201, authResponse);

}

   

[HttpPost("login")]
public async Task<IActionResult> Login([FromBody]UserLoginDto loginDto)
{
    if (!ModelState.IsValid)
    {
        return BadRequest(ModelState);
    }
    var user= await _context.Users.FirstOrDefaultAsync(u=> u.Email == loginDto.Username);
    if(user==null)
    return Unauthorized(new{message="Email ou senha invalidos"});


bool isPasswordValid = BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash);

if (!isPasswordValid) return Unauthorized(new{message="Email ou senha invalidos"});

var authResponse = _tokenService.GenerateToken(user.Email);

return Ok(authResponse);

}

[Authorize]
[HttpGet("me")]
public IActionResult GetProfile()
{
    var email= User.Identity?.Name;
    return Ok(new
    {
        message = "Acesso autorizado com sucesso!",
        email= email,
        timestamp= DateTime.UtcNow
    });
}


}

