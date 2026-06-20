using EmploymentDashboard.API.DTOs.Common;
using EmploymentDashboard.API.DTOs.Employee;
namespace EmploymentDashboard.API.Repositories.Interfaces;
 
public interface IEmployeeRepository
{
    Task<PagedResultDto<EmployeeDto>> GetPagedAsync(EmployeeFilterDto filter);
    Task<EmployeeDto?> GetByIdAsync(int id);
    Task<EmployeeDto> CreateAsync(CreateEmployeeDto dto);
    Task<bool> UpdateAsync(int id, UpdateEmployeeDto dto);
    Task<bool> SoftDeleteAsync(int id, int deletedByUserId);
    Task UpdatePhotoAsync(int id, string url);
     Task<string>       GenerateNextCodeAsync();
}