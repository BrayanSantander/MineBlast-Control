"use client";

import { useEffect, useMemo, useState } from "react";

import UsuarioSesionPanel from "@/components/UsuarioSesion";

import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Filter,
  RotateCcw,
  Scale,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type FiltroSector = {
  sector: string;
};

type FiltroLabor = {
  sector: string | null;
  labor: string;
  nivel: string | null;
};

type FiltroTurno = {
  turno: string;
};

type Resumen = {
  anio: number;
  numero_mes: number | null;

  metros_avance: number;
  disparos: number;

  toneladas: number;
  viajes: number;

  consumo_total: number;
  registros_consumo: number;

  costo_total_explosivos: number;
  costo_por_metro: number;
  costo_por_tonelada: number;

  consumo_equivalente_total: number;
  consumo_equivalente_por_metro: number;
  consumo_equivalente_por_tonelada: number;
};

type Mensual = {
  numero_mes: number;
  mes: string;
  avance_metros: number;
};

type Explosivo = {
  explosivo: string;
  cantidad_total: number;
};

type ResumenConciliacion = {
  conciliaciones_realizadas: number;
  conciliaciones_sin_diferencia: number;
  conciliaciones_con_diferencia: number;
  faltantes: number;
  sobrantes: number;
  diferencia_absoluta_total: number;
  porcentaje_conciliacion_correcta: number;
};

type ConciliacionMensual = {
  anio: number;
  numero_mes: number;
  mes: string;
  conciliaciones_realizadas: number;
  conciliaciones_sin_diferencia: number;
  conciliaciones_con_diferencia: number;
  conciliaciones_con_faltante: number;
  conciliaciones_con_sobrante: number;
  diferencia_absoluta_total: number;
  porcentaje_conciliacion_correcta: number;
};

type UltimaConciliacion = {
  fecha: string | null;
  explosivo: string;
  lote: string;
  unidad: string;
  stock_sistema: number;
  stock_fisico: number;
  diferencia: number;
  diferencia_absoluta: number;
  tipo_diferencia: string;
  responsable: string;
  estado: string;
  ajuste_generado: number;
};

const meses = [
  { valor: "", nombre: "Todos los meses" },
  { valor: "1", nombre: "Enero" },
  { valor: "2", nombre: "Febrero" },
  { valor: "3", nombre: "Marzo" },
  { valor: "4", nombre: "Abril" },
  { valor: "5", nombre: "Mayo" },
  { valor: "6", nombre: "Junio" },
  { valor: "7", nombre: "Julio" },
  { valor: "8", nombre: "Agosto" },
  { valor: "9", nombre: "Septiembre" },
  { valor: "10", nombre: "Octubre" },
  { valor: "11", nombre: "Noviembre" },
  { valor: "12", nombre: "Diciembre" },
];

function numero(valor: number, decimales = 0) {
  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(Number(valor ?? 0));
}

function dinero(valor: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(valor ?? 0));
}

function nombreMes(valor: string) {
  const encontrado = meses.find(
    (item) => item.valor === valor
  );

  return encontrado?.nombre ?? valor;
}

function nombreMesNumero(
  valor: number,
  respaldo = ""
) {
  const encontrado = meses.find(
    (item) =>
      item.valor === String(valor)
  );

  if (encontrado?.nombre) {
    return encontrado.nombre;
  }

  return respaldo || String(valor);
}

