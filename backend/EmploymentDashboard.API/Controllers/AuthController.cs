using EmploymentDashboard.API.Data;
using EmploymentDashboard.API.DTOs.Auth;
using EmploymentDashboard.API.Helpers;
using EmploymentDashboard.API.Models;
using EmploymentDashboard.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EmploymentDashboard.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IAuthService authService, AppDbContext db) : ControllerBase
{
    // POST /api/auth/login
    // FIX: Always return a flat LoginResponseDto — never wrap in { result, isReadOnly }
    // Inactive users get a valid token + isReadOnly=true in the flat response
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var result = await authService.LoginAsync(dto);
        if (result == null)
            return Unauthorized(new { message = "Invalid username or password." });

        // result already contains IsInactive + IsReadOnly set by AuthService
        // Just return it flat — the frontend reads result.token, result.isReadOnly, etc.
        return Ok(result);
    }

    // POST /api/auth/forgot-password
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email))
            return BadRequest(new { message = "Email is required." });

        var emp = await db.Employees
            .FirstOrDefaultAsync(e => e.Email.ToLower() == dto.Email.ToLower());
        if (emp == null)
            return Ok(new { message = "If this email is registered, a reset link has been sent." });

        var user = await db.Users.FirstOrDefaultAsync(u => u.EmployeeId == emp.EmployeeId);
        if (user == null)
            return Ok(new { message = "If this email is registered, a reset link has been sent." });

        var tempPassword = GenerateTempPassword();
        user.PasswordHash     = PasswordHasher.Hash(tempPassword);
        user.ResetToken       = null;
        user.ResetTokenExpiry = null;
        await db.SaveChangesAsync();

        return Ok(new {
            message      = "Password reset successful.",
            tempPassword,
            username     = user.Username,
            hint         = "Use this temporary password to log in, then change it from Settings."
        });
    }

    // POST /api/auth/reset-password
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        var user = await db.Users
            .FirstOrDefaultAsync(u => u.ResetToken == dto.Token &&
                                      u.ResetTokenExpiry > DateTime.UtcNow);
        if (user == null)
            return BadRequest(new { message = "Reset link is invalid or has expired." });

        if (dto.NewPassword.Length < 8)
            return BadRequest(new { message = "Password must be at least 8 characters." });

        user.PasswordHash     = PasswordHasher.Hash(dto.NewPassword);
        user.ResetToken       = null;
        user.ResetTokenExpiry = null;
        await db.SaveChangesAsync();

        return Ok(new { message = "Password has been reset successfully. You can now log in." });
    }

    // POST /api/auth/change-password
    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        var userId = int.Parse(User.FindFirst("userId")!.Value);
        var user   = await db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        if (!PasswordHasher.Verify(dto.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "Current password is incorrect." });

        if (dto.NewPassword.Length < 8)
            return BadRequest(new { message = "New password must be at least 8 characters." });

        user.PasswordHash = PasswordHasher.Hash(dto.NewPassword);
        await db.SaveChangesAsync();
        return Ok(new { message = "Password changed successfully." });
    }

    private static string GenerateTempPassword()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#";
        var rng = new Random();
        return new string(Enumerable.Range(0, 10).Select(_ => chars[rng.Next(chars.Length)]).ToArray());
    }
}