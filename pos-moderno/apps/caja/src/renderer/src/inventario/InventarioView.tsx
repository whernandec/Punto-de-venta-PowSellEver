import { useEffect, useMemo, useState } from 'react';
import type {
  InventarioItemDTO,
  MovimientoKardexDTO,
  ProductoDTO,
  VencimientoItemDTO,
} from '@pos/types';
import { TipoMovimientoKardex } from '@pos/types';
import {
  ajusteInventario,
  inventarioBajoMinimo,
  movimientosKardex,
  obtenerInventario,
  obtenerProductos,
  vencimientosInventario,
} from '../api';

interface Props {
  idCaja: number;
  idUsuario: number;
}

type Tab = 'kardex' | 'movimientos' | 'bajos' | 'reporte' | 'vencimientos';

const TABS: { k: Tab; label: string; icon: string }[] = [
  { k: 'kardex', label: 'Kardex', icon: '📊' },
  { k: 'movimientos', label: 'Movimientos', icon: '🔄' },
  { k: 'bajos', label: 'Inventarios Bajos', icon: '📉' },
  { k: 'reporte', label: 'Reporte Inventarios', icon: '📋' },
  { k: 'vencimientos', label: 'Vencimientos de Productos', icon: '📅' },
];

const n = (v: number | string | null | undefined): string =>
  v == null || v === '' ? '0.00' : Number(v).toFixed(2);