export default function Home() {
  const [anio, setAnio] =
    useState("2026");

  const [mes, setMes] =
    useState("");

  const [sector, setSector] =
    useState("");

  const [labor, setLabor] =
    useState("");

  const [turno, setTurno] =
    useState("");

  const [sectores, setSectores] =
    useState<FiltroSector[]>([]);

  const [labores, setLabores] =
    useState<FiltroLabor[]>([]);

  const [turnos, setTurnos] =
    useState<FiltroTurno[]>([]);

  const [resumen, setResumen] =
    useState<Resumen | null>(null);

  const [mensual, setMensual] =
    useState<Mensual[]>([]);

  const [explosivos, setExplosivos] =
    useState<Explosivo[]>([]);

  const [
    resumenConciliacion,
    setResumenConciliacion,
  ] =
    useState<ResumenConciliacion | null>(
      null
    );

  const [
    conciliacionMensual,
    setConciliacionMensual,
  ] =
    useState<ConciliacionMensual[]>([]);

  const [
    ultimasConciliaciones,
    setUltimasConciliaciones,
  ] =
    useState<UltimaConciliacion[]>([]);

  const [
    cargandoFiltros,
    setCargandoFiltros,
  ] =
    useState(true);

  const [
    cargandoDatos,
    setCargandoDatos,
  ] =
    useState(true);

  const [
    cargandoConciliacion,
    setCargandoConciliacion,
  ] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    errorConciliacion,
    setErrorConciliacion,
  ] =
    useState("");

  useEffect(() => {
    async function cargarFiltros() {
      try {
        setCargandoFiltros(true);

        const response =
          await fetch(
            "/api/dashboard/filtros",
            {
              cache: "no-store",
            }
          );

        if (!response.ok) {
          throw new Error(
            "No fue posible cargar las opciones de filtros."
          );
        }

        const json =
          await response.json();

        setSectores(
          json.sectores ?? []
        );

        setLabores(
          json.labores ?? []
        );

        setTurnos(
          json.turnos ?? []
        );
      } catch (e) {
        console.error(e);

        setError(
          e instanceof Error
            ? e.message
            : "Error cargando filtros."
        );
      } finally {
        setCargandoFiltros(false);
      }
    }

    cargarFiltros();
  }, []);

  const laboresFiltradas =
    useMemo(() => {
      if (!sector) {
        return labores;
      }

      return labores.filter(
        (item) =>
          String(
            item.sector ?? ""
          )
            .trim()
            .toUpperCase() ===
          sector
            .trim()
            .toUpperCase()
      );
    }, [labores, sector]);

  useEffect(() => {
    if (!sector) {
      return;
    }

    const existe =
      laboresFiltradas.some(
        (item) =>
          item.labor === labor
      );

    if (
      labor &&
      !existe
    ) {
      setLabor("");
    }
  }, [
    sector,
    labor,
    laboresFiltradas,
  ]);

  useEffect(() => {
    async function cargarDashboard() {
      try {
        setCargandoDatos(true);
        setError("");

        const params =
          new URLSearchParams();

        params.set(
          "anio",
          anio
        );

        if (mes) {
          params.set(
            "mes",
            mes
          );
        }

        if (sector) {
          params.set(
            "sector",
            sector
          );
        }

        if (labor) {
          params.set(
            "labor",
            labor
          );
        }

        if (turno) {
          params.set(
            "turno",
            turno
          );
        }

        const response =
          await fetch(
            `/api/dashboard/filtrado?${params.toString()}`,
            {
              cache: "no-store",
            }
          );

        const json =
          await response.json();

        if (!response.ok) {
          throw new Error(
            json.error ??
              "No fue posible cargar el dashboard."
          );
        }

        setResumen(
          json.resumen ?? null
        );

        setMensual(
          json.mensual ?? []
        );

        setExplosivos(
          json.explosivos ?? []
        );
      } catch (e) {
        console.error(e);

        setError(
          e instanceof Error
            ? e.message
            : "Error cargando dashboard."
        );
      } finally {
        setCargandoDatos(false);
      }
    }

    cargarDashboard();
  }, [
    anio,
    mes,
    sector,
    labor,
    turno,
  ]);

  useEffect(() => {
    async function cargarConciliacion() {
      try {
        setCargandoConciliacion(
          true
        );

        setErrorConciliacion("");

        const params =
          new URLSearchParams();

        params.set(
          "anio",
          anio
        );

        if (mes) {
          params.set(
            "mes",
            mes
          );
        }

        const response =
          await fetch(
            `/api/dashboard/conciliacion?${params.toString()}`,
            {
              cache: "no-store",
            }
          );

        const json =
          await response.json();

        if (!response.ok) {
          throw new Error(
            json.error ??
              "No fue posible cargar los indicadores de conciliación."
          );
        }

        setResumenConciliacion(
          json.resumen ?? null
        );

        setConciliacionMensual(
          json.mensual ?? []
        );

        setUltimasConciliaciones(
          json.ultimas ?? []
        );
      } catch (e) {
        console.error(e);

        setErrorConciliacion(
          e instanceof Error
            ? e.message
            : "Error cargando conciliación."
        );
      } finally {
        setCargandoConciliacion(
          false
        );
      }
    }

    cargarConciliacion();
  }, [anio, mes]);

  function limpiarFiltros() {
    setAnio("2026");
    setMes("");
    setSector("");
    setLabor("");
    setTurno("");
  }

  const descripcionFiltros = [
    anio,

    mes
      ? nombreMes(mes)
      : null,

    sector || null,

    labor || null,

    turno || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900">

  <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

    <div className="flex items-center gap-3">

      <div className="rounded-lg border border-slate-700 bg-slate-800 p-2.5">
        <Database size={20} />
      </div>

      <div>

        <h1 className="text-xl font-semibold">
          MineBlast Control
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Análisis operacional y económico de explosivos
        </p>

      </div>

    </div>


    <UsuarioSesionPanel />

  </div>

</header>

      <section className="mx-auto max-w-7xl px-6 py-8">

        <div className="mb-6">

          <p className="text-xs font-medium uppercase tracking-widest text-amber-400">
            Data Warehouse
          </p>

          <h2 className="mt-2 text-2xl font-semibold">
            Dashboard operacional
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Consulta dinámica de producción, avance,
            consumo, costos y conciliación de inventario.
          </p>

        </div>


        <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900">

          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">

            <div className="flex items-center gap-2">

              <Filter
                size={16}
                className="text-slate-400"
              />

              <h3 className="text-sm font-medium">
                Filtros de análisis
              </h3>

            </div>


            <button
              type="button"
              onClick={limpiarFiltros}
              className="flex items-center gap-2 text-xs text-slate-400 transition hover:text-white"
            >
              <RotateCcw size={14} />

              Limpiar filtros
            </button>

          </div>


          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">

            <FiltroSelect
              label="Año"
              value={anio}
              onChange={setAnio}
            >

              <option value="2026">
                2026
              </option>

              <option value="2025">
                2025
              </option>

              <option value="2024">
                2024
              </option>

              <option value="2023">
                2023
              </option>

              <option value="2022">
                2022
              </option>

            </FiltroSelect>


            <FiltroSelect
              label="Mes"
              value={mes}
              onChange={setMes}
            >

              {meses.map(
                (item) => (
                  <option
                    key={
                      item.valor ||
                      "todos"
                    }
                    value={
                      item.valor
                    }
                  >
                    {item.nombre}
                  </option>
                )
              )}

            </FiltroSelect>


            <FiltroSelect
              label="Sector"
              value={sector}
              onChange={(valor) => {
                setSector(valor);
                setLabor("");
              }}
              disabled={
                cargandoFiltros
              }
            >

              <option value="">
                Todos los sectores
              </option>

              {sectores.map(
                (item) => (
                  <option
                    key={
                      item.sector
                    }
                    value={
                      item.sector
                    }
                  >
                    {item.sector}
                  </option>
                )
              )}

            </FiltroSelect>


            <FiltroSelect
              label="Labor"
              value={labor}
              onChange={setLabor}
              disabled={
                cargandoFiltros
              }
            >

              <option value="">
                Todas las labores
              </option>

              {laboresFiltradas.map(
                (
                  item,
                  index
                ) => (
                  <option
                    key={`${item.sector}-${item.labor}-${item.nivel}-${index}`}
                    value={
                      item.labor
                    }
                  >
                    {item.labor}

                    {item.nivel
                      ? ` · Nivel ${item.nivel}`
                      : ""}
                  </option>
                )
              )}

            </FiltroSelect>


            <FiltroSelect
              label="Turno"
              value={turno}
              onChange={setTurno}
              disabled={
                cargandoFiltros
              }
            >

              <option value="">
                Todos los turnos
              </option>

              {turnos.map(
                (item) => (
                  <option
                    key={
                      item.turno
                    }
                    value={
                      item.turno
                    }
                  >
                    {item.turno}
                  </option>
                )
              )}

            </FiltroSelect>

          </div>


          <div className="border-t border-slate-800 px-5 py-3 text-xs text-slate-500">

            Mostrando:{" "}

            <span className="text-slate-300">
              {descripcionFiltros}
            </span>

          </div>

        </section>


        {error && (

          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-300">
            {error}
          </div>

        )}


        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <Kpi
            titulo="Avance"
            valor={
              cargandoDatos
                ? "..."
                : `${numero(
                    resumen?.metros_avance ??
                      0,
                    2
                  )} m`
            }
          />

          <Kpi
            titulo="Toneladas"
            valor={
              cargandoDatos
                ? "..."
                : `${numero(
                    resumen?.toneladas ??
                      0,
                    1
                  )} t`
            }
          />

          <Kpi
            titulo="Disparos"
            valor={
              cargandoDatos
                ? "..."
                : numero(
                    resumen?.disparos ??
                      0
                  )
            }
          />

          <Kpi
            titulo="Consumo registrado"
            valor={
              cargandoDatos
                ? "..."
                : numero(
                    resumen?.consumo_total ??
                      0,
                    2
                  )
            }
          />

        </div>


        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <Kpi
            titulo="Costo explosivos"
            valor={
              cargandoDatos
                ? "..."
                : dinero(
                    resumen?.costo_total_explosivos ??
                      0
                  )
            }
          />

          <Kpi
            titulo="Costo / metro"
            valor={
              cargandoDatos
                ? "..."
                : dinero(
                    resumen?.costo_por_metro ??
                      0
                  )
            }
          />

          <Kpi
            titulo="Costo / tonelada"
            valor={
              cargandoDatos
                ? "..."
                : dinero(
                    resumen?.costo_por_tonelada ??
                      0
                  )
            }
          />

          <Kpi
            titulo="Consumo equivalente"
            valor={
              cargandoDatos
                ? "..."
                : numero(
                    resumen?.consumo_equivalente_total ??
                      0,
                    2
                  )
            }
          />

        </div>


        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <Kpi
            titulo="Consumo eq. / metro"
            valor={
              cargandoDatos
                ? "..."
                : numero(
                    resumen?.consumo_equivalente_por_metro ??
                      0,
                    3
                  )
            }
          />

          <Kpi
            titulo="Consumo eq. / tonelada"
            valor={
              cargandoDatos
                ? "..."
                : numero(
                    resumen?.consumo_equivalente_por_tonelada ??
                      0,
                    4
                  )
            }
          />

          <Kpi
            titulo="Viajes"
            valor={
              cargandoDatos
                ? "..."
                : numero(
                    resumen?.viajes ??
                      0
                  )
            }
          />

          <Kpi
            titulo="Registros de consumo"
            valor={
              cargandoDatos
                ? "..."
                : numero(
                    resumen?.registros_consumo ??
                      0
                  )
            }
          />

        </div>


        <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">

          <Panel
            titulo="Evolución del avance"
            subtitulo="Metros de avance para la selección actual."
          >

            {cargandoDatos ? (

              <CargaGrafico />

            ) : mensual.length ===
              0 ? (

              <SinDatos />

            ) : (

              <div className="h-[330px]">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <LineChart
                    data={mensual}
                    margin={{
                      top: 15,
                      right: 20,
                      left: 0,
                      bottom: 5,
                    }}
                  >

                    <CartesianGrid
                      stroke="#1e293b"
                      strokeDasharray="4 4"
                    />

                    <XAxis
                      dataKey="mes"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#94a3b8",
                        fontSize: 11,
                      }}
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#94a3b8",
                        fontSize: 11,
                      }}
                    />

                    <Tooltip
                      formatter={(
                        valor
                      ) => [
                        `${numero(
                          Number(valor),
                          2
                        )} m`,
                        "Avance",
                      ]}
                      contentStyle={{
                        backgroundColor:
                          "#0f172a",
                        border:
                          "1px solid #334155",
                        borderRadius:
                          "8px",
                      }}
                    />

                    <Line
                      type="monotone"
                      dataKey="avance_metros"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot={{
                        r: 3,
                        fill:
                          "#f59e0b",
                      }}
                    />

                  </LineChart>

                </ResponsiveContainer>

              </div>

            )}

          </Panel>


          <Panel
            titulo="Consumo por explosivo"
            subtitulo="Productos con mayor consumo para la selección actual."
          >

            {cargandoDatos ? (

              <CargaGrafico />

            ) : explosivos.length ===
              0 ? (

              <SinDatos />

            ) : (

              <div className="h-[330px]">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <BarChart
                    data={
                      explosivos.slice(
                        0,
                        8
                      )
                    }
                    layout="vertical"
                    margin={{
                      top: 5,
                      right: 20,
                      left: 35,
                      bottom: 5,
                    }}
                  >

                    <CartesianGrid
                      stroke="#1e293b"
                      strokeDasharray="4 4"
                      horizontal={
                        false
                      }
                    />

                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill:
                          "#94a3b8",
                        fontSize: 10,
                      }}
                    />

                    <YAxis
                      type="category"
                      dataKey="explosivo"
                      width={150}
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill:
                          "#cbd5e1",
                        fontSize: 10,
                      }}
                    />

                    <Tooltip
                      formatter={(
                        valor
                      ) => [
                        numero(
                          Number(valor),
                          2
                        ),
                        "Cantidad",
                      ]}
                      contentStyle={{
                        backgroundColor:
                          "#0f172a",
                        border:
                          "1px solid #334155",
                        borderRadius:
                          "8px",
                      }}
                    />

                    <Bar
                      dataKey="cantidad_total"
                      fill="#3b82f6"
                      radius={[
                        0,
                        4,
                        4,
                        0,
                      ]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              </div>

            )}

          </Panel>

        </div>


        <section className="mt-10">

          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">

            <div>

              <div className="flex items-center gap-2 text-emerald-400">

                <Scale size={17} />

                <p className="text-xs font-medium uppercase tracking-widest">
                  Control de inventario
                </p>

              </div>

              <h2 className="mt-2 text-xl font-semibold">
                Conciliación física vs. sistema
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Indicadores obtenidos desde la capa Gold del Data Warehouse.
              </p>

            </div>


            <p className="text-xs text-slate-500">

              Filtro aplicado:{" "}
              {anio}

              {mes
                ? ` · ${nombreMes(
                    mes
                  )}`
                : " · Todos los meses"}

            </p>

          </div>


          {(sector ||
            labor ||
            turno) && (

            <div className="mb-5 rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3 text-xs text-slate-400">

              Los filtros Sector, Labor y Turno no
              se aplican a conciliación porque el
              conteo físico está asociado a
              explosivo y lote. Año y Mes sí se
              aplican.

            </div>

          )}


          {errorConciliacion && (

            <div className="mb-5 rounded-xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-300">

              {errorConciliacion}

            </div>

          )}


          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            <KpiConciliacion
              titulo="Conciliaciones"
              valor={
                cargandoConciliacion
                  ? "..."
                  : numero(
                      resumenConciliacion
                        ?.conciliaciones_realizadas ??
                        0
                    )
              }
              detalle="Conteos físicos registrados"
              tipo="normal"
            />

            <KpiConciliacion
              titulo="Con diferencias"
              valor={
                cargandoConciliacion
                  ? "..."
                  : numero(
                      resumenConciliacion
                        ?.conciliaciones_con_diferencia ??
                        0
                    )
              }
              detalle="Registros con faltante o sobrante"
              tipo="alerta"
            />

            <KpiConciliacion
              titulo="Conciliación correcta"
              valor={
                cargandoConciliacion
                  ? "..."
                  : `${numero(
                      resumenConciliacion
                        ?.porcentaje_conciliacion_correcta ??
                        0,
                      2
                    )}%`
              }
              detalle="Conteos sin diferencia"
              tipo="correcto"
            />

            <KpiConciliacion
              titulo="Faltantes"
              valor={
                cargandoConciliacion
                  ? "..."
                  : numero(
                      resumenConciliacion
                        ?.faltantes ??
                        0
                    )
              }
              detalle="Conciliaciones con diferencia negativa"
              tipo="alerta"
            />

            <KpiConciliacion
              titulo="Sobrantes"
              valor={
                cargandoConciliacion
                  ? "..."
                  : numero(
                      resumenConciliacion
                        ?.sobrantes ??
                        0
                    )
              }
              detalle="Conciliaciones con diferencia positiva"
              tipo="normal"
            />

            <KpiConciliacion
              titulo="Diferencia absoluta"
              valor={
                cargandoConciliacion
                  ? "..."
                  : numero(
                      resumenConciliacion
                        ?.diferencia_absoluta_total ??
                        0,
                      2
                    )
              }
              detalle="Suma absoluta de las diferencias registradas"
              tipo="normal"
            />

          </div>


          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.25fr]">

            <Panel
              titulo="Evolución de conciliación"
              subtitulo="Porcentaje mensual de conciliaciones sin diferencia."
            >

              {cargandoConciliacion ? (

                <CargaGrafico />

              ) : conciliacionMensual.length ===
                0 ? (

                <SinDatos />

              ) : (

                <div className="h-[330px]">

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <LineChart
                      data={conciliacionMensual.map(
                        (item) => ({
                          ...item,

                          etiqueta_mes:
                            nombreMesNumero(
                              item.numero_mes,
                              item.mes
                            ),
                        })
                      )}
                      margin={{
                        top: 15,
                        right: 20,
                        left: 0,
                        bottom: 5,
                      }}
                    >

                      <CartesianGrid
                        stroke="#1e293b"
                        strokeDasharray="4 4"
                      />

                      <XAxis
                        dataKey="etiqueta_mes"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill:
                            "#94a3b8",
                          fontSize: 11,
                        }}
                      />

                      <YAxis
                        domain={[
                          0,
                          100,
                        ]}
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill:
                            "#94a3b8",
                          fontSize: 11,
                        }}
                      />

                      <Tooltip
                        formatter={(
                          valor
                        ) => [
                          `${numero(
                            Number(valor),
                            2
                          )}%`,
                          "Conciliación correcta",
                        ]}
                        contentStyle={{
                          backgroundColor:
                            "#0f172a",
                          border:
                            "1px solid #334155",
                          borderRadius:
                            "8px",
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey="porcentaje_conciliacion_correcta"
                        stroke="#10b981"
                        strokeWidth={
                          2.5
                        }
                        dot={{
                          r: 3,
                          fill:
                            "#10b981",
                        }}
                      />

                    </LineChart>

                  </ResponsiveContainer>

                </div>

              )}

            </Panel>


            <Panel
              titulo="Diferencias por mes"
              subtitulo="Cantidad de conciliaciones con faltantes y sobrantes."
            >

              {cargandoConciliacion ? (

                <CargaGrafico />

              ) : conciliacionMensual.length ===
                0 ? (

                <SinDatos />

              ) : (

                <div className="h-[330px]">

                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >

                    <BarChart
                      data={conciliacionMensual.map(
                        (item) => ({
                          ...item,

                          etiqueta_mes:
                            nombreMesNumero(
                              item.numero_mes,
                              item.mes
                            ),
                        })
                      )}
                      margin={{
                        top: 15,
                        right: 20,
                        left: 0,
                        bottom: 5,
                      }}
                    >

                      <CartesianGrid
                        stroke="#1e293b"
                        strokeDasharray="4 4"
                      />

                      <XAxis
                        dataKey="etiqueta_mes"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill:
                            "#94a3b8",
                          fontSize: 11,
                        }}
                      />

                      <YAxis
                        allowDecimals={
                          false
                        }
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill:
                            "#94a3b8",
                          fontSize: 11,
                        }}
                      />

                      <Tooltip
                        formatter={(
                          valor,
                          nombre
                        ) => [
                          numero(
                            Number(valor)
                          ),
                          nombre ===
                          "conciliaciones_con_faltante"
                            ? "Faltantes"
                            : "Sobrantes",
                        ]}
                        contentStyle={{
                          backgroundColor:
                            "#0f172a",
                          border:
                            "1px solid #334155",
                          borderRadius:
                            "8px",
                        }}
                      />

                      <Bar
                        dataKey="conciliaciones_con_faltante"
                        fill="#f59e0b"
                        radius={[
                          4,
                          4,
                          0,
                          0,
                        ]}
                      />

                      <Bar
                        dataKey="conciliaciones_con_sobrante"
                        fill="#3b82f6"
                        radius={[
                          4,
                          4,
                          0,
                          0,
                        ]}
                      />

                    </BarChart>

                  </ResponsiveContainer>

                </div>

              )}

            </Panel>

          </div>


          <section className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

            <div className="border-b border-slate-800 px-5 py-4">

              <h3 className="text-sm font-semibold">
                Últimas conciliaciones
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Detalle analítico proveniente de Gold.
              </p>

            </div>


            <div className="overflow-x-auto">

              <table className="w-full min-w-[1000px] text-left text-sm">

                <thead className="bg-slate-950/50 text-xs uppercase text-slate-500">

                  <tr>

                    <th className="px-5 py-3">
                      Fecha
                    </th>

                    <th className="px-5 py-3">
                      Explosivo
                    </th>

                    <th className="px-5 py-3">
                      Lote
                    </th>

                    <th className="px-5 py-3">
                      Sistema
                    </th>

                    <th className="px-5 py-3">
                      Físico
                    </th>

                    <th className="px-5 py-3">
                      Diferencia
                    </th>

                    <th className="px-5 py-3">
                      Tipo
                    </th>

                    <th className="px-5 py-3">
                      Estado
                    </th>

                    <th className="px-5 py-3">
                      Responsable
                    </th>

                  </tr>

                </thead>


                <tbody className="divide-y divide-slate-800">

                  {cargandoConciliacion ? (

                    <tr>

                      <td
                        colSpan={9}
                        className="px-5 py-10 text-center text-slate-500"
                      >

                        Consultando Data Warehouse...

                      </td>

                    </tr>

                  ) : ultimasConciliaciones.length ===
                    0 ? (

                    <tr>

                      <td
                        colSpan={9}
                        className="px-5 py-10 text-center text-slate-500"
                      >

                        No existen conciliaciones para el período seleccionado.

                      </td>

                    </tr>

                  ) : (

                    ultimasConciliaciones.map(
                      (
                        fila,
                        index
                      ) => (

                        <tr
                          key={`${fila.fecha}-${fila.explosivo}-${fila.lote}-${index}`}
                          className="hover:bg-slate-800/30"
                        >

                          <td className="px-5 py-4 text-slate-400">

                            {fila.fecha ??
                              "-"}

                          </td>


                          <td className="px-5 py-4 font-medium text-slate-200">

                            {fila.explosivo ||
                              "-"}

                          </td>


                          <td className="px-5 py-4 text-slate-400">

                            {fila.lote ||
                              "-"}

                          </td>


                          <td className="px-5 py-4">

                            {numero(
                              fila.stock_sistema,
                              2
                            )}{" "}
                            {fila.unidad}

                          </td>


                          <td className="px-5 py-4">

                            {numero(
                              fila.stock_fisico,
                              2
                            )}{" "}
                            {fila.unidad}

                          </td>


                          <td
                            className={`px-5 py-4 font-semibold ${
                              fila.diferencia ===
                              0
                                ? "text-emerald-400"
                                : "text-amber-300"
                            }`}
                          >

                            {numero(
                              fila.diferencia,
                              2
                            )}{" "}
                            {fila.unidad}

                          </td>


                          <td className="px-5 py-4">

                            <BadgeDiferencia
                              tipo={
                                fila.tipo_diferencia
                              }
                            />

                          </td>


                          <td className="px-5 py-4">

                            <span
                              className={
                                fila.estado ===
                                "AJUSTADA"
                                  ? "rounded-full bg-blue-500/10 px-2.5 py-1 text-xs text-blue-300"
                                  : fila.estado ===
                                      "CONCILIADO"
                                    ? "rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400"
                                    : "rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300"
                              }
                            >

                              {fila.estado ||
                                "-"}

                            </span>

                          </td>


                          <td className="px-5 py-4 text-slate-400">

                            {fila.responsable ||
                              "-"}

                          </td>

                        </tr>

                      )
                    )

                  )}

                </tbody>

              </table>

            </div>

          </section>

        </section>


        <div className="mt-8 rounded-xl border border-amber-900/40 bg-amber-950/10 px-5 py-4">

          <p className="text-sm font-medium text-amber-200">
            Datos de validación del prototipo
          </p>

          <p className="mt-1 text-xs leading-5 text-amber-300/70">
            Los costos y factores de equivalencia utilizados actualmente
            corresponden a valores sintéticos definidos para validar la
            arquitectura analítica de MineBlast Control.
          </p>

        </div>

      </section>


      <style jsx global>{`

        select {
          color-scheme: dark;
        }

        select option {
          background-color: #0f172a;
          color: #e2e8f0;
        }

      `}</style>

    </main>
  );
}


