"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Boxes,
  CircleAlert,
  History,
  PackagePlus,
  RefreshCw,
  Save,
} from "lucide-react";

type Inventario = {
  id: number;
  explosivo: string;
  lote: string | null;
  unidad: string | null;
  stock_actual: number;
  actualizado_en: string;
};

type Movimiento = {
  id: number;
  registro_uuid: string;
  fecha: string;
  tipo_movimiento: string;
  explosivo: string;
  cantidad: number;
  unidad: string | null;
  lote: string | null;
  vale_id: number | null;
  observacion: string | null;
  proveedor: string | null;
  documento_referencia: string | null;
  responsable: string | null;
  sincronizado: number;
  creado_en: string;
};

const EXPLOSIVOS = [
  "AMEX",
  "AMEX UH",
  "AMEX LD",
  "AMEXAL 400",
  "EMULNOR 3000",
  "EMULSION GRANEL",
  "SENATEL ULTREX",
  "SOFTRON",
  "TRIMEX",
  "EXACORTE",
  "PENTEX CILINDRICO 150",
  "PENTEX CILINDRICO 225",
  "PENTEX CILINDRICO 450",
  "MINIBOOSTER 40G",
  "RIOCORD 3P",
  "GUIA COMPUESTA",
  "I-KON",
  "CABLE DE DISPARO",
  "CABLE DE CONEXION",
  "DET NO ELECTRICO",
];

const hoy = new Date().toISOString().slice(0, 10);

