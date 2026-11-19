// O nome do Produto: o princípio ativo, os fármacos e a forma, comparados sem acento.
export const semAcento = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

// O nome do Produto na Frase, na busca, no relatório do catálogo e na Renovação: "Losartana potássica 50 mg — comprimido".
export const nomeDoProduto = (p) => `${p.principioAtivo} ${p.concentracao} — ${p.forma.toLowerCase()}`;

// Vias de administração: a posição é o código, guardado no catálogo e nos casos.
// - uso: Decreto 20.931/1932, art. 15, b: a Receita indica o uso, interno ou externo. Ela o diz pela Via, concordando com
//   "uso", que é mais preciso: "Uso oral", "Uso subcutâneo" (decisão do usuário de 09/11/2026).
// - verbo: o da Frase. "Aplicar" nas tópicas, que são a local, a capilar e a dermatológica, na transdérmica e nas
//   injetáveis; "Pingar" na oftálmica e na otológica; "Introduzir" na retal e na vaginal. A nasal fica com o do jato, e
//   as exceções pela Unidade de dose estão no verbo() da montagem.js. Decisões dos tickets 06, 07 e 15.
export const VIAS_DE_ADMINISTRACAO = [
  { nome: 'Oral', uso: 'oral', verbo: 'Tomar' }, // 0
  { nome: 'Parenteral', uso: 'parenteral', verbo: 'Aplicar' }, // 1
  { nome: 'Local', uso: 'local', verbo: 'Aplicar' }, // 2
  { nome: 'Outros', uso: 'por outra via', verbo: 'Usar' }, // 3
  { nome: 'Bucal', uso: 'bucal', verbo: 'Usar' }, // 4
  { nome: 'Capilar', uso: 'capilar', verbo: 'Aplicar' }, // 5
  { nome: 'Dermatológica', uso: 'dermatológico', verbo: 'Aplicar' }, // 6
  { nome: 'Epidural', uso: 'epidural', verbo: 'Aplicar' }, // 7
  { nome: 'Inalatória', uso: 'inalatório', verbo: 'Inalar' }, // 8
  { nome: 'Inalatória por via nasal', uso: 'inalatório por via nasal', verbo: 'Inalar' }, // 9
  { nome: 'Inalatória por via oral', uso: 'inalatório por via oral', verbo: 'Inalar' }, // 10
  { nome: 'Intra-arterial', uso: 'intra-arterial', verbo: 'Aplicar' }, // 11
  { nome: 'Intra-articular', uso: 'intra-articular', verbo: 'Aplicar' }, // 12
  { nome: 'Intradérmica', uso: 'intradérmico', verbo: 'Aplicar' }, // 13
  { nome: 'Intramuscular', uso: 'intramuscular', verbo: 'Aplicar' }, // 14
  { nome: 'Intratecal', uso: 'intratecal', verbo: 'Aplicar' }, // 15
  { nome: 'Intrauterina', uso: 'intrauterino', verbo: 'Usar' }, // 16
  { nome: 'Intravenosa', uso: 'intravenoso', verbo: 'Aplicar' }, // 17
  { nome: 'Irrigação', uso: 'em irrigação', verbo: 'Usar' }, // 18
  { nome: 'Nasal', uso: 'nasal', verbo: 'Aplicar' }, // 19
  { nome: 'Oftálmica', uso: 'oftálmico', verbo: 'Pingar' }, // 20
  { nome: 'Otológica', uso: 'otológico', verbo: 'Pingar' }, // 21
  { nome: 'Retal', uso: 'retal', verbo: 'Introduzir' }, // 22
  { nome: 'Subcutânea', uso: 'subcutâneo', verbo: 'Aplicar' }, // 23
  { nome: 'Sublingual', uso: 'sublingual', verbo: 'Usar' }, // 24
  { nome: 'Transdérmica', uso: 'transdérmico', verbo: 'Aplicar' }, // 25
  { nome: 'Uretral', uso: 'uretral', verbo: 'Usar' }, // 26
  { nome: 'Vaginal', uso: 'vaginal', verbo: 'Introduzir' }, // 27
];

export const LIQUIDO_ORAL = /^(solucao oral|sol oral|suspensao oral|susp oral|emulsao oral|xarope|xpe|elixir)\b/;
// A forma como no CATMAT; o catálogo usa a mesma regra para alcançar a lista de gotas (ticket 28).
export const liquidoOral = (forma) => LIQUIDO_ORAL.test(semAcento(forma));

// Os fármacos de um princípio ativo, para comparar: cada componente da combinação, sem o sal escrito antes dele
// ("Succinato de metoprolol" e "Tartarato de metoprolol" são metoprolol), sem o que vem entre parênteses ("(25 mg/ml de
// ferro elementar)") e sem o que o CATMAT deixa depois da vírgula: o sal ("Metoclopramida, Cloridrato", "Clemastina,
// Fumarato de") e a concentração ("…, 10 + 5 Mg/ml"). O fármaco que termina em "-ato" fica: "Topiramato". Cada um traz a
// chave, sem acento e em minúsculas, o nome, como no catálogo, e o componente inteiro, com o sal, sem acento e em
// minúsculas ("hidrato de cloral", "carbonato de litio").
const SAL_ANTES = /^(\p{L}+(?:ato|eto|ito)(?: (?:sódic|dissódic)[oa])?) de (.+)$/iu;
// Quando o que vem depois do "de" é um cátion, o fármaco é o próprio "-ato": "Alendronato de sódio", "Cloreto de
// potássio". O sal só sai quando sobra um fármaco: "Cloridrato de metformina".
const CATIONS = new Set(['sodio', 'potassio', 'calcio', 'magnesio', 'zinco', 'litio', 'aluminio', 'amonio', 'ferro']);
const semSalAntes = (componente) => {
  const [, , resto] = componente.match(SAL_ANTES) ?? [];
  return resto && !CATIONS.has(semAcento(resto)) ? resto : componente;
};
// O catálogo usa o mesmo nome para ligar o Produto às listas da Portaria 344 (ticket 17).
export function farmacos(principioAtivo) {
  return principioAtivo.replace(/\([^)]*\)/g, '').split(/\s*\+\s*/)
    .map((componente) => componente.split(',')[0].trim())
    .filter((componente) => componente && !/^\d/.test(componente))
    .map((componente) => {
      const nome = semSalAntes(componente);
      return { chave: semAcento(nome), nome, componente: semAcento(componente) };
    });
}
