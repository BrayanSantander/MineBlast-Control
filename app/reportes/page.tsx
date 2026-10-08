"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Download,
  FileText,
  RefreshCcw,
  Scale,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";


type ReporteMetadata = {
  titulo: string;
  sistema: string;
  empresa: string;
  faena: string;
  anio: number;
  mes: number | null;
  generado_en: string;
  tipo_datos: string;
};


type ReporteKpi = {
  metros_avance: number;
  toneladas: number;
  disparos: number;
  consumo_total: number;

  costo_total_explosivos: number;
  costo_por_metro: number;
  costo_por_tonelada: number;

  consumo_equivalente_total: number;
  consumo_equivalente_por_metro: number;
  consumo_equivalente_por_tonelada: number;
};


type ReporteConciliacion = {
  conciliaciones_realizadas: number;
  conciliaciones_correctas: number;
  conciliaciones_con_diferencia: number;
  faltantes: number;
  sobrantes: number;
  diferencia_absoluta_total: number;
  porcentaje_conciliacion_correcta: number;
};


type ConsumoExplosivo = {
  explosivo: string;
  cantidad_total: number;
};


type DetalleConciliacion = {
  fecha: string | null;
  explosivo: string;
  lote: string;
  unidad: string;

  stock_sistema: number;
  stock_fisico: number;
  diferencia: number;

  tipo_diferencia: string;
  estado: string;
  responsable: string;
};


type ReporteMensual = {
  metadata: ReporteMetadata;

  kpi: ReporteKpi;

  conciliacion: ReporteConciliacion;

  consumo_por_explosivo: ConsumoExplosivo[];

  detalle_conciliaciones: DetalleConciliacion[];

  observaciones: string[];
};


