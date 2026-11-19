// Texto da Receita: números no formato brasileiro, números por extenso e palavras no singular ou no plural.

// Até 6 casas, como a Quantidade total: com as 3 do padrão, a Dose "0,3333" apareceria como 0,333.
export const numero = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 6 });

const UNIDADES = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function ate999(n) {
  if (n === 100) return 'cem';
  const partes = n >= 100 ? [CENTENAS[Math.floor(n / 100)]] : [];
  const resto = n % 100;
  if (resto >= 20) partes.push(DEZENAS[Math.floor(resto / 10)] + (resto % 10 ? ` e ${UNIDADES[resto % 10]}` : ''));
  else if (resto || !partes.length) partes.push(UNIDADES[resto]);
  return partes.join(' e ');
}

function noMasculino(n) {
  if (!Number.isInteger(n) || n < 0 || n > 999999) return null;
  if (n < 1000) return ate999(n);
  const milhares = Math.floor(n / 1000);
  const resto = n % 1000;
  const mil = milhares === 1 ? 'mil' : `${ate999(milhares)} mil`;
  if (!resto) return mil;
  return `${mil}${resto < 100 || resto % 100 === 0 ? ' e ' : ' '}${ate999(resto)}`;
}

// "um" → "uma", "dois" → "duas", "duzentos" → "duzentas"; "mil" e "cento" não variam: "duas mil gotas".
const FEMININOS = { um: 'uma', dois: 'duas' };
const noFeminino = (extenso) => extenso.split(' ').map((p) => FEMININOS[p] ?? p.replace(/entos$/, 'entas')).join(' ');

// As palavras que a Receita conta, com o plural e o gênero ('f' = feminino). Uma palavra fora daqui não é escrita:
// a Montagem não calcula a Quantidade a dispensar de uma Unidade de fornecimento que não sabe escrever.
const PALAVRAS = {
  // Unidades de dose (spec, "Unidades de dose por forma"). "ml" e "UI" são símbolos e não vão para o plural.
  comprimido: ['comprimido', 'comprimidos'],
  cápsula: ['cápsula', 'cápsulas', 'f'],
  drágea: ['drágea', 'drágeas', 'f'],
  ml: ['ml', 'ml'],
  gota: ['gota', 'gotas', 'f'],
  jato: ['jato', 'jatos'],
  dose: ['dose', 'doses', 'f'],
  UI: ['UI', 'UI', 'f'],
  ampola: ['ampola', 'ampolas', 'f'],
  'frasco-ampola': ['frasco-ampola', 'frascos-ampola'],
  aplicação: ['aplicação', 'aplicações', 'f'],
  adesivo: ['adesivo', 'adesivos'],
  supositório: ['supositório', 'supositórios'],
  óvulo: ['óvulo', 'óvulos'],
  sachê: ['sachê', 'sachês'],
  // Unidades de fornecimento com conteúdo em ml, doses ou g, além das que já são Unidades de dose.
  frasco: ['frasco', 'frascos'],
  seringa: ['seringa', 'seringas', 'f'],
  carpule: ['carpule', 'carpules'],
  flaconete: ['flaconete', 'flaconetes'],
  tubete: ['tubete', 'tubetes'],
  bisnaga: ['bisnaga', 'bisnagas', 'f'],
  tubo: ['tubo', 'tubos'],
  pote: ['pote', 'potes'],
  bolsa: ['bolsa', 'bolsas', 'f'],
  unidade: ['unidade', 'unidades', 'f'],
  // Posologia e duração.
  vez: ['vez', 'vezes', 'f'],
  hora: ['hora', 'horas', 'f'],
  dia: ['dia', 'dias'],
  semana: ['semana', 'semanas', 'f'],
  mes: ['mês', 'meses'],
  // Idade do paciente.
  ano: ['ano', 'anos'],
};

export const sabeEscrever = (palavra) => Object.hasOwn(PALAVRAS, palavra);
const feminina = (palavra) => PALAVRAS[palavra]?.[2] === 'f';

