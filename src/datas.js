// As datas da Receita, em "aaaa-mm-dd", contadas em UTC para o fuso não mudar o dia.
import { contagem } from './texto.js';

const MS_POR_DIA = 86400000;

// "aaaa-mm-dd" de uma data que existe: "2027-02-30" não existe.
export function dataExiste(texto) {
  const [a, m, d] = texto.split('-').map(Number);
  const data = new Date(Date.UTC(a, m - 1, d));
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) && data.getUTCMonth() === m - 1 && data.getUTCDate() === d;
}

// "2026-11-06" → "06/11/2026".
export const dataBrasileira = (data) => data.split('-').reverse().join('/');

// Os meses da data da assinatura, em minúscula: "06 de novembro de 2026".
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// O início ("aaaa-mm-dd") mais k meses no calendário, em ms; dia inexistente vira o último do mês (31/01 + 1 mês = 28/02).
export function somarMeses(inicio, k) {
  const [a, m, d] = inicio.split('-').map(Number);
  const ultimoDia = new Date(Date.UTC(a, m + k, 0)).getUTCDate();
  return Date.UTC(a, m - 1 + k, Math.min(d, ultimoDia));
}

// "aaaa-mm-dd" mais n dias: "2026-11-06" + 5 = "2026-11-11".
export function somarDias(data, dias) {
  const [a, m, d] = data.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

// Semana = 7 dias. Mês contado no calendário a partir do início.
export function emDias({ valor, unidade }, inicio) {
  if (unidade === 'dia') return valor;
  if (unidade === 'semana') return valor * 7;
  return (somarMeses(inicio, valor) - somarMeses(inicio, 0)) / MS_POR_DIA;
}

// Quantas datas mensais (o início mais 0, 1, 2… meses) caem em [início, início + dias). Todos os meses antes do mês
// do fim contam; o do fim conta se a data dele vem antes do fim.
export function datasMensais(inicio, dias) {
  const comeco = new Date(somarMeses(inicio, 0));
  const fim = new Date(comeco.getTime() + dias * MS_POR_DIA);
  const meses = (fim.getUTCFullYear() - comeco.getUTCFullYear()) * 12 + fim.getUTCMonth() - comeco.getUTCMonth();
  return meses + (somarMeses(inicio, meses) < fim.getTime() ? 1 : 0);
}

// Os dias de "aaaa-mm-dd" a "aaaa-mm-dd".
export const diasEntre = (de, ate) => (Date.parse(ate) - Date.parse(de)) / MS_POR_DIA;

// Os meses completos do nascimento até a emissão, com o mês contando no dia do aniversário. null sem data de
// nascimento, ou com uma que não existe ou é posterior à emissão.
export function mesesCompletos(nascimento, emissao) {
  const texto = String(nascimento ?? '').trim();
  if (!dataExiste(texto) || texto > emissao) return null;
  const [anoNasc, mesNasc, diaNasc] = texto.split('-').map(Number);
  const [ano, mes, dia] = emissao.split('-').map(Number);
  return (ano - anoNasc) * 12 + (mes - mesNasc) - (dia < diaNasc ? 1 : 0);
}

// A idade na data de emissão (RDC 471/2021, art. 6º): em anos ("66 anos", "1 ano"); abaixo de 1 ano, em meses ("8
// meses"); abaixo de 1 mês, em dias ("17 dias"). Sem data de nascimento válida, a idade fica em branco, para completar
// à mão.
export function idade(nascimento, emissao) {
  const meses = mesesCompletos(nascimento, emissao);
  if (meses === null) return '';
  if (meses >= 12) return contagem(Math.floor(meses / 12), 'ano');
  if (meses >= 1) return contagem(meses, 'mes');
  return contagem(diasEntre(String(nascimento).trim(), emissao), 'dia');
}
