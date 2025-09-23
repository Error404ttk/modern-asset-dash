-- Ensure profile.department values align with departments table.
update profiles
set department = null
where department is not null
  and trim(department) <> ''
  and trim(department) not in (
    select name from departments where active = true
  );

-- Trim whitespace from remaining department names.
update profiles
set department = trim(department)
where department is not null;
