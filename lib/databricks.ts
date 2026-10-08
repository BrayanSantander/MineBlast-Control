import { DBSQLClient } from "@databricks/sql";
import { execFileSync } from "node:child_process";

const host = "dbc-ea1ad31e-4ac2.cloud.databricks.com";
const path = "/sql/1.0/warehouses/84ac3b16f41a8b1f";
const profile = "mineblast";

export async function queryDatabricks(sql: string) {
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
      throw new Error("No se pudo obtener token OAuth desde Databricks CLI.");
    }

    client = new DBSQLClient();

    connection = await client.connect({
      host,
      path,
      token: auth.access_token,
    });

    session = await connection.openSession();

    operation = await session.executeStatement(sql, {
      runAsync: false,
      maxRows: 1000,
    });

    return await operation.fetchAll();

  } finally {
    if (operation) await operation.close().catch(() => {});
    if (session) await session.close().catch(() => {});
    if (connection) await connection.close().catch(() => {});
    if (client) await client.close().catch(() => {});
  }
}