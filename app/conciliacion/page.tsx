"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  RefreshCw,
  Scale,
  Save,
  Wrench,
} from "lucide-react";

type Inventario = {
  id: number;
  explosivo: string;
  lote: string | null;
  unidad: string | null;
  stock_actual: number;
  actualizado_en: string;
};

type Conciliacion = {
  id: number;
  registro_uuid: string;
  fecha: string;
  explosivo: string;
  lote: string;
  unidad: string | null;
  stock_sistema: number;
  stock_fisico: number;
  diferencia: number;
  responsable: string | null;
  observacion: string | null;
  estado: string;
  ajuste_generado: number;
  sincronizado: number;
  creado_en: string;
};

const hoy = new Date().toISOString().slice(0, 10);

export default function ConciliacionPage() {
  const [inventario, setInventario] = useState<Inventario[]>([]);
  const [conciliaciones, setConciliaciones] = useState<Conciliacion[]>([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [ajustandoId, setAjustandoId] =
    useState<number | null>(null);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    fecha: hoy,
    inventario_id: "",
    stock_fisico: "",
    responsable: "",
    observacion: "",
  });

  async function cargarDatos() {
    try {
      setCargando(true);
      setError("");

      const [respuestaInventario, respuestaConciliacion] =
        await Promise.all([
          fetch("/api/inventario", {
            cache: "no-store",
          }),
          fetch("/api/conciliacion", {
            cache: "no-store",
          }),
        ]);

      const datosInventario =
        await respuestaInventario.json();

      const datosConciliacion =
        await respuestaConciliacion.json();

      if (!respuestaInventario.ok) {
        throw new Error(
          datosInventario.error ??
            "No fue posible cargar el inventario."
        );
      }

      if (!respuestaConciliacion.ok) {
        throw new Error(
          datosConciliacion.error ??
            "No fue posible cargar las conciliaciones."
        );
      }

      setInventario(datosInventario.datos ?? []);
      setConciliaciones(datosConciliacion.datos ?? []);
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

  const itemSeleccionado = useMemo(() => {
    return inventario.find(
      (item) =>
        String(item.id) === form.inventario_id
    );
  }, [inventario, form.inventario_id]);

  const diferenciaCalculada = useMemo(() => {
    if (
      !itemSeleccionado ||
      form.stock_fisico === ""
    ) {
      return null;
    }

    const fisico = Number(form.stock_fisico);

    if (!Number.isFinite(fisico)) {
      return null;
    }

    return (
      fisico -
      Number(itemSeleccionado.stock_actual)
    );
  }, [itemSeleccionado, form.stock_fisico]);

  function actualizarCampo(
    campo: keyof typeof form,
    valor: string
  ) {
    setForm((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  async function registrarConciliacion(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMensaje("");
    setError("");

    if (!itemSeleccionado) {
      setError(
        "Debes seleccionar un producto y lote."
      );
      return;
    }

    const stockFisico = Number(form.stock_fisico);

    if (
      !Number.isFinite(stockFisico) ||
      stockFisico < 0
    ) {
      setError(
        "El stock físico debe ser igual o mayor a cero."
      );
      return;
    }

    if (!form.responsable.trim()) {
      setError(
        "Debes indicar el responsable de la conciliación."
      );
      return;
    }

    try {
      setGuardando(true);

      const respuesta = await fetch(
        "/api/conciliacion",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fecha: form.fecha,
            explosivo:
              itemSeleccionado.explosivo,
            lote:
              itemSeleccionado.lote,
            stock_fisico:
              stockFisico,
            responsable:
              form.responsable.trim(),
            observacion:
              form.observacion.trim(),
          }),
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.detalle
            ? `${resultado.error} ${resultado.detalle}`
            : resultado.error ??
              "No fue posible registrar la conciliación."
        );
      }

      setMensaje(
        resultado.estado === "CONCILIADO"
          ? "Conciliación registrada. No existen diferencias."
          : `Conciliación registrada con diferencia de ${resultado.diferencia}.`
      );

      setForm({
        fecha: hoy,
        inventario_id: "",
        stock_fisico: "",
        responsable: "",
        observacion: "",
      });

      await cargarDatos();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Error registrando la conciliación."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function generarAjuste(
    conciliacion: Conciliacion
  ) {
    setMensaje("");
    setError("");

    const confirmado = window.confirm(
      `¿Generar ajuste para ${conciliacion.explosivo}, lote ${conciliacion.lote}?\n\n` +
        `Stock sistema: ${conciliacion.stock_sistema} ${conciliacion.unidad ?? ""}\n` +
        `Stock físico: ${conciliacion.stock_fisico} ${conciliacion.unidad ?? ""}\n` +
        `Diferencia: ${conciliacion.diferencia} ${conciliacion.unidad ?? ""}\n\n` +
        `El inventario quedará ajustado al stock físico contado.`
    );

    if (!confirmado) {
      return;
    }

    try {
      setAjustandoId(conciliacion.id);

      const respuesta = await fetch(
        "/api/conciliacion/ajustar",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conciliacion_id:
              conciliacion.id,
            responsable:
              conciliacion.responsable ||
              "USUARIO_PRUEBA",
          }),
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.detalle
            ? `${resultado.error} ${resultado.detalle}`
            : resultado.error ??
              "No fue posible generar el ajuste."
        );
      }

      setMensaje(
        `Ajuste generado correctamente. ` +
          `${resultado.tipo_movimiento}: ` +
          `${resultado.cantidad_ajuste} ` +
          `${conciliacion.unidad ?? ""}. ` +
          `Nuevo stock: ${resultado.stock_actual}.`
      );

      await cargarDatos();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Error generando el ajuste."
      );
    } finally {
      setAjustandoId(null);
    }
  }

  function numero(valor: number) {
    return new Intl.NumberFormat("es-CL", {
      maximumFractionDigits: 2,
    }).format(valor);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">

      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>
            <h1 className="text-xl font-semibold">
              Conciliación de inventario
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Comparación entre stock del sistema y conteo físico
            </p>
          </div>

          <button
            type="button"
            onClick={cargarDatos}
            disabled={cargando}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50"
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

        <section className="rounded-xl border border-slate-800 bg-slate-900">

          <div className="border-b border-slate-800 px-6 py-5">
            <h2 className="font-semibold">
              Nueva conciliación
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Selecciona un lote y registra el conteo físico realizado.
            </p>
          </div>

          <form
            onSubmit={registrarConciliacion}
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

              <Campo label="Producto / lote">
                <select
                  value={form.inventario_id}
                  onChange={(e) =>
                    actualizarCampo(
                      "inventario_id",
                      e.target.value
                    )
                  }
                  className="mine-select"
                  required
                >
                  <option value="">
                    Seleccionar producto
                  </option>

                  {inventario.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.explosivo} · {item.lote || "Sin lote"}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Stock sistema">
                <input
                  value={
                    itemSeleccionado
                      ? `${numero(
                          Number(
                            itemSeleccionado.stock_actual
                          )
                        )} ${itemSeleccionado.unidad ?? ""}`
                      : ""
                  }
                  readOnly
                  className="mine-input opacity-70"
                  placeholder="Selecciona un producto"
                />
              </Campo>

              <Campo label="Stock físico">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.stock_fisico}
                  onChange={(e) =>
                    actualizarCampo(
                      "stock_fisico",
                      e.target.value
                    )
                  }
                  className="mine-input"
                  placeholder="Conteo físico"
                  required
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
                  placeholder="Nombre responsable"
                  required
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
                    placeholder="Motivo o comentario"
                  />
                </Campo>
              </div>

            </div>

            {diferenciaCalculada !== null && (
              <div
                className={`mt-5 flex items-center gap-3 rounded-lg border p-4 ${
                  diferenciaCalculada === 0
                    ? "border-emerald-900 bg-emerald-950/30 text-emerald-300"
                    : "border-amber-900 bg-amber-950/30 text-amber-300"
                }`}
              >
                <Scale size={18} />

                <div>
                  <p className="text-sm font-medium">
                    Diferencia calculada
                  </p>

                  <p className="mt-1 text-xl font-semibold">
                    {numero(
                      diferenciaCalculada
                    )}{" "}
                    {itemSeleccionado?.unidad ?? ""}
                  </p>
                </div>
              </div>
            )}

            {mensaje && (
              <div className="mt-5 flex gap-3 rounded-lg border border-emerald-900 bg-emerald-950/30 p-4 text-sm text-emerald-300">
                <CheckCircle2 size={18} />
                {mensaje}
              </div>
            )}

            {error && (
              <div className="mt-5 flex gap-3 rounded-lg border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">
                <CircleAlert size={18} />
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={guardando}
                className="flex min-w-52 items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
              >
                <Save size={17} />

                {guardando
                  ? "Registrando..."
                  : "Registrar conciliación"}
              </button>
            </div>

          </form>

        </section>

        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

          <div className="border-b border-slate-800 px-6 py-5">
            <h2 className="font-semibold">
              Historial de conciliaciones
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Las diferencias pueden transformarse en ajustes controlados.
            </p>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-slate-950/50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">
                    Fecha
                  </th>

                  <th className="px-6 py-3">
                    Explosivo
                  </th>

                  <th className="px-6 py-3">
                    Lote
                  </th>

                  <th className="px-6 py-3">
                    Sistema
                  </th>

                  <th className="px-6 py-3">
                    Físico
                  </th>

                  <th className="px-6 py-3">
                    Diferencia
                  </th>

                  <th className="px-6 py-3">
                    Estado
                  </th>

                  <th className="px-6 py-3">
                    Sincronización
                  </th>

                  <th className="px-6 py-3 text-right">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">

                {conciliaciones.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      No existen conciliaciones registradas.
                    </td>
                  </tr>
                ) : (
                  conciliaciones.map((fila) => {
                    const tieneDiferencia =
                      Number(fila.diferencia) !== 0;

                    const ajustada =
                      Number(
                        fila.ajuste_generado
                      ) === 1 ||
                      fila.estado === "AJUSTADA";

                    const ajustando =
                      ajustandoId === fila.id;

                    return (
                      <tr
                        key={fila.registro_uuid}
                        className="hover:bg-slate-800/30"
                      >

                        <td className="px-6 py-4 text-slate-400">
                          {fila.fecha}
                        </td>

                        <td className="px-6 py-4 font-medium">
                          {fila.explosivo}
                        </td>

                        <td className="px-6 py-4 text-slate-400">
                          {fila.lote}
                        </td>

                        <td className="px-6 py-4">
                          {numero(
                            Number(
                              fila.stock_sistema
                            )
                          )}{" "}
                          {fila.unidad ?? ""}
                        </td>

                        <td className="px-6 py-4">
                          {numero(
                            Number(
                              fila.stock_fisico
                            )
                          )}{" "}
                          {fila.unidad ?? ""}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={
                              Number(
                                fila.diferencia
                              ) === 0
                                ? "text-emerald-400"
                                : "font-semibold text-amber-300"
                            }
                          >
                            {numero(
                              Number(
                                fila.diferencia
                              )
                            )}{" "}
                            {fila.unidad ?? ""}
                          </span>
                        </td>

                        <td className="px-6 py-4">

                          {fila.estado ===
                          "AJUSTADA" ? (
                            <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs text-blue-300">
                              Ajustada
                            </span>
                          ) : fila.estado ===
                            "CONCILIADO" ? (
                            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400">
                              Conciliado
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
                              Diferencia
                            </span>
                          )}

                        </td>

                        <td className="px-6 py-4">

                          {Number(
                            fila.sincronizado
                          ) === 1 ? (
                            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400">
                              Sincronizado
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-400">
                              Pendiente
                            </span>
                          )}

                        </td>

                        <td className="px-6 py-4 text-right">

                          {ajustada ? (
                            <span className="text-xs text-slate-500">
                              Ajuste aplicado
                            </span>
                          ) : tieneDiferencia ? (
                            <button
                              type="button"
                              onClick={() =>
                                generarAjuste(fila)
                              }
                              disabled={ajustando}
                              className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-300 hover:bg-blue-500/20 disabled:opacity-50"
                            >
                              <Wrench size={14} />

                              {ajustando
                                ? "Ajustando..."
                                : "Generar ajuste"}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500">
                              Sin ajuste
                            </span>
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

      <style jsx global>{`
        .mine-input,
        .mine-select {
          width: 100%;
          min-height: 44px;
          border-radius: 0.5rem;
          border: 1px solid #334155;
          background-color: #0f172a !important;
          padding: 0.65rem 0.75rem;
          color: #e2e8f0 !important;
          font-size: 0.875rem;
          outline: none;
        }

        .mine-input:focus,
        .mine-select:focus {
          border-color: #f59e0b;
        }

        .mine-select {
          color-scheme: dark;
        }

        .mine-select option {
          background-color: #0f172a !important;
          color: #e2e8f0 !important;
        }

        input[type="date"] {
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