using EmploymentDashboard.API.Data;
using EmploymentDashboard.API.DTOs.Auth;
using EmploymentDashboard.API.Helpers;
using EmploymentDashboard.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EmploymentDashboard.API.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext db;
    private readonly IJwtService jwt;

    public AuthService(AppDbContext context, IJwtService jwtService)
    {
        db  = context;
        jwt = jwtService;
    }

    public async Task<LoginResponseDto?> LoginAsync(LoginDto dto)
    {
        // FEATURE 3: Allow inactive users to log in (read-only)
        var user = await db.Users
            .Include(u => u.Role)
            .Include(u => u.Employee)
            .FirstOrDefaultAsync(u => u.Username == dto.Username);

        if (user == null) return null;

        var validPassword = PasswordHasher.Verify(dto.Password, user.PasswordHash);
        if (!validPassword) return null;

        // Block completely deleted accounts (not inactive — inactive can log in read-only)
        if (!user.IsActive && (user.Employee == null || !user.Employee.IsInactive))
            return null;

        int? employeeId  = user.Employee?.EmployeeId;
        bool isInactive  = user.Employee?.IsInactive ?? false;
        bool isReadOnly  = isInactive || !user.IsActive;

        var token = jwt.GenerateToken(
            user.UserId,
            user.Username,
            user.Role.RoleName,
            employeeId
        );

        return new LoginResponseDto(
            Token:        token,
            Username:     user.Username,
            Role:         user.Role.RoleName,
            UserId:       user.UserId,
            EmployeeId:   employeeId,
            FullName:     user.Employee?.FullName ?? user.Username,
            ProfileImage: user.Employee?.ProfileImage,
            ExpiresAt:    DateTime.UtcNow.AddHours(8),
            IsInactive:   isInactive,
            IsReadOnly:   isReadOnly
        );
    }

    public async Task<string?> ForgotPasswordAsync(string email)
    {
        var employee = await db.Employees.FirstOrDefaultAsync(e => e.Email == email);
        if (employee == null) return null;
        var user = await db.Users.FirstOrDefaultAsync(u => u.EmployeeId == employee.EmployeeId);
        if (user == null) return null;
        var tempPassword = "Temp@" + Random.Shared.Next(1000, 9999);
        user.PasswordHash = PasswordHasher.Hash(tempPassword);
        await db.SaveChangesAsync();
        return tempPassword;
    }

    public async Task<bool> ChangePasswordAsync(int userId, ChangePasswordDto dto)
    {
        var user = await db.Users.FindAsync(userId);
        if (user == null) return false;
        if (!PasswordHasher.Verify(dto.CurrentPassword, user.PasswordHash)) return false;
        user.PasswordHash = PasswordHasher.Hash(dto.NewPassword);
        await db.SaveChangesAsync();
        return true;
    }
}