import {
  numeroALetras,
  type DisenoComprobante,
  type VentaComprobante,
} from './comprobante';

/**
 * Comprobante (ticket) renderizado a partir del diseño configurable + los datos
 * de la venta. Se usa en el diseñador (con venta de ejemplo) y tras cada venta.
 */
export function TicketComprobante({
  diseno,
  venta,
}: {
  diseno: DisenoComprobante;
  venta: VentaComprobante;
}): JSX.Element {
  const esFactura = diseno.formato === 'FACTURA';
  const simbolo = 'S/.';

  return (
    <div className="tk" id="ticket-print">
      <div className="tk__logo">{diseno.logo ? <img src={diseno.logo} alt="logo" /> : 'TU LOGO AQUÍ'}</div>

      <div className="tk__empresa">{venta.empresa}</div>
      <div className="tk__band">{diseno.identificadorFiscal}</div>
      <div className="tk__band">{diseno.direccion}</div>
      <div className="tk__band">{diseno.provinciaDepartamentoPais}</div>

      <div className="tk__doc">{esFactura ? 'FACTURA' : 'TICKET'} : {venta.numeroDoc}</div>
      <div className="tk__barcode" aria-hidden />

      <div className="tk__row"><span>Cajero:</span><strong>{venta.cajero}</strong></div>
      <div className="tk__row"><span>Fecha Emisión:</span><strong>{venta.fecha}</strong></div>
      <div className="tk__row"><span>Cliente:</span><strong>{venta.cliente}</strong></div>

      <table className="tk__items">
        <thead>
          <tr><th>Cant.</th><th>Descripción</th><th className="num">Importe</th></tr>
        </thead>
        <tbody>
          {venta.lineas.map((l, i) => (
            <tr key={i}>
              <td>{l.cantidad}</td>
              <td>{l.descripcion}</td>
              <td className="num">{simbolo} {(l.cantidad * l.precio).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="tk__tot"><span>Sub Total:</span><span>{simbolo} {venta.subtotal.toFixed(2)}</span></div>
      <div className="tk__tot"><span>Descuento:</span><span>{simbolo} {venta.descuento.toFixed(2)}</span></div>
      <div className="tk__tot tk__tot--big"><span>TOTAL:</span><span>{simbolo} {venta.total.toFixed(2)}</span></div>

      <div className="tk__son">
        SON: {numeroALetras(venta.total)} <span className="tk__band tk__band--inline">{diseno.nombreDeMoneda}</span>
      </div>

      <div className="tk__tot"><span>EFECTIVO:</span><span>{simbolo} {venta.efectivo.toFixed(2)}</span></div>
      <div className="tk__tot"><span>VUELTO:</span><span>{simbolo} {venta.vuelto.toFixed(2)}</span></div>
      <div className="tk__tot"><span>Tipo de Pago:</span><span>{venta.tipoPago}</span></div>

      <div className="tk__row tk__prods"><span>Número de Productos</span><strong>{venta.numProductos}</strong></div>

      <div className="tk__band">{diseno.agradecimiento}</div>
      <div className="tk__band">{diseno.paginaWebFacebook}</div>
      <div className="tk__band">{diseno.anuncio}</div>

      <div className="tk__stars">**********************************</div>
      <div className="tk__qr" aria-hidden />

      {esFactura && <div className="tk__band tk__fiscal">{diseno.datosFiscales}</div>}
    </div>
  );
}
