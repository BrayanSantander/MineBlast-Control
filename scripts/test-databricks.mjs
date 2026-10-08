import { DBSQLClient } from "@databricks/sql";
import { execFileSync } from "node:child_process";

const host = "dbc-ea1ad31e-4ac2.cloud.databricks.com";
const path = "/sql/1.0/warehouses/84ac3b16f41a8b1f";
const profile = "mineblast";

console.log("Obteniendo credencial OAuth desde Databricks CLI...");

let client;
let connection;
let session;
let operation;

try {
  const output = execFileSync(
    "databricks",
    ["auth", "token", "-p", profile, "-o", "json"],
    {
      encoding: "utf8",
      windowsHide: true,
    }
  );

  const auth = JSON.parse(output);

  if (!auth.access_token) {
    throw new Error("Databricks CLI no devolvió un access token.");
  }

  console.log("OAuth correcto.");
  console.log("Conectando al SQL Warehouse...");

  client = new DBSQLClient();

  connection = await client.connect({
    host,
    path,
    token: auth.access_token,
  });

  console.log("Abriendo sesión SQL...");

  session = await connection.openSession();

  console.log("Ejecutando consulta MineBlast...");

  operation = await session.executeStatement(
    `
    SELECT *
    FROM mineblast.gold.vw_dashboard_kpi_anual
    WHERE anio = 2026
    `,
    {
      runAsync: false,
      maxRows: 100,
    }
  );

  const rows = await operation.fetchAll();

  console.log("\nMINEBLAST - RESULTADOS 2026");
  console.table(rows);

} catch (error) {
  console.error("\nERROR DATABRICKS:");
  console.error(error);

} finally {
  if (operation) {
    await operation.close().catch(() => {});
  }

  if (session) {
    await session.close().catch(() => {});
  }

  if (connection) {
    await connection.close().catch(() => {});
  }

  if (client) {
    await client.close().catch(() => {});
  }
}