function FiltroSelect({
  label,
  value,
  onChange,
  children,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (
    valor: string
  ) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="block">

      <span className="mb-2 block text-xs font-medium text-slate-500">
        {label}
      </span>

      <select
        value={value}
        disabled={disabled}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-amber-500 disabled:opacity-50"
      >
        {children}
      </select>

    </label>
  );
}


function Kpi({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">

      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {titulo}
      </p>

      <p className="mt-4 text-2xl font-semibold tracking-tight text-white">
        {valor}
      </p>

    </article>
  );
}


function KpiConciliacion({
  titulo,
  valor,
  detalle,
  tipo,
}: {
  titulo: string;
  valor: string;
  detalle: string;
  tipo:
    | "normal"
    | "correcto"
    | "alerta";
}) {
  const Icono =
    tipo === "correcto"
      ? CheckCircle2
      : tipo === "alerta"
        ? AlertTriangle
        : Scale;

  const clasesIcono =
    tipo === "correcto"
      ? "border-emerald-900 bg-emerald-950/40 text-emerald-400"
      : tipo === "alerta"
        ? "border-amber-900 bg-amber-950/40 text-amber-300"
        : "border-slate-700 bg-slate-800 text-slate-300";

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">

      <div className="flex items-start justify-between gap-4">

        <div>

          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {titulo}
          </p>

          <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {valor}
          </p>

        </div>


        <div
          className={`rounded-lg border p-2 ${clasesIcono}`}
        >
          <Icono size={17} />
        </div>

      </div>


      <p className="mt-3 text-xs leading-5 text-slate-500">
        {detalle}
      </p>

    </article>
  );
}


function BadgeDiferencia({
  tipo,
}: {
  tipo: string;
}) {
  if (
    tipo === "FALTANTE"
  ) {
    return (
      <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
        Faltante
      </span>
    );
  }

  if (
    tipo === "SOBRANTE"
  ) {
    return (
      <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs text-blue-300">
        Sobrante
      </span>
    );
  }

  return (
    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400">
      Sin diferencia
    </span>
  );
}


function Panel({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900">

      <div className="border-b border-slate-800 px-5 py-4">

        <h3 className="text-sm font-semibold">
          {titulo}
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          {subtitulo}
        </p>

      </div>


      <div className="p-5">
        {children}
      </div>

    </section>
  );
}


function CargaGrafico() {
  return (
    <div className="flex h-[330px] items-center justify-center text-sm text-slate-500">
      Consultando Data Warehouse...
    </div>
  );
}


function SinDatos() {
  return (
    <div className="flex h-[330px] items-center justify-center text-sm text-slate-500">
      No existen datos para los filtros seleccionados.
    </div>
  );
}