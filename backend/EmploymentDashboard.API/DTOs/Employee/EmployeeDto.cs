namespace EmploymentDashboard.API.DTOs.Employee;
 
public class EmployeeDto
{
    public int EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string Email { get; set; } = string.Empty;
    public decimal? Salary { get; set; }
    public int? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public int? RoleId { get; set; }
    public string? RoleName { get; set; }
    public string Status { get; set; } = "Active";
    public DateOnly JoiningDate { get; set; }
    public string? ProfileImage { get; set; }
    public string? Address { get; set; }
    public bool IsInactive { get; set; }
}
 
public class CreateEmployeeDto
{
    public string EmployeeCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string Email { get; set; } = string.Empty;
    public decimal? Salary { get; set; }
    public int? DepartmentId { get; set; }
    public int? RoleId { get; set; }
    public string Status { get; set; } = "Active";
    public DateOnly JoiningDate { get; set; }
    public string? ProfileImage { get; set; }
    public string? Address { get; set; }
    // Auto-create user account
    public string? Username { get; set; }
    public string? Password { get; set; }
}
 
public class UpdateEmployeeDto
{
    public string? FullName { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public decimal? Salary { get; set; }
    public int? DepartmentId { get; set; }
    public int? RoleId { get; set; }
    public string? Status { get; set; }
    public string? ProfileImage { get; set; }
    public string? Address { get; set; }
}
 
public class EmployeeFilterDto
{
    public string? Search { get; set; }
    public string? EmployeeCode { get; set; }
    public int? DepartmentId { get; set; }
    public string? Status { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string SortBy { get; set; } = "FullName";
    public string SortDir { get; set; } = "asc";
}