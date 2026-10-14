import { useEffect, useState } from 'react';
import { obtenerTicket } from '../api';
import {
  DISENO_DEFAULT,
  type DisenoComprobante,
  type FormatoComprobante,
  type VentaComprobante,
} from '../ticket/comprobante';
import { TicketComprobante } from '../ticket/TicketComprobante';

/** Datos que la venta entrega para pintar el comprobante. */
export type TicketData = VentaComprobante;

function aDiseno(d: Record<string, unknown>): DisenoComprobante {
  const s = (k: string, def: string): string => {
    const v = d[k];
    return typeof v === 'string' && v.trim() ? v : def;
  };
  return {
    formato: (d.formato === 'FACTURA' ? 'FACTURA' : 'TICKET') as FormatoComprobante,
    logo: typeof d.logo === 'string' ? d.logo : '',
    identificadorFiscal: s('identificadorFiscal', DISENO_DEFAULT.identificadorFiscal),
    direccion: s('direccion', DISENO_DEFAULT.direccion),
    provinciaDepartamentoPais: s('provinciaDepartamentoPais', DISENO_DEFAULT.provinciaDepartamentoPais),
    nombreDeMoneda: s('nombreDeMoneda', DISENO_DEFAULT.nombreDeMoneda),
    agradecimiento: s('agradecimiento', DISENO_DEFAULT.agradecimiento),
    paginaWebFacebook: s('paginaWebFacebook', DISENO_DEFAULT.paginaWebFacebook),
    anuncio: s('anuncio', DISENO_DEFAULT.anuncio),
    datosFiscales: s('datosFiscales', DISENO_DEFAULT.datosFiscales),
  };
}

interface Props {
  data: TicketData;
  onNueva: () => void;
}

export function TicketPreview({ data, onNueva }: Props): JSX.Element {
  const [diseno, setDiseno] = useState<DisenoComprobante>(DISENO_DEFAULT);

  useEffect(() => {
    obtenerTicket()
      .then((d) => setDiseno(aDiseno((d as Record<string, unknown>) ?? {})))
      .catch(() => undefined);
  }, []);

  return (
    <div className="modal-overlay">
      <div className="tkprev" onClick={(e) => e.stopPropagation()}>
        <button className="cobro__x" onClick={onNueva}>✕</button>
        <div className="tkprev__cols">
          <div className="tkprev__ticket">
            <TicketComprobante diseno={diseno} venta={data} />
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
