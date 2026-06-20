using EmploymentDashboard.API.DTOs.Auth;
namespace EmploymentDashboard.API.Services.Interfaces;
 
public interface IAuthService
{
    Task<LoginResponseDto?> LoginAsync(LoginDto dto);
    Task<string?> ForgotPasswordAsync(string email);
    Task<bool> ChangePasswordAsync(int userId, ChangePasswordDto dto);
}
 
public interface IJwtService
{
    string GenerateToken(int userId, string username, string role, int? employeeId);
}
 
public interface IAuditLogService
{
    Task LogAsync(string action, int userId, string? entityType = null, int? entityId = null,
                  object? oldValues = null, object? newValues = null);
}