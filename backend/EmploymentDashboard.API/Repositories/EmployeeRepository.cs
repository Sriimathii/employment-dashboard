using EmploymentDashboard.API.Data;
using EmploymentDashboard.API.DTOs.Common;
using EmploymentDashboard.API.DTOs.Employee;
using EmploymentDashboard.API.Helpers;
using EmploymentDashboard.API.Models;
using EmploymentDashboard.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EmploymentDashboard.API.Repositories;

public class EmployeeRepository(AppDbContext db) : IEmployeeRepository
{
    private IQueryable<Employee> Base =>
        db.Employees
          .Include(e => e.Department)
          .Include(e => e.Role)
          .Where(e => !e.IsDeleted);

    public async Task<PagedResultDto<EmployeeDto>> GetPagedAsync(EmployeeFilterDto f)
    {
        var q = Base.AsQueryable();

        if (!string.IsNullOrEmpty(f.Search))
            q = q.Where(e => e.FullName.Contains(f.Search) || e.Email.Contains(f.Search));
        if (!string.IsNullOrEmpty(f.EmployeeCode))
            q = q.Where(e => e.EmployeeCode.Contains(f.EmployeeCode));
        if (f.DepartmentId.HasValue)
            q = q.Where(e => e.DepartmentId == f.DepartmentId);
        if (!string.IsNullOrEmpty(f.Status))
            q = q.Where(e => e.Status == f.Status);

        q = f.SortBy?.ToLower() switch {
            "employeecode" => f.SortDir == "desc" ? q.OrderByDescending(e => e.EmployeeCode) : q.OrderBy(e => e.EmployeeCode),
            "email"        => f.SortDir == "desc" ? q.OrderByDescending(e => e.Email)        : q.OrderBy(e => e.Email),
            "joiningdate"  => f.SortDir == "desc" ? q.OrderByDescending(e => e.JoiningDate)  : q.OrderBy(e => e.JoiningDate),
            _              => f.SortDir == "desc" ? q.OrderByDescending(e => e.FullName)      : q.OrderBy(e => e.FullName)
        };

        var total = await q.CountAsync();
        var data  = await q.Skip((f.Page - 1) * f.PageSize).Take(f.PageSize)
                           .Select(e => ToDto(e)).ToListAsync();

        return new PagedResultDto<EmployeeDto> {
            Data = data, TotalCount = total, Page = f.Page, PageSize = f.PageSize
        };
    }

    public async Task<EmployeeDto?> GetByIdAsync(int id)
    {
        var e = await Base.FirstOrDefaultAsync(x => x.EmployeeId == id);
        return e == null ? null : ToDto(e);
    }

    // FIX 3: Auto-generate the next EMP code from the highest existing one
    public async Task<string> GenerateNextCodeAsync()
    {
        // Get all existing codes that match EMPxxx pattern
        var codes = await db.Employees
            .Where(e => e.EmployeeCode.StartsWith("EMP"))
            .Select(e => e.EmployeeCode)
            .ToListAsync();

        int maxNum = 0;
        foreach (var code in codes)
        {
            if (int.TryParse(code.Substring(3), out int num) && num > maxNum)
                maxNum = num;
        }
        // Next number, zero-padded to 3 digits (EMP037, EMP038, ...)
        return $"EMP{(maxNum + 1):D3}";
    }

    public async Task<EmployeeDto> CreateAsync(CreateEmployeeDto dto)
    {
        // FIX 3: If no code provided (or empty), auto-generate it
        if (string.IsNullOrWhiteSpace(dto.EmployeeCode))
            dto.EmployeeCode = await GenerateNextCodeAsync();

        var emp = new Employee {
            EmployeeCode = dto.EmployeeCode, FullName     = dto.FullName,
            PhoneNumber  = dto.PhoneNumber,  Email        = dto.Email,
            Salary       = dto.Salary,       DepartmentId = dto.DepartmentId,
            RoleId       = dto.RoleId,       Status       = dto.Status,
            JoiningDate  = dto.JoiningDate,  ProfileImage = dto.ProfileImage,
            Address      = dto.Address,      IsDeleted    = false,
            IsInactive   = false
        };
        db.Employees.Add(emp);
        await db.SaveChangesAsync();

        if (!string.IsNullOrEmpty(dto.Username) && !string.IsNullOrEmpty(dto.Password)) {
            db.Users.Add(new User {
                Username     = dto.Username,
                PasswordHash = PasswordHasher.Hash(dto.Password),
                RoleId       = dto.RoleId ?? 3,
                EmployeeId   = emp.EmployeeId,
                IsActive     = true
            });
            await db.SaveChangesAsync();
        }
        return (await GetByIdAsync(emp.EmployeeId))!;
    }

    public async Task<bool> UpdateAsync(int id, UpdateEmployeeDto dto)
    {
        var emp = await db.Employees.FirstOrDefaultAsync(e => e.EmployeeId == id && !e.IsDeleted);
        if (emp == null) return false;
        if (dto.FullName     != null) emp.FullName     = dto.FullName;
        if (dto.PhoneNumber  != null) emp.PhoneNumber  = dto.PhoneNumber;
        if (dto.Email        != null) emp.Email        = dto.Email;
        if (dto.Salary       != null) emp.Salary       = dto.Salary;
        if (dto.DepartmentId != null) emp.DepartmentId = dto.DepartmentId;
        if (dto.RoleId       != null) emp.RoleId       = dto.RoleId;
        if (dto.Status       != null) emp.Status       = dto.Status;
        if (dto.ProfileImage != null) emp.ProfileImage = dto.ProfileImage;
        if (dto.Address      != null) emp.Address      = dto.Address;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task UpdatePhotoAsync(int id, string url)
    {
        var emp = await db.Employees.FirstOrDefaultAsync(e => e.EmployeeId == id && !e.IsDeleted);
        if (emp != null) { emp.ProfileImage = url; await db.SaveChangesAsync(); }
    }

    public async Task<bool> SoftDeleteAsync(int employeeId, int updatedBy)
    {
        var employee = await db.Employees
            .FirstOrDefaultAsync(e => e.EmployeeId == employeeId);

        if (employee == null)
            return false;

        // Mark employee as soft-deleted
        employee.IsDeleted  = true;
        employee.IsInactive = true;
        employee.Status     = "Inactive";
        employee.DeletedAt  = DateTime.UtcNow;

        // Also deactivate any linked User account so User Management reflects the change
        var linkedUser = await db.Users.FirstOrDefaultAsync(u => u.EmployeeId == employeeId);
        if (linkedUser != null)
        {
            linkedUser.IsActive = false;
        }

        await db.SaveChangesAsync();
        return true;
    }

    private static EmployeeDto ToDto(Employee e) => new() {
        EmployeeId     = e.EmployeeId,   EmployeeCode   = e.EmployeeCode,
        FullName       = e.FullName,     PhoneNumber    = e.PhoneNumber,
        Email          = e.Email,        Salary         = e.Salary,
        DepartmentId   = e.DepartmentId, DepartmentName = e.Department?.DepartmentName,
        RoleId         = e.RoleId,       RoleName       = e.Role?.RoleName,
        Status         = e.Status,       JoiningDate    = e.JoiningDate,
        ProfileImage   = e.ProfileImage, Address        = e.Address,
        IsInactive     = e.IsInactive
    };
}