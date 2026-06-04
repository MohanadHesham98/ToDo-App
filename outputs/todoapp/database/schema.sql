-- Configure this database name to match SQL_DATABASE in your environment.
-- For automated migrations, replace this bootstrap file with your migration tool of choice.
IF DB_ID('TaskFlowTodo') IS NULL
BEGIN
  CREATE DATABASE TaskFlowTodo;
END
GO

USE TaskFlowTodo;
GO

IF OBJECT_ID('dbo.Tasks', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Tasks (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
    Title NVARCHAR(120) NOT NULL,
    Notes NVARCHAR(500) NULL,
    DueDate DATE NULL,
    Priority NVARCHAR(20) NOT NULL DEFAULT 'medium',
    Category NVARCHAR(60) NOT NULL DEFAULT 'Inbox',
    Completed BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END
GO