export default function InventarioPage() {
  const [inventario, setInventario] = useState<Inventario[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    fecha: hoy,
    tipo_movimiento: "REABASTECIMIENTO",
    explosivo: "",
    cantidad: "",
    unidad: "KG",
    lote: "",
    proveedor: "",
    documento_referencia: "",
    responsable: "",
    observacion: "",
  });

  async function cargarDatos() {
    try {
      setCargando(true);
      setError("");

      const [respuestaInventario, respuestaMovimientos] =
        await Promise.all([
          fetch("/api/inventario", {
            cache: "no-store",
          }),
          fetch("/api/movimientos", {
            cache: "no-store",
          }),
        ]);

      const datosInventario =
        await respuestaInventario.json();

      const datosMovimientos =
        await respuestaMovimientos.json();

      if (!respuestaInventario.ok) {
        throw new Error(
          datosInventario.error ??
            "No fue posible cargar el inventario."
        );
      }

      if (!respuestaMovimientos.ok) {
        throw new Error(
          datosMovimientos.error ??
            "No fue posible cargar los movimientos."
        );
      }

      setInventario(datosInventario.datos ?? []);
      setMovimientos(datosMovimientos.datos ?? []);
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

  const totalProductosConStock = useMemo(() => {
    return inventario.filter(
      (fila) => Number(fila.stock_actual) > 0
    ).length;
  }, [inventario]);

  const totalLotes = inventario.length;

  const movimientosPendientes = useMemo(() => {
    return movimientos.filter(
      (movimiento) =>
        Number(movimiento.sincronizado) === 0
    ).length;
  }, [movimientos]);

  function actualizarCampo(
    campo: keyof typeof form,
    valor: string
  ) {
    setForm((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  function limpiarFormulario() {
    setForm({
      fecha: hoy,
      tipo_movimiento: "REABASTECIMIENTO",
      explosivo: "",
      cantidad: "",
      unidad: "KG",
      lote: "",
      proveedor: "",
      documento_referencia: "",
      responsable: "",
      observacion: "",
    });
  }

  async function registrarMovimiento(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMensaje("");
    setError("");

    if (!form.explosivo) {
      setError("Debes seleccionar un explosivo.");
      return;
    }

    if (!form.lote.trim()) {
      setError(
        "Debes indicar el lote para mantener la trazabilidad."
      );
      return;
    }

    if (Number(form.cantidad) <= 0) {
      setError(
        "La cantidad debe ser mayor a cero."
      );
      return;
    }

    if (
      form.tipo_movimiento === "REABASTECIMIENTO" &&
      !form.responsable.trim()
    ) {
      setError(
        "Para un reabastecimiento debes indicar el responsable."
      );
      return;
    }

    try {
      setGuardando(true);

      const respuesta = await fetch(
        "/api/movimientos",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...form,
            cantidad: Number(form.cantidad),
            usuario: "USUARIO_PRUEBA",
          }),
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.detalle
            ? `${resultado.error} ${resultado.detalle}`
            : resultado.error ??
              "No fue posible registrar el movimiento."
        );
      }

      setMensaje(
        `Movimiento registrado correctamente. Stock actual: ${resultado.stock_actual}.`
      );

      limpiarFormulario();

      await cargarDatos();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Error registrando el movimiento."
      );
    } finally {
      setGuardando(false);
    }
  }

  function formatoNumero(valor: number) {
    return new Intl.NumberFormat("es-CL", {
      maximumFractionDigits: 2,
    }).format(valor);
  }

  function etiquetaMovimiento(tipo: string) {
    switch (tipo) {
      case "REABASTECIMIENTO":
        return "Reabastecimiento";

      case "DESPACHO":
        return "Despacho";

      case "DEVOLUCION":
        return "Devolución";

      case "AJUSTE_ENTRADA":
        return "Ajuste +";

      case "AJUSTE_SALIDA":
        return "Ajuste -";

      case "ENTRADA":
        return "Entrada antigua";

      case "SALIDA":
        return "Salida antigua";

      default:
        return tipo;
    }
  }

  function esMovimientoEntrada(tipo: string) {
    return [
      "REABASTECIMIENTO",
      "DEVOLUCION",
      "AJUSTE_ENTRADA",
      "ENTRADA",
    ].includes(tipo);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-xl font-semibold">
              Inventario de explosivos
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Control de existencias, lotes y movimientos
            </p>
          </div>

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
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">

        {/* RESUMEN */}

        <section className="grid gap-4 md:grid-cols-3">
          <TarjetaResumen
            titulo="Productos con stock"
            valor={String(totalProductosConStock)}
            icono={<Boxes size={20} />}
          />

          <TarjetaResumen
            titulo="Lotes registrados"
            valor={String(totalLotes)}
            icono={<PackagePlus size={20} />}
          />

          <TarjetaResumen
            titulo="Movimientos pendientes"
            valor={String(movimientosPendientes)}
            icono={<CircleAlert size={20} />}
          />
        </section>

        {/* FORMULARIO */}

        <section className="rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-6 py-5">
            <h2 className="font-semibold">
              Registrar movimiento
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Registra reabastecimientos, despachos,
              devoluciones y ajustes de inventario.
            </p>
          </div>

          <form
            onSubmit={registrarMovimiento}
            className="p-6"
          >
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

              <Campo label="Fecha">
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) =>
                    actualizarCampo(
                      "fecha",
                      e.target.value
                    )
                  }
                  className="mine-input"
                  required
                />
              </Campo>

              <Campo label="Tipo de movimiento">
                <select
                  value={form.tipo_movimiento}
                  onChange={(e) =>
                    actualizarCampo(
                      "tipo_movimiento",
                      e.target.value
                    )
                  }
                  className="mine-input"
                >
                  <option value="REABASTECIMIENTO">
                    Reabastecimiento
                  </option>

                  <option value="DESPACHO">
                    Despacho
                  </option>

                  <option value="DEVOLUCION">
                    Devolución
                  </option>

                  <option value="AJUSTE_ENTRADA">
                    Ajuste de entrada
                  </option>

                  <option value="AJUSTE_SALIDA">
                    Ajuste de salida
                  </option>
                </select>
              </Campo>

              <Campo label="Explosivo">
                <select
                  value={form.explosivo}
                  onChange={(e) =>
                    actualizarCampo(
                      "explosivo",
                      e.target.value
                    )
                  }
                  className="mine-input"
                  required
                >
                  <option value="">
                    Seleccionar explosivo
                  </option>

                  {EXPLOSIVOS.map((producto) => (
                    <option
                      key={producto}
                      value={producto}
                    >
                      {producto}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Cantidad">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.cantidad}
                  onChange={(e) =>
                    actualizarCampo(
                      "cantidad",
                      e.target.value
                    )
                  }
                  className="mine-input"
                  placeholder="0"
                  required
                />
              </Campo>

              <Campo label="Unidad">
                <select
                  value={form.unidad}
                  onChange={(e) =>
                    actualizarCampo(
                      "unidad",
                      e.target.value
                    )
                  }
                  className="mine-input"
                >
                  <option value="KG">
                    Kilogramos
                  </option>

                  <option value="UN">
                    Unidades
                  </option>

                  <option value="M">
                    Metros
                  </option>
                </select>
              </Campo>

              <Campo label="Lote">
                <input
                  value={form.lote}
                  onChange={(e) =>
                    actualizarCampo(
                      "lote",
                      e.target.value
                    )
                  }
                  className="mine-input"
                  placeholder="Ej: AMX-2026-084"
                  required
                />
              </Campo>

              <Campo label="Proveedor / procedencia">
                <input
                  value={form.proveedor}
                  onChange={(e) =>
                    actualizarCampo(
                      "proveedor",
                      e.target.value
                    )
                  }
                  className="mine-input"
                  placeholder="Ej: Bodega central"
                />
              </Campo>

              <Campo label="Documento / guía">
                <input
                  value={form.documento_referencia}
                  onChange={(e) =>
                    actualizarCampo(
                      "documento_referencia",
                      e.target.value
                    )
                  }
                  className="mine-input"
                  placeholder="Ej: Guía 45821"
                />
              </Campo>

              <Campo label="Responsable">
                <input
                  value={form.responsable}
                  onChange={(e) =>
                    actualizarCampo(
                      "responsable",
                      e.target.value
                    )
                  }
                  className="mine-input"
                  placeholder="Nombre del responsable"
                />
              </Campo>

              <div className="md:col-span-2 lg:col-span-3">
                <Campo label="Observación">
                  <input
                    value={form.observacion}
                    onChange={(e) =>
                      actualizarCampo(
                        "observacion",
                        e.target.value
                      )
                    }
                    className="mine-input"
                    placeholder="Observación opcional"
                  />
                </Campo>
              </div>
            </div>

            {mensaje && (
              <div className="mt-5 rounded-lg border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
                {mensaje}
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-lg border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={guardando}
                className="flex min-w-52 items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={17} />

                {guardando
                  ? "Registrando..."
                  : "Registrar movimiento"}
              </button>
            </div>
          </form>
        </section>

        {/* STOCK */}

        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-6 py-5">
            <h2 className="font-semibold">
              Stock actual
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Existencias disponibles por explosivo y lote.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">
                    Explosivo
                  </th>

                  <th className="px-6 py-3">
                    Lote
                  </th>

                  <th className="px-6 py-3">
                    Stock
                  </th>

                  <th className="px-6 py-3">
                    Unidad
                  </th>

                  <th className="px-6 py-3">
                    Actualización
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {inventario.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      No existen productos en inventario.
                    </td>
                  </tr>
                ) : (
                  inventario.map((fila) => (
                    <tr
                      key={fila.id}
                      className="hover:bg-slate-800/30"
                    >
                      <td className="px-6 py-4 font-medium">
                        {fila.explosivo}
                      </td>

                      <td className="px-6 py-4 text-slate-400">
                        {fila.lote || "Sin lote"}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={
                            Number(
                              fila.stock_actual
                            ) <= 0
                              ? "font-semibold text-red-400"
                              : "font-semibold text-emerald-400"
                          }
                        >
                          {formatoNumero(
                            Number(
                              fila.stock_actual
                            )
                          )}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-400">
                        {fila.unidad || "-"}
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        {fila.actualizado_en}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* HISTORIAL */}

        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3 border-b border-slate-800 px-6 py-5">
            <History
              size={18}
              className="text-slate-400"
            />

            <div>
              <h2 className="font-semibold">
                Historial de movimientos
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Últimos movimientos registrados.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">
                    Fecha
                  </th>

                  <th className="px-6 py-3">
                    Movimiento
                  </th>

                  <th className="px-6 py-3">
                    Explosivo
                  </th>

                  <th className="px-6 py-3">
                    Lote
                  </th>

                  <th className="px-6 py-3">
                    Cantidad
                  </th>

                  <th className="px-6 py-3">
                    Responsable
                  </th>

                  <th className="px-6 py-3">
                    Documento
                  </th>

                  <th className="px-6 py-3">
                    Estado
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {movimientos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      No existen movimientos registrados.
                    </td>
                  </tr>
                ) : (
                  movimientos
                    .slice(0, 50)
                    .map((movimiento) => (
                      <tr
                        key={
                          movimiento.registro_uuid
                        }
                        className="hover:bg-slate-800/30"
                      >
                        <td className="px-6 py-4 text-slate-400">
                          {movimiento.fecha}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {esMovimientoEntrada(
                              movimiento.tipo_movimiento
                            ) ? (
                              <ArrowUpCircle
                                size={16}
                                className="text-emerald-400"
                              />
                            ) : (
                              <ArrowDownCircle
                                size={16}
                                className="text-red-400"
                              />
                            )}

                            {etiquetaMovimiento(
                              movimiento.tipo_movimiento
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 font-medium">
                          {movimiento.explosivo}
                        </td>

                        <td className="px-6 py-4 text-slate-400">
                          {movimiento.lote ||
                            "Sin lote"}
                        </td>

                        <td className="px-6 py-4">
                          {formatoNumero(
                            Number(
                              movimiento.cantidad
                            )
                          )}{" "}
                          {movimiento.unidad ?? ""}
                        </td>

                        <td className="px-6 py-4 text-slate-400">
                          {movimiento.responsable ||
                            "-"}
                        </td>

                        <td className="px-6 py-4 text-slate-400">
                          {movimiento.documento_referencia ||
                            "-"}
                        </td>

                        <td className="px-6 py-4">
                          {Number(
                            movimiento.sincronizado
                          ) === 1 ? (
                            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                              Sincronizado
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">
                              Pendiente
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <style jsx global>{`
        .mine-input {
          width: 100%;
          min-height: 42px;
          border-radius: 0.5rem;
          border: 1px solid #334155;
          background-color: #0f172a;
          padding: 0.65rem 0.75rem;
          color: #e2e8f0;
          font-size: 0.875rem;
          outline: none;
        }

        .mine-input:focus {
          border-color: #f59e0b;
        }

        .mine-input::placeholder {
          color: #64748b;
        }

        select.mine-input {
          color-scheme: dark;
        }

        select.mine-input option {
          background-color: #0f172a;
          color: #e2e8f0;
        }

        input[type="date"].mine-input {
          color-scheme: dark;
        }
      `}</style>
    </main>
  );
}

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-slate-400">
        {label}
      </span>

      {children}
    </label>
  );
}

function TarjetaResumen({
  titulo,
  valor,
  icono,
}: {
  titulo: string;
  valor: string;
  icono: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {titulo}
        </p>

        <div className="text-slate-500">
          {icono}
        </div>
      </div>

      <p className="mt-3 text-2xl font-semibold">
        {valor}
      </p>
    </div>
  );
}