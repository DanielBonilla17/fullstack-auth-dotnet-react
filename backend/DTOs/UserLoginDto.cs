using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;


public class UserLoginDto
{
    [Required(ErrorMessage = "O nome de usuário é obrigatório")]
    [EmailAddress(ErrorMessage = "O nome de usuário inválido")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "A senha é obrigatória")]
    [DataType(DataType.Password, ErrorMessage = "A senha inválida")]
    public string Password { get; set; } = string.Empty;
}