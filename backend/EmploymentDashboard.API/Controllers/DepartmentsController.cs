using EmploymentDashboard.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
 
namespace EmploymentDashboard.API.Controllers;
 
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DepartmentsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var depts = await db.Departments
            .OrderBy(d => d.DepartmentName)
            .Select(d => new {
                d.DepartmentId,
                d.DepartmentName,
                EmployeeCount = d.Employees.Count(e => e.Status == "Active")
            }).ToListAsync();
        return Ok(depts);
    }
 
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var dept = await db.Departments
            .Include(d => d.Employees)
            .FirstOrDefaultAsync(d => d.DepartmentId == id);
        return dept == null ? NotFound() : Ok(dept);
    }
 
    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create([FromBody] CreateDeptRequest req)
    {
        if (await db.Departments.AnyAsync(d => d.DepartmentName == req.Name))
            return Conflict(new { message = "Department already exists." });
        var dept = new EmploymentDashboard.API.Models.Department { DepartmentName = req.Name };
        db.Departments.Add(dept);
        await db.SaveChangesAsync();
        return Created("", dept);
    }
 
    [HttpPut("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateDeptRequest req)
    {
        var dept = await db.Departments.FindAsync(id);
        if (dept == null) return NotFound();
        dept.DepartmentName = req.Name;
        await db.SaveChangesAsync();
        return Ok(dept);
    }
 
    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(int id)
    {
        var dept = await db.Departments.FindAsync(id);
        if (dept == null) return NotFound();
        var hasEmployees = await db.Employees.AnyAsync(e => e.DepartmentId == id);
        if (hasEmployees)
            return BadRequest(new { message = "Cannot delete department with employees assigned." });
        db.Departments.Remove(dept);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
 
public record CreateDeptRequest(string Name);