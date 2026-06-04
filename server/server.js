const cors = require("cors");
const express = require("express");
const path = require("path");
const sql = require("mssql");
const config = require("./config");

const app = express();

const dbConfig = {
  server: config.database.server,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  connectionTimeout: config.database.connectionTimeout,
  requestTimeout: config.database.requestTimeout,
  options: {
    encrypt: config.database.encrypt,
    trustServerCertificate: config.database.trustServerCertificate,
  },
};

const corsOptions = config.corsOrigin ? { origin: config.corsOrigin } : undefined;

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, "..")));

let poolPromise;

function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(dbConfig);
  }
  return poolPromise;
}

function mapTask(row) {
  return {
    id: row.Id,
    title: row.Title,
    notes: row.Notes || "",
    dueDate: row.DueDate ? row.DueDate.toISOString().slice(0, 10) : "",
    priority: row.Priority,
    category: row.Category,
    completed: row.Completed,
    createdAt: new Date(row.CreatedAt).getTime(),
    updatedAt: new Date(row.UpdatedAt).getTime(),
  };
}

app.get("/api/tasks", async (_request, response, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT Id, Title, Notes, DueDate, Priority, Category, Completed, CreatedAt, UpdatedAt
      FROM dbo.Tasks
      ORDER BY CreatedAt DESC
    `);
    response.json(result.recordset.map(mapTask));
  } catch (error) {
    next(error);
  }
});

app.get("/healthz", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

app.get("/readyz", async (_request, response) => {
  try {
    const pool = await getPool();
    await pool.request().query("SELECT 1 AS ok");
    response.status(200).json({ status: "ready" });
  } catch {
    response.status(503).json({ status: "not ready" });
  }
});

app.post("/api/tasks", async (request, response, next) => {
  try {
    const task = request.body;
    const pool = await getPool();
    const result = await pool
      .request()
      .input("Title", sql.NVarChar(120), task.title)
      .input("Notes", sql.NVarChar(500), task.notes || "")
      .input("DueDate", sql.Date, task.dueDate || null)
      .input("Priority", sql.NVarChar(20), task.priority || "medium")
      .input("Category", sql.NVarChar(60), task.category || "Inbox")
      .query(`
        INSERT INTO dbo.Tasks (Title, Notes, DueDate, Priority, Category)
        OUTPUT inserted.Id, inserted.Title, inserted.Notes, inserted.DueDate,
          inserted.Priority, inserted.Category, inserted.Completed,
          inserted.CreatedAt, inserted.UpdatedAt
        VALUES (@Title, @Notes, @DueDate, @Priority, @Category)
      `);
    response.status(201).json(mapTask(result.recordset[0]));
  } catch (error) {
    next(error);
  }
});

app.put("/api/tasks/:id", async (request, response, next) => {
  try {
    const task = request.body;
    const pool = await getPool();
    const result = await pool
      .request()
      .input("Id", sql.UniqueIdentifier, request.params.id)
      .input("Title", sql.NVarChar(120), task.title)
      .input("Notes", sql.NVarChar(500), task.notes || "")
      .input("DueDate", sql.Date, task.dueDate || null)
      .input("Priority", sql.NVarChar(20), task.priority || "medium")
      .input("Category", sql.NVarChar(60), task.category || "Inbox")
      .input("Completed", sql.Bit, Boolean(task.completed))
      .query(`
        UPDATE dbo.Tasks
        SET Title = @Title,
          Notes = @Notes,
          DueDate = @DueDate,
          Priority = @Priority,
          Category = @Category,
          Completed = @Completed,
          UpdatedAt = SYSUTCDATETIME()
        OUTPUT inserted.Id, inserted.Title, inserted.Notes, inserted.DueDate,
          inserted.Priority, inserted.Category, inserted.Completed,
          inserted.CreatedAt, inserted.UpdatedAt
        WHERE Id = @Id
      `);

    if (result.recordset.length === 0) {
      response.sendStatus(404);
      return;
    }

    response.json(mapTask(result.recordset[0]));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/tasks/:id", async (request, response, next) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("Id", sql.UniqueIdentifier, request.params.id)
      .query("DELETE FROM dbo.Tasks WHERE Id = @Id");

    response.sendStatus(result.rowsAffected[0] ? 204 : 404);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/tasks", async (request, response, next) => {
  try {
    if (request.query.completed !== "true") {
      response.status(400).json({ message: "Only completed task cleanup is supported." });
      return;
    }

    const pool = await getPool();
    await pool.request().query("DELETE FROM dbo.Tasks WHERE Completed = 1");
    response.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  response.status(500).json({
    message: "Server error",
    detail: config.env === "production" ? undefined : error.message,
  });
});

const server = app.listen(config.port, config.host, () => {
  console.log(`TaskFlow Todo is running on ${config.host}:${config.port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    try {
      if (poolPromise) {
        const pool = await poolPromise;
        await pool.close();
      }
      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown", error);
      process.exit(1);
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
