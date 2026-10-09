export interface TicketData {
  empresa: string;
  numeroDoc: string;
  cajero: string;
  cliente: string;
  fecha: string;
  lineas: Array<{ descripcion: string; cantidad: number; precio: number }>;
  total: number;
}

const UNID = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'];
const DEC = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CEN = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function cientos(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  if (n <= 20) return UNID[n];
  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    if (d === 2) return 'VEINTI' + UNID[u].toLowerCase().toUpperCase();
    return DEC[d] + (u ? ' Y ' + UNID[u] : '');
  }
  const c = Math.floor(n / 100);
  return CEN[c] + (n % 100 ? ' ' + cientos(n % 100) : '');
}

function numeroALetras(valor: number): string {
  const entero = Math.floor(valor);
  const cent = Math.round((valor - entero) * 100);
  let txt: string;
  if (entero === 0) txt = 'CERO';
  else if (entero < 1000) txt = cientos(entero);
  else {
    const miles = Math.floor(entero / 1000);
    const resto = entero % 1000;
    const milesTxt = miles === 1 ? 'MIL' : cientos(miles) + ' MIL';
    txt = milesTxt + (resto ? ' ' + cientos(resto) : '');
  }
  return `${txt} CON ${String(cent).padStart(2, '0')}/100`;
}

interface Props {
  data: TicketData;
  onNueva: () => void;
}

export function TicketPreview({ data, onNueva }: Props): JSX.Element {
  return (
    <div className="modal-overlay">
      <div className="tkprev" onClick={(e) => e.stopPropagation()}>
        <button className="cobro__x" onClick={onNueva}>✕</button>
        <div className="tkprev__cols">
          <div className="tkprev__ticket" id="ticket-print">
            <h3 style={{ textAlign: 'center', margin: '0 0 6px' }}>{data.empresa}</h3>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>TICKET {data.numeroDoc}</div>
            <div style={{ fontSize: 12 }}>Fecha: {data.fecha}</div>
            <div style={{ fontSize: 12 }}>Cliente: {data.cliente}</div>
            <div style={{ fontSize: 12 }}>Cajero(a): {data.cajero}</div>
            <hr />
            <table className="tkprev__tbl">
              <thead><tr><th>Cant</th><th>Producto</th><th className="num">Importe</th></tr></thead>
              <tbody>
                {data.lineas.map((l, i) => (
                  <tr key={i}>
                    <td>{l.cantidad.toFixed(2)}</td>
                    <td>{l.descripcion}</td>
                    <td className="num">{(l.cantidad * l.precio).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <hr />
            <div style={{ textAlign: 'right' }}>(0.00%): $ 0.00</div>
            <div style={{ textAlign: 'right', fontWeight: 800, fontSize: 18 }}>TOTAL: $ {data.total.toFixed(2)}</div>
            <div style={{ fontSize: 12 }}>SON: {numeroALetras(data.total)}</div>
          </div>

          <div className="tkprev__ok">
            <h2>VENTA REALIZADA CORRECTAMENTE</h2>
            <div className="tkprev__icon">🛒💲</div>
            <div className="tkprev__btns">
              <button className="btn btn--primary" onClick={() => window.print()}>🖨 Imprimir / Guardar PDF</button>
              <button className="btn" onClick={onNueva}>Nueva venta</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
