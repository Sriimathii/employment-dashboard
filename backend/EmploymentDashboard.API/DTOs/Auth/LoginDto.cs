namespace EmploymentDashboard.API.DTOs.Auth;
 
public record LoginDto(string Username, string Password);
 
public record LoginResponseDto(
    string    Token,
    string    Username,
    string    Role,
    int       UserId,
    int?      EmployeeId,
    string    FullName,
    string?   ProfileImage,
    DateTime  ExpiresAt,
    bool      IsInactive = false,
    bool      IsReadOnly = false
);
 
public record ForgotPasswordDto(string Email);
public record ResetPasswordDto(string Token, string NewPassword);
public record ChangePasswordDto(string CurrentPassword, string NewPassword);