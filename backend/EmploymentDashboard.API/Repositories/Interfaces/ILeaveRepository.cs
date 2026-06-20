using EmploymentDashboard.API.DTOs.Leave;

namespace EmploymentDashboard.API.Repositories.Interfaces;

public interface ILeaveRepository
{
    Task<(IEnumerable<LeaveRequestDto> Data, int Total)> GetAllAsync(
        string? status, int page, int pageSize,
        int? departmentId = null,
        int? excludeEmpId = null);        // excludes manager's own leaves from team view

    Task<IEnumerable<LeaveRequestDto>> GetByEmployeeAsync(int empId);
    Task<(LeaveRequestDto? Leave, string? Error)> CreateAsync(int empId, CreateLeaveDto dto);
    Task<bool>   ApproveAsync(int leaveId, int userId, ApproveLeaveDto dto);
    Task<bool>   CancelAsync(int leaveId, int empId);
    Task<LeaveBalanceDto> GetBalanceAsync(int empId);
    Task<bool>   SoftDeleteAsync(int leaveId, int updatedBy);
}