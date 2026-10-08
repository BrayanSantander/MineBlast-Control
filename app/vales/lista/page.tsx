"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  CircleAlert,
  Plus,
  RefreshCw,
  RotateCw,
  Truck,
} from "lucide-react";

type Vale = {
  id: number;
  registro_uuid: string;
  numero_vale: string;
  fecha_vale: string;
  fecha_disparo: string | null;
  turno: string;
  sector: string | null;
  labor: string;
  nivel: string | null;
  tipo: string | null;
  tipo_diagrama: string | null;
  supervisor: string | null;
  estado: string;
  fuente_origen: string;
  sincronizado: number;
  fecha_sincronizacion: string | null;
  creado_en: string;
};

type EstadoSincronizacion = {
  vales: {
    pendientes: number;
    sincronizados: number;
  };

  movimientos: {
    pendientes: number;
    sincronizados: number;
  };
};

export default function ListaValesPage() {
  const [vales, setVales] = useState<Vale[]>([]);

  const [estadoSincronizacion, setEstadoSincronizacion] =
    useState<EstadoSincronizacion | null>(null);

  const [cargando, setCargando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);

  const [despachandoId, setDespachandoId] =
    useState<number | null>(null);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  async function cargarDatos() {
    try {
      setCargando(true);
      setError("");

      const [respuestaVales, respuestaEstado] =
        await Promise.all([
          fetch("/api/vales", {
            cache: "no-store",
          }),

          fetch("/api/sincronizacion", {
            cache: "no-store",
          }),
        ]);

      const datosVales =
        await respuestaVales.json();

      const datosEstado =
        await respuestaEstado.json();

      if (!respuestaVales.ok) {
        throw new Error(
          datosVales.error ??
            "No fue posible cargar los vales."
        );
      }

      if (!respuestaEstado.ok) {
        throw new Error(
          datosEstado.error ??
            "No fue posible cargar el estado de sincronización."
        );
      }

      setVales(datosVales.datos ?? []);
      setEstadoSincronizacion(datosEstado);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No fue posible cargar los datos."
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  const valesPendientes =
    estadoSincronizacion?.vales?.pendientes ?? 0;

  const valesSincronizados =
    estadoSincronizacion?.vales?.sincronizados ?? 0;

  const movimientosPendientes =
    estadoSincronizacion?.movimientos?.pendientes ?? 0;

  const movimientosSincronizados =
    estadoSincronizacion?.movimientos?.sincronizados ?? 0;

  const totalPendientes =
    valesPendientes + movimientosPendientes;

  const totalSincronizados =
    valesSincronizados + movimientosSincronizados;

  async function sincronizar() {
    setMensaje("");
    setError("");

    if (totalPendientes === 0) {
      setMensaje(
        "No hay registros pendientes de sincronización."
      );
      return;
    }

    try {
      setSincronizando(true);

      const respuesta = await fetch(
        "/api/sincronizacion",
        {
          method: "POST",
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.detalle
            ? `${resultado.error} ${resultado.detalle}`
            : resultado.error ??
              "No fue posible sincronizar."
        );
      }

      const valesProcesados =
        resultado.vales_procesados ?? 0;

      const movimientosProcesados =
        resultado.movimientos_procesados ?? 0;

      let texto =
        `Sincronización completada. ` +
        `${valesProcesados} vale(s) y ` +
        `${movimientosProcesados} movimiento(s) procesado(s).`;

      if (
        resultado.pipeline?.estado === "ERROR"
      ) {
        texto +=
          " Los registros llegaron a Bronze, pero hubo un problema procesando el Data Warehouse.";
      }

      setMensaje(texto);

      await cargarDatos();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Error durante la sincronización."
      );
    } finally {
      setSincronizando(false);
    }
  }

  async function despacharVale(vale: Vale) {
    setMensaje("");
    setError("");

    const confirmado = window.confirm(
      `¿Confirmas el despacho del vale ${vale.numero_vale}?\n\n` +
        `Labor: ${vale.labor}\n` +
        `Supervisor: ${vale.supervisor || "Sin supervisor"}\n\n` +
        `Esta acción descontará automáticamente del inventario los productos y lotes registrados en el vale.`
    );

    if (!confirmado) {
      return;
    }

    try {
      setDespachandoId(vale.id);

      const respuesta = await fetch(
        "/api/despachos",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            vale_id: vale.id,
            responsable:
              vale.supervisor || "USUARIO_PRUEBA",
          }),
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.detalle
            ? `${resultado.error} ${resultado.detalle}`
            : resultado.error ??
              "No fue posible realizar el despacho."
        );
      }

      setMensaje(
        `Vale ${vale.numero_vale} despachado correctamente. ` +
          `${resultado.productos_despachados ?? 0} producto(s) descontado(s) del inventario.`
      );

      await cargarDatos();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Error realizando el despacho."
      );
    } finally {
      setDespachandoId(null);
    }
  }

  function badgeEstado(vale: Vale) {
    if (vale.estado === "DESPACHADO") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-300">
          <Truck size={13} />
          Despachado
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">
        <CircleAlert size={13} />
        Pendiente
      </span>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">

      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h1 className="text-xl font-semibold">
              Control de vales
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Registro, despacho y sincronización operacional
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">

            <button
              type="button"
              onClick={cargarDatos}
              disabled={cargando}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={
                  cargando ? "animate-spin" : ""
                }
              />

              Actualizar
            </button>

            <Link
              href="/vales"
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              <Plus size={16} />
              Nuevo vale
            </Link>

          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">

        {/* RESUMEN */}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <Tarjeta
            titulo="Vales registrados"
            valor={String(vales.length)}
          />

          <Tarjeta
            titulo="Vales pendientes"
            valor={String(valesPendientes)}
          />

          <Tarjeta
            titulo="Movimientos pendientes"
            valor={String(movimientosPendientes)}
          />

          <Tarjeta
            titulo="Total sincronizados"
            valor={String(totalSincronizados)}
          />

        </section>

        {/* SINCRONIZACION */}

        <section className="rounded-xl border border-slate-800 bg-slate-900">

          <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-start gap-4">

              <div
                className={`rounded-lg p-3 ${
                  totalPendientes > 0
                    ? "bg-amber-500/10 text-amber-300"
                    : "bg-emerald-500/10 text-emerald-400"
                }`}
              >
                {totalPendientes > 0 ? (
                  <CircleAlert size={22} />
                ) : (
                  <CheckCircle2 size={22} />
                )}
              </div>

              <div>
                <h2 className="font-semibold">
                  Estado de sincronización
                </h2>

                {totalPendientes > 0 ? (
                  <>
                    <p className="mt-1 text-sm text-slate-400">
                      Existen{" "}
                      <span className="font-medium text-amber-300">
                        {totalPendientes}
                      </span>{" "}
                      registros pendientes.
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      {valesPendientes} vale(s) ·{" "}
                      {movimientosPendientes} movimiento(s)
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-slate-400">
                    Todos los registros están sincronizados.
                  </p>
                )}
              </div>

            </div>

            <button
              type="button"
              onClick={sincronizar}
              disabled={
                sincronizando ||
                totalPendientes === 0
              }
              className="flex min-w-52 items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
            >
              <RotateCw
                size={17}
                className={
                  sincronizando
                    ? "animate-spin"
                    : ""
                }
              />

              {sincronizando
                ? "Sincronizando..."
                : totalPendientes > 0
                ? `Sincronizar (${totalPendientes})`
                : "Todo sincronizado"}
            </button>

          </div>

        </section>

        {/* MENSAJES */}

        {mensaje && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-900 bg-emerald-950/20 p-4 text-sm text-emerald-300">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0"
            />

            <p>{mensaje}</p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-300">
            <CircleAlert
              size={18}
              className="mt-0.5 shrink-0"
            />

            <p>{error}</p>
          </div>
        )}

        {/* TABLA */}

        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

          <div className="border-b border-slate-800 px-6 py-5">
            <h2 className="font-semibold">
              Vales registrados
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Los vales pendientes pueden ser despachados
              directamente desde esta pantalla.
            </p>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-slate-950/50 text-xs uppercase text-slate-500">

                <tr>
                  <th className="px-6 py-3">
                    Vale
                  </th>

                  <th className="px-6 py-3">
                    Fecha
                  </th>

                  <th className="px-6 py-3">
                    Labor
                  </th>

                  <th className="px-6 py-3">
                    Turno
                  </th>

                  <th className="px-6 py-3">
                    Supervisor
                  </th>

                  <th className="px-6 py-3">
                    Estado
                  </th>

                  <th className="px-6 py-3">
                    Sincronización
                  </th>

                  <th className="px-6 py-3 text-right">
                    Acciones
                  </th>
                </tr>

              </thead>

              <tbody className="divide-y divide-slate-800">

                {cargando ? (

                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      Cargando vales...
                    </td>
                  </tr>

                ) : vales.length === 0 ? (

                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      No existen vales registrados.
                    </td>
                  </tr>

                ) : (

                  vales.map((vale) => {

                    const despachado =
                      vale.estado === "DESPACHADO";

                    const despachando =
                      despachandoId === vale.id;

                    return (
                      <tr
                        key={vale.registro_uuid}
                        className="hover:bg-slate-800/30"
                      >

                        <td className="px-6 py-4 font-semibold">
                          {vale.numero_vale}
                        </td>

                        <td className="px-6 py-4 text-slate-400">
                          {vale.fecha_vale}
                        </td>

                        <td className="px-6 py-4">
                          {vale.labor}
                        </td>

                        <td className="px-6 py-4 text-slate-400">
                          {vale.turno}
                        </td>

                        <td className="px-6 py-4 text-slate-400">
                          {vale.supervisor || "-"}
                        </td>

                        <td className="px-6 py-4">
                          {badgeEstado(vale)}
                        </td>

                        <td className="px-6 py-4">

                          {Number(
                            vale.sincronizado
                          ) === 1 ? (

                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                              <CheckCircle2 size={13} />
                              Sincronizado
                            </span>

                          ) : (

                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">
                              <CircleAlert size={13} />
                              Pendiente
                            </span>

                          )}

                        </td>

                        <td className="px-6 py-4 text-right">

                          {despachado ? (

                            <span className="text-xs text-slate-500">
                              Sin acciones
                            </span>

                          ) : (

                            <button
                              type="button"
                              onClick={() =>
                                despacharVale(vale)
                              }
                              disabled={despachando}
                              className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-300 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Truck size={14} />

                              {despachando
                                ? "Despachando..."
                                : "Despachar"}
                            </button>

                          )}

                        </td>

                      </tr>
                    );
                  })

                )}

              </tbody>

            </table>

          </div>

        </section>

      </div>

    </main>
  );
}

function Tarjeta({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">
        {titulo}
      </p>

      <p className="mt-3 text-2xl font-semibold">
        {valor}
      </p>
    </div>
  );
}