// Inteiros de 0 a 999.999, concordando com a palavra contada: "dois frascos", "duas ampolas". Fora disso devolve null.
export function porExtenso(n, palavra) {
  const extenso = noMasculino(n);
  return extenso && feminina(palavra) ? noFeminino(extenso) : extenso;
}

export const plural = (palavra) => PALAVRAS[palavra][1];

// "o frasco", "a bisnaga".
export const artigo = (palavra) => (feminina(palavra) ? 'a' : 'o');

// Em português, o plural vem a partir de 2, e também no zero: "1,5 comprimido", "2 comprimidos", "0 dias".
const flexionar = (palavra, n) => PALAVRAS[palavra][n >= 2 || n === 0 ? 1 : 0];

// Dose fracionada (decisão de 06/11/2026): o extenso diz meios e quartos, as partes em que se divide um comprimido, e a
// Receita os escreve em fração (decisão do usuário de 09/11/2026). Abaixo de 1, o quarto leva "de": "1/4 (um quarto de)
// comprimido", mas "1/2 (meio) comprimido". O quarto não varia com o gênero; o meio, sim: "1/2 (meia) UI".
const FRACOES = new Map([[0.5, ['1/2', 'meio']], [0.25, ['1/4', 'um quarto']], [0.75, ['3/4', 'três quartos']]]);

// "um e meio", "três quartos de"; outros decimais (0,1) não têm extenso.
function extensoComFracao(n, palavra) {
  const inteiro = Math.floor(n);
  const [, fracao] = FRACOES.get(n - inteiro) ?? [];
  if (!fracao) return porExtenso(n, palavra);
  const nome = fracao === 'meio' && feminina(palavra) ? 'meia' : fracao;
  if (!inteiro) return fracao === 'meio' ? nome : `${nome} de`;
  const extensoDoInteiro = porExtenso(inteiro, palavra);
  return extensoDoInteiro && `${extensoDoInteiro} e ${nome}`;
}

// "60 comprimidos"
export const contagem = (n, palavra) => `${numero(n)} ${flexionar(palavra, n)}`;

// A Dose e a Quantidade na Receita (decisões do usuário de 09/11/2026): o inteiro sem extenso e, de 1 a 9, com zero à
// esquerda, "01 comprimido", "60 comprimidos"; o meio e o quarto em fração e com o extenso, "1 1/2 (um e meio)
// comprimido"; outros decimais, com vírgula e sem extenso, "0,1 ml". Com extensoDoInteiro, o inteiro também leva o
// extenso, como a Quantidade da Receita de Controle Especial: "07 (sete) comprimidos".
export function contagemNaReceita(n, palavra, extensoDoInteiro = false) {
  const inteiro = Math.floor(n);
  const [fracao] = FRACOES.get(n - inteiro) ?? [];
  const escrito = fracao ? `${inteiro ? `${numero(inteiro)} ` : ''}${fracao}`
    : Number.isInteger(n) && n >= 1 && n <= 9 ? `0${n}` : numero(n);
  const extenso = fracao || extensoDoInteiro ? extensoComFracao(n, palavra) : null;
  return `${escrito}${extenso ? ` (${extenso})` : ''} ${flexionar(palavra, n)}`;
}

// A Quantidade em destaque no impresso, com a Unidade de fornecimento em maiúscula: "28 Comprimidos", "07 (sete)
// Comprimidos" (decisão do usuário de 09/11/2026).
export const quantidadeEmDestaque = (texto) => texto.replace(/^(\S+ (?:\([^)]*\) )?)(\p{Ll})/u, (_, antes, letra) => antes + letra.toUpperCase());

// "A", "A e B", "A, B e C".
export const juntar = (partes) => (partes.length > 1 ? `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}` : partes[0]);

// "item 2", "itens 2 e 3", das posições a partir de 0.
export function nomeDosItens(posicoes) {
  const numeros = posicoes.map((i) => String(i + 1));
  return numeros.length > 1 ? `itens ${juntar(numeros)}` : `item ${numeros[0]}`;
}