const meses = [
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


function numero(
  valor: number,
  decimales = 0
) {
  return new Intl.NumberFormat(
    "es-CL",
    {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    }
  ).format(Number(valor ?? 0));
}


function dinero(valor: number) {
  return new Intl.NumberFormat(
    "es-CL",
    {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }
  ).format(Number(valor ?? 0));
}


function nombreMes(
  mes: number | null
) {
  if (!mes) {
    return "Todos los meses";
  }

  const encontrado =
    meses.find(
      (item) =>
        Number(item.valor) === mes
    );

  return (
    encontrado?.nombre ??
    String(mes)
  );
}


function formatearFecha(
  fecha: string | null
) {
  if (!fecha) {
    return "-";
  }

  try {
    return new Intl.DateTimeFormat(
      "es-CL",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    ).format(
      new Date(fecha)
    );
  } catch {
    return fecha;
  }
}


export default function ReportesPage() {
  const [anio, setAnio] =
    useState("2026");

  const [mes, setMes] =
    useState("10");

  const [reporte, setReporte] =
    useState<ReporteMensual | null>(
      null
    );

  const [cargando, setCargando] =
    useState(true);

  const [
    exportando,
    setExportando,
  ] =
    useState(false);

  const [error, setError] =
    useState("");


  const pdfRef =
    useRef<HTMLDivElement | null>(
      null
    );


  useEffect(() => {
    cargarReporte();
  }, []);


  async function cargarReporte() {
    try {
      setCargando(true);
      setError("");

      const params =
        new URLSearchParams();

      params.set("anio", anio);

      if (mes) {
        params.set("mes", mes);
      }


      const response =
        await fetch(
          `/api/reportes/mensual?${params.toString()}`,
          {
            cache: "no-store",
          }
        );


      const json =
        await response.json();


      if (!response.ok) {
        throw new Error(
          json.detalle ??
            json.error ??
            "No fue posible generar el reporte."
        );
      }


      setReporte(json);

    } catch (e) {
      console.error(e);

      setError(
        e instanceof Error
          ? e.message
          : "Error generando reporte."
      );

    } finally {
      setCargando(false);
    }
  }


  async function exportarPDF() {
    if (
      !pdfRef.current ||
      !reporte
    ) {
      return;
    }


    try {
      setExportando(true);


      const canvas =
        await html2canvas(
          pdfRef.current,
          {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
          }
        );


      const imagen =
        canvas.toDataURL(
          "image/png",
          1
        );


      const pdf =
        new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });


      const anchoPagina =
        pdf.internal.pageSize.getWidth();

      const altoPagina =
        pdf.internal.pageSize.getHeight();


      const margen = 8;


      const anchoDisponible =
        anchoPagina -
        margen * 2;


      const altoImagen =
        (
          canvas.height *
          anchoDisponible
        ) /
        canvas.width;


      let altoRestante =
        altoImagen;


      let posicionY =
        margen;


      pdf.addImage(
        imagen,
        "PNG",
        margen,
        posicionY,
        anchoDisponible,
        altoImagen
      );


      altoRestante -=
        altoPagina -
        margen * 2;


      while (
        altoRestante > 0
      ) {
        pdf.addPage();


        posicionY =
          margen -
          (
            altoImagen -
            altoRestante
          );


        pdf.addImage(
          imagen,
          "PNG",
          margen,
          posicionY,
          anchoDisponible,
          altoImagen
        );


        altoRestante -=
          altoPagina -
          margen * 2;
      }


      const nombreArchivo =
        `MineBlast_Reporte_${nombreMes(
          reporte.metadata.mes
        )}_${reporte.metadata.anio}.pdf`
          .replaceAll(
            " ",
            "_"
          );


      pdf.save(
        nombreArchivo
      );

    } catch (e) {
      console.error(e);

      setError(
        e instanceof Error
          ? e.message
          : "No fue posible exportar el PDF."
      );

    } finally {
      setExportando(false);
    }
  }


  const consumoGrafico =
    useMemo(() => {
      return (
        reporte
          ?.consumo_por_explosivo ??
        []
      ).slice(
        0,
        8
      );
    }, [reporte]);


  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">

      <header className="border-b border-slate-800 bg-slate-900">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div className="flex items-center gap-3">

            <div className="rounded-lg border border-slate-700 bg-slate-800 p-2.5">
              <FileText size={20} />
            </div>


            <div>

              <h1 className="text-xl font-semibold">
                MineBlast Control
              </h1>

              <p className="mt-1 text-sm text-slate-400">
                Reporte mensual de gestión de explosivos
              </p>

            </div>

          </div>

        </div>

      </header>


      <section className="mx-auto max-w-7xl px-6 py-8">

        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">

          <div>

            <p className="text-xs font-medium uppercase tracking-widest text-amber-400">
              Reportes
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              Reporte mensual
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Consolidado operacional, económico y de conciliación.
            </p>

          </div>


          <div className="flex flex-wrap items-end gap-3">

            <label className="block">

              <span className="mb-2 block text-xs font-medium text-slate-500">
                Año
              </span>

              <select
                value={anio}
                onChange={(e) =>
                  setAnio(
                    e.target.value
                  )
                }
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-amber-500"
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

              </select>

            </label>


            <label className="block">

              <span className="mb-2 block text-xs font-medium text-slate-500">
                Mes
              </span>

              <select
                value={mes}
                onChange={(e) =>
                  setMes(
                    e.target.value
                  )
                }
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-amber-500"
              >

                <option value="">
                  Todos
                </option>

                {meses.map(
                  (item) => (

                    <option
                      key={
                        item.valor
                      }
                      value={
                        item.valor
                      }
                    >
                      {item.nombre}
                    </option>

                  )
                )}

              </select>

            </label>


            <button
              type="button"
              onClick={
                cargarReporte
              }
              disabled={
                cargando
              }
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >

              <RefreshCcw
                size={16}
                className={
                  cargando
                    ? "animate-spin"
                    : ""
                }
              />

              Generar reporte

            </button>


            <button
              type="button"
              onClick={
                exportarPDF
              }
              disabled={
                !reporte ||
                cargando ||
                exportando
              }
              className="flex items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-950/40 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-900/50 disabled:cursor-not-allowed disabled:opacity-50"
            >

              <Download
                size={16}
              />

              {exportando
                ? "Exportando..."
                : "Exportar PDF"}

            </button>

          </div>

        </div>


        {error && (

          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/20 px-5 py-4 text-sm text-red-300">
            {error}
          </div>

        )}


        {cargando ? (

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center text-sm text-slate-500">

            Consultando Data Warehouse y generando reporte...

          </div>

        ) : !reporte ? (

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center text-sm text-slate-500">

            No existe información para mostrar.

          </div>

        ) : (

          <>

            <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

              <div className="border-b border-slate-800 bg-slate-950/40 px-6 py-5">

                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">

                  <div>

                    <p className="text-xs font-medium uppercase tracking-widest text-amber-400">
                      Informe de gestión
                    </p>

                    <h3 className="mt-2 text-xl font-semibold">
                      {
                        reporte
                          .metadata
                          .titulo
                      }
                    </h3>

                    <p className="mt-2 text-sm text-slate-400">

                      {
                        reporte
                          .metadata
                          .empresa
                      }

                      {" · "}

                      {
                        reporte
                          .metadata
                          .faena
                      }

                    </p>

                  </div>


                  <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm">

                    <div className="flex items-center gap-2 text-slate-300">

                      <CalendarDays
                        size={15}
                      />

                      <span>

                        {nombreMes(
                          reporte
                            .metadata
                            .mes
                        )}

                        {" "}

                        {
                          reporte
                            .metadata
                            .anio
                        }

                      </span>

                    </div>


                    <p className="mt-2 text-xs text-slate-500">
                      Generado por MineBlast Control
                    </p>

                  </div>

                </div>

              </div>


              <div className="px-6 py-5">

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

                  <KpiReporte
                    titulo="Avance"
                    valor={`${numero(
                      reporte
                        .kpi
                        .metros_avance,
                      2
                    )} m`}
                  />


                  <KpiReporte
                    titulo="Toneladas"
                    valor={`${numero(
                      reporte
                        .kpi
                        .toneladas,
                      1
                    )} t`}
                  />


                  <KpiReporte
                    titulo="Disparos"
                    valor={numero(
                      reporte
                        .kpi
                        .disparos
                    )}
                  />


                  <KpiReporte
                    titulo="Costo explosivos"
                    valor={dinero(
                      reporte
                        .kpi
                        .costo_total_explosivos
                    )}
                  />


                  <KpiReporte
                    titulo="Consumo total"
                    valor={numero(
                      reporte
                        .kpi
                        .consumo_total,
                      2
                    )}
                  />

                </div>


                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

                  <KpiReporte
                    titulo="Costo / metro"
                    valor={dinero(
                      reporte
                        .kpi
                        .costo_por_metro
                    )}
                  />


                  <KpiReporte
                    titulo="Costo / tonelada"
                    valor={dinero(
                      reporte
                        .kpi
                        .costo_por_tonelada
                    )}
                  />


                  <KpiReporte
                    titulo="Consumo equivalente"
                    valor={numero(
                      reporte
                        .kpi
                        .consumo_equivalente_total,
                      2
                    )}
                  />


                  <KpiReporte
                    titulo="Eq. / metro"
                    valor={numero(
                      reporte
                        .kpi
                        .consumo_equivalente_por_metro,
                      3
                    )}
                  />


                  <KpiReporte
                    titulo="Eq. / tonelada"
                    valor={numero(
                      reporte
                        .kpi
                        .consumo_equivalente_por_tonelada,
                      4
                    )}
                  />

                </div>

              </div>

            </section>


            <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">

              <Panel
                titulo="Consumo por explosivo"
                subtitulo="Principales productos utilizados durante el período."
              >

                {consumoGrafico.length ===
                0 ? (

                  <SinDatos />

                ) : (

                  <div className="h-[360px]">

                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >

                      <BarChart
                        data={
                          consumoGrafico
                        }
                        layout="vertical"
                        margin={{
                          top: 5,
                          right: 25,
                          left: 45,
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

                            fontSize:
                              10,
                          }}
                        />


                        <YAxis
                          type="category"
                          dataKey="explosivo"
                          width={165}
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill:
                              "#cbd5e1",

                            fontSize:
                              10,
                          }}
                        />


                        <Tooltip
                          formatter={(
                            valor
                          ) => [
                            numero(
                              Number(
                                valor
                              ),
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
                          fill="#f59e0b"
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


              <Panel
                titulo="Control de conciliación"
                subtitulo="Resumen de diferencias entre inventario físico y sistema."
              >

                <div className="grid gap-3 sm:grid-cols-2">

                  <MiniKpi
                    titulo="Conciliaciones"
                    valor={numero(
                      reporte
                        .conciliacion
                        .conciliaciones_realizadas
                    )}
                  />


                  <MiniKpi
                    titulo="Correctas"
                    valor={numero(
                      reporte
                        .conciliacion
                        .conciliaciones_correctas
                    )}
                  />


                  <MiniKpi
                    titulo="Con diferencia"
                    valor={numero(
                      reporte
                        .conciliacion
                        .conciliaciones_con_diferencia
                    )}
                  />


                  <MiniKpi
                    titulo="% correcto"
                    valor={`${numero(
                      reporte
                        .conciliacion
                        .porcentaje_conciliacion_correcta,
                      2
                    )}%`}
                  />


                  <MiniKpi
                    titulo="Faltantes"
                    valor={numero(
                      reporte
                        .conciliacion
                        .faltantes
                    )}
                  />


                  <MiniKpi
                    titulo="Sobrantes"
                    valor={numero(
                      reporte
                        .conciliacion
                        .sobrantes
                    )}
                  />

                </div>


                <div className="mt-4 rounded-lg border border-amber-900/40 bg-amber-950/10 px-4 py-3">

                  <div className="flex items-start gap-3">

                    <AlertTriangle
                      size={18}
                      className="mt-0.5 text-amber-400"
                    />


                    <div>

                      <p className="text-xs font-medium uppercase tracking-wide text-amber-300">
                        Diferencia absoluta
                      </p>


                      <p className="mt-1 text-2xl font-semibold text-white">

                        {numero(
                          reporte
                            .conciliacion
                            .diferencia_absoluta_total,
                          2
                        )}

                      </p>

                    </div>

                  </div>

                </div>

              </Panel>

            </div>


            <section className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

              <div className="border-b border-slate-800 px-5 py-4">

                <div className="flex items-center gap-2">

                  <BarChart3
                    size={17}
                    className="text-slate-400"
                  />


                  <h3 className="text-sm font-semibold">
                    Detalle de consumo por explosivo
                  </h3>

                </div>

              </div>


              <div className="overflow-x-auto">

                <table className="w-full min-w-[650px] text-left text-sm">

                  <thead className="bg-slate-950/50 text-xs uppercase text-slate-500">

                    <tr>

                      <th className="px-5 py-3">
                        Explosivo
                      </th>


                      <th className="px-5 py-3 text-right">
                        Cantidad total
                      </th>

                    </tr>

                  </thead>


                  <tbody className="divide-y divide-slate-800">

                    {reporte
                      .consumo_por_explosivo
                      .length ===
                    0 ? (

                      <tr>

                        <td
                          colSpan={2}
                          className="px-5 py-8 text-center text-slate-500"
                        >
                          No existen registros.
                        </td>

                      </tr>

                    ) : (

                      reporte
                        .consumo_por_explosivo
                        .map(
                          (
                            item,
                            index
                          ) => (

                            <tr
                              key={`${item.explosivo}-${index}`}
                              className="hover:bg-slate-800/30"
                            >

                              <td className="px-5 py-4 font-medium text-slate-200">
                                {
                                  item.explosivo
                                }
                              </td>


                              <td className="px-5 py-4 text-right text-slate-300">

                                {numero(
                                  item.cantidad_total,
                                  2
                                )}

                              </td>

                            </tr>

                          )
                        )

                    )}

                  </tbody>

                </table>

              </div>

            </section>


            <section className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

              <div className="border-b border-slate-800 px-5 py-4">

                <div className="flex items-center gap-2">

                  <Scale
                    size={17}
                    className="text-slate-400"
                  />


                  <h3 className="text-sm font-semibold">
                    Detalle de conciliaciones
                  </h3>

                </div>

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

                    {reporte
                      .detalle_conciliaciones
                      .length ===
                    0 ? (

                      <tr>

                        <td
                          colSpan={9}
                          className="px-5 py-8 text-center text-slate-500"
                        >
                          No existen conciliaciones para el período.
                        </td>

                      </tr>

                    ) : (

                      reporte
                        .detalle_conciliaciones
                        .map(
                          (
                            item,
                            index
                          ) => (

                            <tr
                              key={`${item.fecha}-${item.explosivo}-${item.lote}-${index}`}
                              className="hover:bg-slate-800/30"
                            >

                              <td className="px-5 py-4 text-slate-400">

                                {formatearFecha(
                                  item.fecha
                                )}

                              </td>


                              <td className="px-5 py-4 font-medium text-slate-200">

                                {
                                  item.explosivo
                                }

                              </td>


                              <td className="px-5 py-4 text-slate-400">

                                {
                                  item.lote
                                }

                              </td>


                              <td className="px-5 py-4">

                                {numero(
                                  item.stock_sistema,
                                  2
                                )}

                                {" "}

                                {
                                  item.unidad
                                }

                              </td>


                              <td className="px-5 py-4">

                                {numero(
                                  item.stock_fisico,
                                  2
                                )}

                                {" "}

                                {
                                  item.unidad
                                }

                              </td>


                              <td
                                className={`px-5 py-4 font-semibold ${
                                  item.diferencia <
                                  0
                                    ? "text-amber-300"
                                    : item.diferencia >
                                        0
                                      ? "text-blue-300"
                                      : "text-emerald-400"
                                }`}
                              >

                                {numero(
                                  item.diferencia,
                                  2
                                )}

                                {" "}

                                {
                                  item.unidad
                                }

                              </td>


                              <td className="px-5 py-4">

                                <Badge
                                  texto={
                                    item.tipo_diferencia
                                  }
                                />

                              </td>


                              <td className="px-5 py-4 text-slate-300">

                                {
                                  item.estado
                                }

                              </td>


                              <td className="px-5 py-4 text-slate-400">

                                {
                                  item.responsable
                                }

                              </td>

                            </tr>

                          )
                        )

                    )}

                  </tbody>

                </table>

              </div>

            </section>


            <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">

              <h3 className="text-sm font-semibold">
                Observaciones del reporte
              </h3>


              <div className="mt-4 space-y-3">

                {reporte
                  .observaciones
                  .map(
                    (
                      observacion,
                      index
                    ) => (

                      <div
                        key={
                          index
                        }
                        className="rounded-lg border border-amber-900/40 bg-amber-950/10 px-4 py-3 text-xs leading-5 text-amber-200/80"
                      >

                        {
                          observacion
                        }

                      </div>

                    )
                  )}

              </div>

            </section>


            <div
              className="fixed left-[-20000px] top-0"
              aria-hidden="true"
            >

              <div
                ref={pdfRef}
                style={{
                  width: "1100px",
                  background: "#ffffff",
                  color: "#111827",
                  padding: "42px",
                  fontFamily:
                    "Arial, sans-serif",
                }}
              >

                <div
                  style={{
                    borderBottom:
                      "3px solid #d97706",
                    paddingBottom:
                      "22px",
                    marginBottom:
                      "28px",
                  }}
                >

                  <div
                    style={{
                      fontSize:
                        "13px",
                      fontWeight:
                        700,
                      color:
                        "#d97706",
                      letterSpacing:
                        "1.5px",
                    }}
                  >
                    MINEBLAST CONTROL
                  </div>


                  <h1
                    style={{
                      fontSize:
                        "28px",
                      margin:
                        "8px 0 8px 0",
                      color:
                        "#111827",
                    }}
                  >
                    Reporte Mensual de Gestión de Explosivos
                  </h1>


                  <div
                    style={{
                      fontSize:
                        "14px",
                      color:
                        "#4b5563",
                    }}
                  >

                    {
                      reporte
                        .metadata
                        .empresa
                    }

                    {" · "}

                    {
                      reporte
                        .metadata
                        .faena
                    }

                    {" · "}

                    {nombreMes(
                      reporte
                        .metadata
                        .mes
                    )}

                    {" "}

                    {
                      reporte
                        .metadata
                        .anio
                    }

                  </div>

                </div>


                <h2
                  style={{
                    fontSize:
                      "19px",
                    marginBottom:
                      "14px",
                  }}
                >
                  1. Resumen ejecutivo
                </h2>


                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(3, 1fr)",
                    gap:
                      "12px",
                    marginBottom:
                      "30px",
                  }}
                >

                  <KpiPDF
                    titulo="Avance"
                    valor={`${numero(
                      reporte
                        .kpi
                        .metros_avance,
                      2
                    )} m`}
                  />


                  <KpiPDF
                    titulo="Toneladas"
                    valor={`${numero(
                      reporte
                        .kpi
                        .toneladas,
                      1
                    )} t`}
                  />


                  <KpiPDF
                    titulo="Disparos"
                    valor={numero(
                      reporte
                        .kpi
                        .disparos
                    )}
                  />


                  <KpiPDF
                    titulo="Costo explosivos"
                    valor={dinero(
                      reporte
                        .kpi
                        .costo_total_explosivos
                    )}
                  />


                  <KpiPDF
                    titulo="Costo / metro"
                    valor={dinero(
                      reporte
                        .kpi
                        .costo_por_metro
                    )}
                  />


                  <KpiPDF
                    titulo="Costo / tonelada"
                    valor={dinero(
                      reporte
                        .kpi
                        .costo_por_tonelada
                    )}
                  />

                </div>


                <h2
                  style={{
                    fontSize:
                      "19px",
                    marginBottom:
                      "14px",
                  }}
                >
                  2. Indicadores de consumo equivalente
                </h2>


                <table
                  style={
                    tablaPDF
                  }
                >

                  <thead>

                    <tr>

                      <ThPDF>
                        Indicador
                      </ThPDF>

                      <ThPDF>
                        Resultado
                      </ThPDF>

                    </tr>

                  </thead>


                  <tbody>

                    <TrPDF
                      nombre="Consumo equivalente total"
                      valor={numero(
                        reporte
                          .kpi
                          .consumo_equivalente_total,
                        2
                      )}
                    />


                    <TrPDF
                      nombre="Consumo equivalente por metro"
                      valor={numero(
                        reporte
                          .kpi
                          .consumo_equivalente_por_metro,
                        3
                      )}
                    />


                    <TrPDF
                      nombre="Consumo equivalente por tonelada"
                      valor={numero(
                        reporte
                          .kpi
                          .consumo_equivalente_por_tonelada,
                        4
                      )}
                    />

                  </tbody>

                </table>


                <h2
                  style={{
                    fontSize:
                      "19px",
                    marginTop:
                      "32px",
                    marginBottom:
                      "8px",
                  }}
                >
                  3. Distribución de consumo por explosivo
                </h2>


                <p
                  style={{
                    fontSize:
                      "12px",
                    color:
                      "#6b7280",
                    marginBottom:
                      "18px",
                  }}
                >
                  Principales explosivos utilizados durante el período seleccionado.
                </p>


                <GraficoConsumoPDF
                  datos={
                    reporte
                      .consumo_por_explosivo
                      .slice(
                        0,
                        8
                      )
                  }
                />


                <h2
                  style={{
                    fontSize:
                      "19px",
                    marginTop:
                      "32px",
                    marginBottom:
                      "14px",
                  }}
                >
                  4. Detalle de consumo por explosivo
                </h2>


                <table
                  style={
                    tablaPDF
                  }
                >

                  <thead>

                    <tr>

                      <ThPDF>
                        Explosivo
                      </ThPDF>

                      <ThPDF>
                        Cantidad total
                      </ThPDF>

                    </tr>

                  </thead>


                  <tbody>

                    {reporte
                      .consumo_por_explosivo
                      .map(
                        (
                          item,
                          index
                        ) => (

                          <tr
                            key={
                              index
                            }
                          >

                            <TdPDF>

                              {
                                item.explosivo
                              }

                            </TdPDF>


                            <TdPDF>

                              {numero(
                                item.cantidad_total,
                                2
                              )}

                            </TdPDF>

                          </tr>

                        )
                      )}

                  </tbody>

                </table>


                <h2
                  style={{
                    fontSize:
                      "19px",
                    marginTop:
                      "32px",
                    marginBottom:
                      "14px",
                  }}
                >
                  5. Conciliación de inventario
                </h2>


                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(3, 1fr)",
                    gap:
                      "12px",
                    marginBottom:
                      "20px",
                  }}
                >

                  <KpiPDF
                    titulo="Conciliaciones"
                    valor={numero(
                      reporte
                        .conciliacion
                        .conciliaciones_realizadas
                    )}
                  />


                  <KpiPDF
                    titulo="Correctas"
                    valor={numero(
                      reporte
                        .conciliacion
                        .conciliaciones_correctas
                    )}
                  />


                  <KpiPDF
                    titulo="Con diferencias"
                    valor={numero(
                      reporte
                        .conciliacion
                        .conciliaciones_con_diferencia
                    )}
                  />


                  <KpiPDF
                    titulo="Faltantes"
                    valor={numero(
                      reporte
                        .conciliacion
                        .faltantes
                    )}
                  />


                  <KpiPDF
                    titulo="Sobrantes"
                    valor={numero(
                      reporte
                        .conciliacion
                        .sobrantes
                    )}
                  />


                  <KpiPDF
                    titulo="% conciliación correcta"
                    valor={`${numero(
                      reporte
                        .conciliacion
                        .porcentaje_conciliacion_correcta,
                      2
                    )}%`}
                  />

                </div>


                <table
                  style={
                    tablaPDF
                  }
                >

                  <thead>

                    <tr>

                      <ThPDF>
                        Fecha
                      </ThPDF>

                      <ThPDF>
                        Explosivo
                      </ThPDF>

                      <ThPDF>
                        Lote
                      </ThPDF>

                      <ThPDF>
                        Sistema
                      </ThPDF>

                      <ThPDF>
                        Físico
                      </ThPDF>

                      <ThPDF>
                        Diferencia
                      </ThPDF>

                      <ThPDF>
                        Estado
                      </ThPDF>

                    </tr>

                  </thead>


                  <tbody>

                    {reporte
                      .detalle_conciliaciones
                      .map(
                        (
                          item,
                          index
                        ) => (

                          <tr
                            key={
                              index
                            }
                          >

                            <TdPDF>

                              {formatearFecha(
                                item.fecha
                              )}

                            </TdPDF>


                            <TdPDF>

                              {
                                item.explosivo
                              }

                            </TdPDF>


                            <TdPDF>

                              {
                                item.lote
                              }

                            </TdPDF>


                            <TdPDF>

                              {numero(
                                item.stock_sistema,
                                2
                              )}

                              {" "}

                              {
                                item.unidad
                              }

                            </TdPDF>


                            <TdPDF>

                              {numero(
                                item.stock_fisico,
                                2
                              )}

                              {" "}

                              {
                                item.unidad
                              }

                            </TdPDF>


                            <TdPDF>

                              {numero(
                                item.diferencia,
                                2
                              )}

                              {" "}

                              {
                                item.unidad
                              }

                            </TdPDF>


                            <TdPDF>

                              {
                                item.estado
                              }

                            </TdPDF>

                          </tr>

                        )
                      )}

                  </tbody>

                </table>


                <h2
                  style={{
                    fontSize:
                      "19px",
                    marginTop:
                      "32px",
                    marginBottom:
                      "14px",
                  }}
                >
                  6. Observaciones
                </h2>


                <ul
                  style={{
                    paddingLeft:
                      "20px",
                    fontSize:
                      "13px",
                    lineHeight:
                      1.7,
                    color:
                      "#4b5563",
                  }}
                >

                  {reporte
                    .observaciones
                    .map(
                      (
                        observacion,
                        index
                      ) => (

                        <li
                          key={
                            index
                          }
                          style={{
                            marginBottom:
                              "8px",
                          }}
                        >

                          {
                            observacion
                          }

                        </li>

                      )
                    )}

                </ul>


                <div
                  style={{
                    marginTop:
                      "35px",
                    paddingTop:
                      "15px",
                    borderTop:
                      "1px solid #d1d5db",
                    fontSize:
                      "11px",
                    color:
                      "#6b7280",
                  }}
                >

                  Documento generado automáticamente por MineBlast Control.

                  <br />

                  Datos utilizados para validación del prototipo académico.

                </div>

              </div>

            </div>

          </>

        )}

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


