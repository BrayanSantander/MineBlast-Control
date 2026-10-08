import { NextResponse } from "next/server";
import { DBSQLClient } from "@databricks/sql";

export async function GET() {
  const host = process.env.DATABRICKS_SERVER_HOSTNAME;
  const path = process.env.DATABRICKS_HTTP_PATH;

  if (!host || !path) {
    return NextResponse.json(
      { error: "Falta la configuración de Databricks." },
      { status: 500 }
    );
  }

  const client = new DBSQLClient();

  try {
    const connection = await client.connect({
      authType: "databricks-oauth",
      host,
      path,
    });

    const session = await connection.openSession();

    const operation = await session.executeStatement(
      `
      SELECT *
      FROM mineblast.gold.vw_dashboard_kpi_anual
      WHERE anio = 2026
      `,
      {
        runAsync: true,
        maxRows: 100,
      }
    );

    const rows = await operation.fetchAll();

    await operation.close();
    await session.close();
    await connection.close();

    return NextResponse.json({
      conectado: true,
      datos: rows,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        conectado: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}