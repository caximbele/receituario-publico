// Quando o quadro Padrões aparece (ADR 0011): os Padrões são de adulto, e a pediatria fica para a versão 2.
import { mesesCompletos } from './datas.js';

export const ALERTA_SEM_NASCIMENTO = 'Sem a data de nascimento: confira se o paciente tem 12 anos ou mais antes de usar um Padrão.';

// 12 anos completos na data de emissão. Sem data de nascimento válida, o quadro aparece, com o alerta.
export function quadroDosPadroes(nascimento, emissao) {
  const meses = mesesCompletos(nascimento, emissao);
  if (meses === null) return { mostrar: true, alerta: ALERTA_SEM_NASCIMENTO };
  return { mostrar: meses >= 12 * 12, alerta: null };
}
