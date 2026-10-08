import { useEffect, useMemo, useState } from 'react';
import type { ProductoDTO } from '@pos/types';
import {
  actualizarProducto,
  crearGrupo,
  crearProducto,
  eliminarProducto,
  obtenerGrupos,
  obtenerProductos,
} from '../api';

const VACIO = {
  id: null as number | null,
  descripcion: '',
  seVendeA: 'UNIDAD',
  costo: '0',
  ganancia: '0',
  precioVenta: '0',
  precioMayoreo: '0',
  aPartirDe: '0',
  idGrupo: '' as number | '',
  codigo: '',
  controlar: true,
  stock: '0',
  stockMinimo: '0',
  fechaVencimiento: '',
  noAplicaVenc: false,
};

export function ProductosView(): JSX.Element {
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [grupos, setGrupos] = useState<Array<{ idLine: number; linea: string }>>([]);
  const [vista, setVista] = useState<'lista' | 'form'>('lista');
  const [f, setF] = useState({ ...VACIO });
  const [busqueda, setBusqueda] = useState('');
  const [nuevoGrupo, setNuevoGrupo] = useState('');
  const [mostrarNuevoGrupo, setMostrarNuevoGrupo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function cargar(): void {
    obtenerProductos().then(setProductos).catch((e: Error) => setError(e.message));
    obtenerGrupos().then(setGrupos).catch(() => undefined);
  }
  useEffect(cargar, []);

  const grupoNombre = (id: number | null): string =>
    grupos.find((g) => g.idLine === id)?.linea ?? '';

  // costo / % ganancia / precio de venta vinculados
  function setCosto(v: string): void {
    const costo = Number(v) || 0;
    const gan = Number(f.ganancia) || 0;
    setF((p) => ({ ...p, costo: v, precioVenta: (costo * (1 + gan / 100)).toFixed(2) }));
  }
  function setGanancia(v: string): void {
    const costo = Number(f.costo) || 0;
    const gan = Number(v) || 0;
    setF((p) => ({ ...p, ganancia: v, precioVenta: (costo * (1 + gan / 100)).toFixed(2) }));
  }
  function setPrecioVenta(v: string): void {
    const costo = Number(f.costo) || 0;
    const pv = Number(v) || 0;
    setF((p) => ({ ...p, precioVenta: v, ganancia: costo > 0 ? ((pv / costo - 1) * 100).toFixed(2) : '0' }));
  }
  function generarCodigo(): void {
    setF((p) => ({ ...p, codigo: String(Math.floor(10000000 + Math.random() * 89999999)) }));
  }

  function abrirNuevo(): void {
    setF({ ...VACIO });
    setMsg(null);
    setError(null);
    setVista('form');
  }

  function abrirEditar(p: ProductoDTO): void {
    const costo = p.precioCompra ?? 0;
    const pv = p.precioVenta ?? 0;
    setF({
      id: p.id,
      descripcion: p.descripcion ?? '',
      seVendeA: p.seVendeA ?? 'UNIDAD',
      costo: String(costo),
      ganancia: costo > 0 ? ((pv / costo - 1) * 100).toFixed(2) : '0',
      precioVenta: String(pv),
      precioMayoreo: String(p.precioMayoreo ?? 0),
      aPartirDe: '0',
      idGrupo: p.idGrupo ?? '',
      codigo: p.codigo ?? '',
      controlar: (p.usaInventarios ?? 'NO') === 'SI',
      stock: p.stock ?? '0',
      stockMinimo: String(p.stockMinimo ?? 0),
      fechaVencimiento: p.fechaVencimiento ?? '',
      noAplicaVenc: false,
    });
    setMsg(null);
    setError(null);
    setVista('form');
  }

  async function agregarGrupo(): Promise<void> {
    if (!nuevoGrupo.trim()) return;
    try {
      await crearGrupo(nuevoGrupo.trim());
      setNuevoGrupo('');
      setMostrarNuevoGrupo(false);
      obtenerGrupos().then(setGrupos);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function guardar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    const dto: Record<string, unknown> = {
      descripcion: f.descripcion,
      codigo: f.codigo || undefined,
      idGrupo: f.idGrupo || undefined,
      seVendeA: f.seVendeA,
      precioCompra: Number(f.costo) || 0,
      precioVenta: Number(f.precioVenta) || 0,
      precioMayoreo: Number(f.precioMayoreo) || 0,
      aPartirDe: Number(f.aPartirDe) || 0,
      usaInventarios: f.controlar ? 'SI' : 'NO',
      stock: f.controlar ? f.stock : '0',
      stockMinimo: f.controlar ? Number(f.stockMinimo) || 0 : 0,
      impuesto: '0',
      fechaVencimiento: f.controlar && !f.noAplicaVenc ? f.fechaVencimiento : undefined,
    };
    try {
      if (f.id) await actualizarProducto(f.id, dto);
      else await crearProducto(dto);
      setMsg(`Producto "${f.descripcion}" guardado.`);
      cargar();
      setVista('lista');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function borrar(id: number): Promise<void> {
    try {
      await eliminarProducto(id);
      cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const lista = useMemo(() => {
    const q = busqueda.toLowerCase();
    return productos.filter(
      (p) =>
        !q ||
        (p.descripcion ?? '').toLowerCase().includes(q) ||
        (p.codigo ?? '').toLowerCase().includes(q),
    );
  }, [productos, busqueda]);

  const costoInventario = productos.reduce(
    (a, p) => a + (p.precioCompra ?? 0) * (Number(p.stock) || 0),
    0,
  );

  // ---------- Vista LISTA ----------
  if (vista === 'lista') {
    return (
      <main className="page prodlist">
        <div className="prodlist__bar">
          <input
            className="prodlist__search"
            placeholder="Buscar…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <button className="prodlist__excel" type="button" disabled title="Próximamente">
            ▦ Importar desde EXCEL
          </button>
          <button className="prodlist__add" type="button" onClick={abrirNuevo} title="Agregar producto">
            +
          </button>
        </div>

        {error && <p className="alert alert--error">{error}</p>}
        {msg && <p className="alert alert--ok">{msg}</p>}

        <table className="tabla">
          <thead>
            <tr>
              <th></th>
              <th>Codigo</th>
              <th>Grupo</th>
              <th>Descripcion</th>
              <th className="num">Impuesto</th>
              <th className="num">P_Compra</th>
              <th className="num">P_mayoreo</th>
              <th className="num">Stock_minimo</th>
              <th>F_vencimiento</th>
              <th className="num">Stock</th>
              <th className="num">P_venta</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id}>
                <td className="acc">
                  <button className="ico ico--del" title="Eliminar" onClick={() => borrar(p.id)}>✕</button>
                  <button className="ico ico--edit" title="Editar" onClick={() => abrirEditar(p)}>✎</button>
                </td>
                <td>{p.codigo}</td>
                <td>{grupoNombre(p.idGrupo)}</td>
                <td>{p.descripcion}</td>
                <td className="num">{p.impuesto ?? '0'}</td>
                <td className="num">{(p.precioCompra ?? 0).toFixed(2)}</td>
                <td className="num">{(p.precioMayoreo ?? 0).toFixed(2)}</td>
                <td className="num">{(p.stockMinimo ?? 0).toFixed(2)}</td>
                <td>{p.fechaVencimiento ?? ''}</td>
                <td className="num">{p.usaInventarios === 'SI' ? p.stock : '—'}</td>
                <td className="num">{(p.precioVenta ?? 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="prod__footer">
          <span>Cant. de Productos: <strong>{productos.length}</strong></span>
          <span>Costo de Inventario: <strong>{costoInventario.toFixed(2)}</strong></span>
        </div>
      </main>
    );
  }

  // ---------- Vista FORMULARIO ----------
  return (
    <main className="page prod">
      <div className="prod__bar">
        <button className="btn" type="button" onClick={() => setVista('lista')}>← Volver al listado</button>
      </div>
      {error && <p className="alert alert--error">{error}</p>}

      <form className="prod__form panel" onSubmit={guardar}>
        <div className="fila">
          <label>Descripción:</label>
          <input value={f.descripcion} onChange={(e) => setF((p) => ({ ...p, descripcion: e.target.value }))} required />
        </div>

        <div className="fila">
          <label></label>
          <div className="radios">
            <label><input type="radio" checked={f.seVendeA === 'UNIDAD'} onChange={() => setF((p) => ({ ...p, seVendeA: 'UNIDAD' }))} /> Por Unidad/Pieza</label>
            <label><input type="radio" checked={f.seVendeA === 'GRANEL'} onChange={() => setF((p) => ({ ...p, seVendeA: 'GRANEL' }))} /> A granel (usa decimales)</label>
          </div>
        </div>

        <div className="fila"><label>Precio Costo:</label><input type="number" step="0.01" value={f.costo} onChange={(e) => setCosto(e.target.value)} /></div>
        <div className="fila"><label>% Ganancia:</label><input type="number" step="0.01" value={f.ganancia} onChange={(e) => setGanancia(e.target.value)} /></div>
        <div className="fila"><label>Precio venta:</label><input type="number" step="0.01" value={f.precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} /></div>
        <div className="fila">
          <label>Precio Mayoreo:</label>
          <input type="number" step="0.01" value={f.precioMayoreo} onChange={(e) => setF((p) => ({ ...p, precioMayoreo: e.target.value }))} />
          <span className="apd">A partir de:</span>
          <input className="chico" type="number" value={f.aPartirDe} onChange={(e) => setF((p) => ({ ...p, aPartirDe: e.target.value }))} />
          <span>Unidades</span>
        </div>

        <div className="fila">
          <label>Grupo:</label>
          <select value={f.idGrupo} onChange={(e) => setF((p) => ({ ...p, idGrupo: e.target.value ? Number(e.target.value) : '' }))}>
            <option value="">— sin grupo —</option>
            {grupos.map((g) => (<option key={g.idLine} value={g.idLine}>{g.linea}</option>))}
          </select>
          <button type="button" onClick={() => setMostrarNuevoGrupo((v) => !v)}>+ Agregar Grupo</button>
        </div>
        {mostrarNuevoGrupo && (
          <div className="fila">
            <label></label>
            <input placeholder="Nombre del grupo" value={nuevoGrupo} onChange={(e) => setNuevoGrupo(e.target.value)} />
            <button type="button" onClick={agregarGrupo}>Guardar grupo</button>
          </div>
        )}

        <div className="fila">
          <label>Código de barras:</label>
          <input value={f.codigo} onChange={(e) => setF((p) => ({ ...p, codigo: e.target.value }))} />
          <button type="button" onClick={generarCodigo}>Generar código</button>
        </div>

        <div className="prod__inv">
          <label className="inv__title">
            <input type="checkbox" checked={f.controlar} onChange={(e) => setF((p) => ({ ...p, controlar: e.target.checked }))} /> Controlar inventarios
          </label>
          {f.controlar && (
            <>
              <div className="fila"><label>Hay:</label><input type="number" step="0.01" value={f.stock} onChange={(e) => setF((p) => ({ ...p, stock: e.target.value }))} /> <span>en este momento.</span></div>
              <div className="fila"><label>Mínimo:</label><input type="number" step="0.01" value={f.stockMinimo} onChange={(e) => setF((p) => ({ ...p, stockMinimo: e.target.value }))} /></div>
              <div className="fila">
                <label>Fecha de Venc:</label>
                <input type="date" value={f.fechaVencimiento} disabled={f.noAplicaVenc} onChange={(e) => setF((p) => ({ ...p, fechaVencimiento: e.target.value }))} />
                <label><input type="checkbox" checked={f.noAplicaVenc} onChange={(e) => setF((p) => ({ ...p, noAplicaVenc: e.target.checked }))} /> No aplica</label>
              </div>
            </>
          )}
        </div>

        <button className="btn btn--primary prod__guardar" type="submit">
          {f.id ? 'Actualizar' : 'Guardar'}
        </button>
      </form>
    </main>
  );
}