export function InventarioView({ idCaja, idUsuario }: Props): JSX.Element {
  const [tab, setTab] = useState<Tab>('kardex');
  const [productos, setProductos] = useState<ProductoDTO[]>([]);
  const [ajuste, setAjuste] = useState<null | 'Entrada' | 'Salida'>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    obtenerProductos()
      .then(setProductos)
      .catch(() => setProductos([]));
  }, [refresh]);

  return (
    <div className="inv">
      <header className="inv__top">
        <h2>Inventarios</h2>
        <nav className="inv__tabs">
          {TABS.map((t) => (
            <button
              key={t.k}
              className={`inv__tab ${tab === t.k ? 'inv__tab--on' : ''}`}
              onClick={() => setTab(t.k)}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </nav>
        <div className="inv__acc">
          <button className="inv__io inv__io--in" onClick={() => setAjuste('Entrada')}>
            Entrada ↩
          </button>
          <button className="inv__io inv__io--out" onClick={() => setAjuste('Salida')}>
            Salida ↪
          </button>
        </div>
      </header>

      <div className="inv__body" key={`${tab}-${refresh}`}>
        {tab === 'kardex' && <KardexTab productos={productos} />}
        {tab === 'movimientos' && <MovimientosTab productos={productos} />}
        {tab === 'bajos' && <BajosTab />}
        {tab === 'reporte' && <ReporteTab />}
        {tab === 'vencimientos' && <VencimientosTab />}
      </div>

      {ajuste && (
        <AjusteModal
          tipo={ajuste}
          productos={productos}
          idCaja={idCaja}
          idUsuario={idUsuario}
          onClose={() => setAjuste(null)}
          onDone={() => {
            setAjuste(null);
            setRefresh((r) => r + 1);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Buscador de producto con autocompletar ---------- */
function ProductoBuscador({
  productos,
  onSelect,
  placeholder,
}: {
  productos: ProductoDTO[];
  onSelect: (p: ProductoDTO | null) => void;
  placeholder: string;
}): JSX.Element {
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState(false);

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return productos
      .filter((p) =>
        `${p.descripcion ?? ''} ${p.codigo ?? ''}`.toLowerCase().includes(t),
      )
      .slice(0, 8);
  }, [q, productos]);

  return (
    <div className="inv__search">
      <span className="inv__search-ico">🔍</span>
      <input
        value={q}
        placeholder={placeholder}
        onChange={(e) => {
          setQ(e.target.value);
          setAbierto(true);
          if (!e.target.value) onSelect(null);
        }}
        onFocus={() => setAbierto(true)}
      />
      {abierto && matches.length > 0 && (
        <ul className="inv__ac">
          {matches.map((p) => (
            <li
              key={p.id}
              onClick={() => {
                onSelect(p);
                setQ(
                  `${p.descripcion} /Precio: ${n(p.precioVenta)} /Codigo: ${p.codigo ?? ''}`,
                );
                setAbierto(false);
              }}
            >
              <strong>{p.descripcion}</strong>
              <span className="muted">
                {' '}
                · {p.codigo} · S/ {n(p.precioVenta)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Kardex ---------- */
function KardexTab({ productos }: { productos: ProductoDTO[] }): JSX.Element {
  const [prod, setProd] = useState<ProductoDTO | null>(null);
  const [movs, setMovs] = useState<MovimientoKardexDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!prod) return setMovs([]);
    movimientosKardex(prod.id)
      .then(setMovs)
      .catch((e: Error) => setError(e.message));
  }, [prod]);

  const existencia = movs.length ? movs[0].hay ?? 0 : 0;

  return (
    <>
      <ProductoBuscador
        productos={productos}
        onSelect={setProd}
        placeholder="Buscar producto para ver su Kardex…"
      />
      {error && <p className="alert alert--error">{error}</p>}
      {!prod ? (
        <p className="muted inv__vacio">Busca un producto para ver su Kardex.</p>
      ) : (
        <div className="kardex">
          <div className="kardex__head">
            <h3>Kardex de Inventario</h3>
            <div className="kardex__meta">
              <span>
                <strong>Producto:</strong> {prod.descripcion}
              </span>
              <span>
                <strong>Existencia Actual:</strong> {n(existencia)}
              </span>
              <span className="muted">{new Date().toLocaleString()}</span>
            </div>
            <button className="inv__print" onClick={() => window.print()}>
              🖨 Imprimir
            </button>
          </div>
          <table className="tabla kardex__tabla">
            <thead>
              <tr>
                <th rowSpan={2}>Fecha</th>
                <th rowSpan={2}>Detalle</th>
                <th colSpan={3} className="kardex__g kardex__g--in">ENTRADA</th>
                <th colSpan={3} className="kardex__g kardex__g--out">SALIDA</th>
                <th colSpan={3} className="kardex__g kardex__g--ex">Existencias</th>
              </tr>
              <tr>
                <th className="num">Cant</th><th className="num">C.Unit</th><th className="num">Total</th>
                <th className="num">Cant</th><th className="num">C.Unit</th><th className="num">Total</th>
                <th className="num">Cant</th><th className="num">C.Unit</th><th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {movs.map((m) => {
                const esEntrada = (m.tipo ?? '').toUpperCase() === 'ENTRADA';
                const cu = m.costoUnt ?? 0;
                const cant = m.cantidad ?? 0;
                const total = cant * cu;
                const hay = m.hay ?? 0;
                return (
                  <tr key={m.idKardex}>
                    <td>{m.fecha ? new Date(m.fecha).toLocaleString() : ''}</td>
                    <td>{m.motivo}</td>
                    <td className="num">{esEntrada ? n(cant) : ''}</td>
                    <td className="num">{esEntrada ? n(cu) : ''}</td>
                    <td className="num">{esEntrada ? n(total) : ''}</td>
                    <td className="num">{!esEntrada ? n(cant) : ''}</td>
                    <td className="num">{!esEntrada ? n(cu) : ''}</td>
                    <td className="num">{!esEntrada ? n(total) : ''}</td>
                    <td className="num">{n(hay)}</td>
                    <td className="num">{n(cu)}</td>
                    <td className="num">{n(hay * cu)}</td>
                  </tr>
                );
              })}
              {movs.length === 0 && (
                <tr>
                  <td colSpan={11} className="muted">Sin movimientos.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ---------- Movimientos ---------- */
function MovimientosTab({ productos }: { productos: ProductoDTO[] }): JSX.Element {
  const [prod, setProd] = useState<ProductoDTO | null>(null);
  const [movs, setMovs] = useState<MovimientoKardexDTO[]>([]);

  useEffect(() => {
    if (!prod) return setMovs([]);
    movimientosKardex(prod.id).then(setMovs).catch(() => setMovs([]));
  }, [prod]);

  return (
    <>
      <ProductoBuscador
        productos={productos}
        onSelect={setProd}
        placeholder="Buscar producto para ver sus movimientos…"
      />
      <div className="inv__toolbar">
        <button className="inv__print" onClick={() => window.print()}>
          🖨 Imprimir
        </button>
      </div>
      {!prod ? (
        <p className="muted inv__vacio">Busca un producto para ver sus movimientos.</p>
      ) : (
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th>Movimiento</th>
              <th className="num">Había</th>
              <th>Tipo</th>
              <th className="num">Cantidad</th>
              <th className="num">Hay</th>
              <th>Cajero</th>
              <th>Categoría</th>
            </tr>
          </thead>
          <tbody>
            {movs.map((m) => {
              const esEntrada = (m.tipo ?? '').toUpperCase() === 'ENTRADA';
              return (
                <tr key={m.idKardex}>
                  <td>{m.fecha ? new Date(m.fecha).toLocaleString() : ''}</td>
                  <td>{m.descripcion}</td>
                  <td>{m.motivo}</td>
                  <td className="num">{n(m.habia)}</td>
                  <td>
                    <span className={`inv__tipo ${esEntrada ? 'inv__tipo--in' : 'inv__tipo--out'}`}>
                      {m.tipo}
                    </span>
                  </td>
                  <td className="num">{n(m.cantidad)}</td>
                  <td className="num">{n(m.hay)}</td>
                  <td>{m.cajero}</td>
                  <td>{m.categoria}</td>
                </tr>
              );
            })}
            {movs.length === 0 && (
              <tr>
                <td colSpan={9} className="muted">Sin movimientos.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </>
  );
}

/* ---------- Inventarios bajos ---------- */
function BajosTab(): JSX.Element {
  const [items, setItems] = useState<InventarioItemDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inventarioBajoMinimo()
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <div className="inv__toolbar">
        <button className="inv__print" onClick={() => window.print()}>
          🖨 Imprimir
        </button>
        <span className="muted">
          Estos productos están debajo del mínimo de STOCK, te recomendamos que
          gestiones tus productos.
        </span>
      </div>
      {error && <p className="alert alert--error">{error}</p>}
      <table className="tabla">
        <thead>
          <tr>
            <th>Código</th>
            <th>Descripción</th>
            <th className="num">Precio de Compra</th>
            <th className="num">Stock</th>
            <th className="num">Stock Mínimo</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.idProducto} className="fila--alerta">
              <td>{it.codigo}</td>
              <td>{it.descripcion}</td>
              <td className="num">{n(it.costo)}</td>
              <td className="num">{n(it.stock)}</td>
              <td className="num">{n(it.stockMinimo)}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                No hay productos bajo el mínimo. 🎉
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}

/* ---------- Reporte de inventario ---------- */
const POR_PAGINA = 15;
function ReporteTab(): JSX.Element {
  const [items, setItems] = useState<InventarioItemDTO[]>([]);
  const [q, setQ] = useState('');
  const [aplicado, setAplicado] = useState('');
  const [pagina, setPagina] = useState(1);
  const [error, setError] = useState<string | null>(null);

  function cargar(filtro: string): void {
    obtenerInventario(filtro)
      .then((d) => {
        setItems(d);
        setPagina(1);
      })
      .catch((e: Error) => setError(e.message));
  }
  useEffect(() => cargar(''), []);

  const totalImporte = items.reduce((s, it) => s + Number(it.importe ?? 0), 0);
  const paginas = Math.max(1, Math.ceil(items.length / POR_PAGINA));
  const visibles = items.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <>
      <div className="inv__resumen">
        <div className="inv__resumen-card">
          <span className="muted">Cantidad de Productos en Inventario</span>
          <strong>{items.length}</strong>
        </div>
        <div className="inv__resumen-card">
          <span className="muted">Costo del Inventario</span>
          <strong className="verde">{n(totalImporte)}</strong>
        </div>
      </div>

      <div className="inv__toolbar">
        <input
          className="inv__input"
          placeholder="Buscar producto…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setAplicado(q);
              cargar(q);
            }
          }}
        />
        <button
          className="btn btn--primary"
          onClick={() => {
            setAplicado(q);
            cargar(q);
          }}
        >
          Buscar
        </button>
        <button
          className="inv__mostrar"
          onClick={() => {
            setQ('');
            setAplicado('');
            cargar('');
          }}
        >
          Mostrar TODO
        </button>
        <button className="inv__print" onClick={() => window.print()}>
          🖨 Imprimir
        </button>
      </div>

      {error && <p className="alert alert--error">{error}</p>}
      {aplicado && <p className="muted">Filtro: “{aplicado}”</p>}

      <table className="tabla inv__reporte">
        <thead>
          <tr>
            <th>Código</th>
            <th>Descripción</th>
            <th className="num">Costo</th>
            <th className="num">Precio Venta</th>
            <th className="num">Stock</th>
            <th className="num">Stock Mínimo</th>
            <th>Categoría</th>
            <th className="num">Importe</th>
          </tr>
        </thead>
        <tbody>
          {visibles.map((it) => (
            <tr key={it.idProducto}>
              <td>{it.codigo}</td>
              <td>{it.descripcion}</td>
              <td className="num">{n(it.costo)}</td>
              <td className="num">{n(it.precioVenta)}</td>
              <td className="num">{n(it.stock)}</td>
              <td className="num">{n(it.stockMinimo)}</td>
              <td>{it.categoria}</td>
              <td className="num">{n(it.importe)}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={8} className="muted">Sin productos.</td>
            </tr>
          )}
        </tbody>
      </table>

      {paginas > 1 && (
        <div className="inv__pager">
          <button disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
            ← Anterior
          </button>
          <span>
            Página {pagina} de {paginas}
          </span>
          <button disabled={pagina >= paginas} onClick={() => setPagina((p) => p + 1)}>
            Siguiente →
          </button>
        </div>
      )}
    </>
  );
}

/* ---------- Vencimientos ---------- */
function VencimientosTab(): JSX.Element {
  const [modo, setModo] = useState<'por_vencer' | 'vencidos'>('por_vencer');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<VencimientoItemDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    vencimientosInventario(modo, 30, q)
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, [modo, q]);

  return (
    <>
      <div className="inv__venc-top">
        <input
          className="inv__input"
          placeholder="Buscar producto / código…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <fieldset className="inv__filtros">
          <legend>Filtros</legend>
          <label>
            <input
              type="radio"
              name="venc"
              checked={modo === 'por_vencer'}
              onChange={() => setModo('por_vencer')}
            />
            Por vencer en menos de 30 días
          </label>
          <label>
            <input
              type="radio"
              name="venc"
              checked={modo === 'vencidos'}
              onChange={() => setModo('vencidos')}
            />
            Productos vencidos (todos)
          </label>
        </fieldset>
        <button className="inv__print" onClick={() => window.print()}>
          🖨 Imprimir
        </button>
      </div>

      {error && <p className="alert alert--error">{error}</p>}

      <table className="tabla">
        <thead>
          <tr>
            <th>Código</th>
            <th>Descripción</th>
            <th>F. Vencimiento</th>
            <th className="num">Stock</th>
            <th className="num">Días a Vencer</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr
              key={it.idProducto}
              className={(it.diasAVencer ?? 0) < 0 ? 'fila--alerta' : ''}
            >
              <td>{it.codigo}</td>
              <td>{it.descripcion}</td>
              <td>{it.fechaVencimiento}</td>
              <td className="num">{n(it.stock)}</td>
              <td className="num">{it.diasAVencer}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                {modo === 'vencidos'
                  ? 'No hay productos vencidos.'
                  : 'No hay productos por vencer en 30 días.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}

/* ---------- Modal Entrada / Salida ---------- */
function AjusteModal({
  tipo,
  productos,
  idCaja,
  idUsuario,
  onClose,
  onDone,
}: {
  tipo: 'Entrada' | 'Salida';
  productos: ProductoDTO[];
  idCaja: number;
  idUsuario: number;
  onClose: () => void;
  onDone: () => void;
}): JSX.Element {
  const [prod, setProd] = useState<ProductoDTO | null>(null);
  const [cantidad, setCantidad] = useState('1');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function aplicar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (!prod) return setError('Selecciona un producto.');
    if (!(Number(cantidad) > 0)) return setError('La cantidad debe ser mayor a 0.');
    if (!motivo.trim()) return setError('Indica un motivo.');
    setGuardando(true);
    try {
      await ajusteInventario({
        idProducto: prod.id,
        idCaja,
        idUsuario,
        tipo:
          tipo === 'Entrada'
            ? TipoMovimientoKardex.Entrada
            : TipoMovimientoKardex.Salida,
        cantidad: Number(cantidad),
        motivo,
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="modal__fondo" onClick={onClose}>
      <form
        className="modal__caja"
        onClick={(e) => e.stopPropagation()}
        onSubmit={aplicar}
      >
        <h3>
          {tipo === 'Entrada' ? '↩ Entrada de inventario' : '↪ Salida de inventario'}
        </h3>
        {error && <p className="alert alert--error">{error}</p>}
        <ProductoBuscador
          productos={productos}
          onSelect={setProd}
          placeholder="Buscar producto…"
        />
        {prod && (
          <p className="muted">
            {prod.descripcion} · stock actual: {prod.stock ?? '0'}
          </p>
        )}
        <label className="modal__campo">
          Cantidad
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
        </label>
        <label className="modal__campo">
          Motivo
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </label>
        <div className="modal__btns">
          <button className="btn btn--primary" type="submit" disabled={guardando}>
            {guardando ? 'Aplicando…' : `Aplicar ${tipo}`}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