function KpiReporte({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (

    <article className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">

      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {titulo}
      </p>

      <p className="mt-3 text-xl font-semibold text-white">
        {valor}
      </p>

    </article>

  );
}


function MiniKpi({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (

    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">

      <p className="text-xs text-slate-500">
        {titulo}
      </p>

      <p className="mt-2 text-xl font-semibold text-white">
        {valor}
      </p>

    </div>

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


function Badge({
  texto,
}: {
  texto: string;
}) {
  const valor =
    texto.toUpperCase();


  if (
    valor === "FALTANTE"
  ) {
    return (

      <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
        Faltante
      </span>

    );
  }


  if (
    valor === "SOBRANTE"
  ) {
    return (

      <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs text-blue-300">
        Sobrante
      </span>

    );
  }


  return (

    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400">

      {
        texto ||
        "Sin diferencia"
      }

    </span>

  );
}


function SinDatos() {
  return (

    <div className="flex h-[360px] items-center justify-center text-sm text-slate-500">
      No existen datos para el período seleccionado.
    </div>

  );
}


function KpiPDF({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (

    <div
      style={{
        border:
          "1px solid #d1d5db",

        borderRadius:
          "6px",

        padding:
          "14px",

        background:
          "#f9fafb",
      }}
    >

      <div
        style={{
          fontSize:
            "11px",

          color:
            "#6b7280",

          textTransform:
            "uppercase",

          letterSpacing:
            "0.6px",
        }}
      >
        {titulo}
      </div>


      <div
        style={{
          marginTop:
            "7px",

          fontSize:
            "18px",

          fontWeight:
            700,

          color:
            "#111827",
        }}
      >
        {valor}
      </div>

    </div>

  );
}


const tablaPDF:
  React.CSSProperties = {
    width: "100%",

    borderCollapse:
      "collapse",

    fontSize:
      "12px",

    color:
      "#1f2937",
  };


function ThPDF({
  children,
}: {
  children: React.ReactNode;
}) {
  return (

    <th
      style={{
        padding:
          "10px",

        textAlign:
          "left",

        background:
          "#f3f4f6",

        border:
          "1px solid #d1d5db",

        fontWeight:
          700,
      }}
    >
      {children}
    </th>

  );
}


function TdPDF({
  children,
}: {
  children: React.ReactNode;
}) {
  return (

    <td
      style={{
        padding:
          "9px",

        border:
          "1px solid #e5e7eb",

        verticalAlign:
          "top",
      }}
    >
      {children}
    </td>

  );
}


function TrPDF({
  nombre,
  valor,
}: {
  nombre: string;
  valor: string;
}) {
  return (

    <tr>

      <TdPDF>
        {nombre}
      </TdPDF>

      <TdPDF>
        {valor}
      </TdPDF>

    </tr>

  );
}


function GraficoConsumoPDF({
  datos,
}: {
  datos: ConsumoExplosivo[];
}) {
  if (
    datos.length === 0
  ) {
    return (

      <div
        style={{
          padding:
            "25px",

          border:
            "1px solid #e5e7eb",

          borderRadius:
            "6px",

          color:
            "#6b7280",

          fontSize:
            "12px",

          textAlign:
            "center",
        }}
      >
        No existen datos de consumo para graficar.
      </div>

    );
  }


  const maximo =
    Math.max(
      ...datos.map(
        (item) =>
          Number(
            item.cantidad_total
          ) || 0
      ),
      1
    );


  return (

    <div
      style={{
        border:
          "1px solid #e5e7eb",

        borderRadius:
          "8px",

        background:
          "#ffffff",

        padding:
          "20px",

        marginBottom:
          "30px",
      }}
    >

      {datos.map(
        (
          item,
          index
        ) => {

          const cantidad =
            Number(
              item.cantidad_total
            ) || 0;


          const porcentaje =
            (
              cantidad /
              maximo
            ) *
            100;


          return (

            <div
              key={`${item.explosivo}-${index}`}
              style={{
                marginBottom:
                  index ===
                  datos.length - 1
                    ? "0"
                    : "15px",
              }}
            >

              <div
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "space-between",

                  alignItems:
                    "center",

                  marginBottom:
                    "6px",

                  gap:
                    "20px",
                }}
              >

                <span
                  style={{
                    fontSize:
                      "11px",

                    fontWeight:
                      600,

                    color:
                      "#374151",

                    maxWidth:
                      "70%",
                  }}
                >
                  {
                    item.explosivo
                  }
                </span>


                <span
                  style={{
                    fontSize:
                      "11px",

                    fontWeight:
                      700,

                    color:
                      "#111827",

                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {numero(
                    cantidad,
                    2
                  )}
                </span>

              </div>


              <div
                style={{
                  width:
                    "100%",

                  height:
                    "15px",

                  borderRadius:
                    "4px",

                  background:
                    "#f3f4f6",

                  overflow:
                    "hidden",
                }}
              >

                <div
                  style={{
                    height:
                      "100%",

                    width: `${Math.max(
                      porcentaje,
                      1
                    )}%`,

                    background:
                      "#d97706",

                    borderRadius:
                      "4px",
                  }}
                />

              </div>

            </div>

          );
        }
      )}

    </div>

  );
}