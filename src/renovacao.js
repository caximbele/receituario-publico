// A Renovação (ADR 0008): o Texto para colar da Receita anterior, colado da evolução, volta como itens da entrada da
// montarReceita. A página nunca adivinha: a linha só volta se o item, montado de novo com a emissão nova, der a mesma
// Frase sob o mesmo Tipo de receita do título. O início não volta, porque não está na Frase.
import {
  montarReceita, viaNaFrase, unidadesDeDose, UNIDADES_DE_DOSE_DO_TEXTO_LIVRE, UNIDADES_DE_FORNECIMENTO_DO_TEXTO_LIVRE,
  CONDICOES_SE_NECESSARIO, NOMES_DOS_TIPOS_DE_RECEITA,
} from './montagem.js';
import { nomeDoProduto, VIAS_DE_ADMINISTRACAO } from './produto.js';
import { buscarProdutos } from './busca.js';
import { plural } from './texto.js';

// O texto livre só volta sob a Receita simples: um controlado que saiu do catálogo não volta numa Receita simples.
const SIMPLES = 'Receita simples';
const VERBOS = '(?:Tomar|Aplicar|Inalar|Pingar|Introduzir|Usar)';
// O verbo não é lido, porque a Montagem o escreve de novo. Depois da Quantidade, só o conteúdo da Unidade de fornecimento
// (" de 1.000 ml", com o ponto do milhar) e o "para cada 30 dias" do Uso contínuo; o resto são as recomendações.
const RESTO = new RegExp(`^${VERBOS} (.+?)\\. Quantidade: (\\d[\\d.]*)(?: \\([^)]*\\))? (\\S+)`
  + '(?: de \\d[\\d.]*(?:,\\d+)? \\S+)?(?: para cada \\d+ dias)?\\.(?: (.+))?$');
const NOME_DO_TEXTO_LIVRE = new RegExp(`^(.+?)\\. (?=${VERBOS} )`);
// "01", "0,5", "1.000", "1 1/2 (um e meio)" e "1/4 (um quarto de)", seguidos da palavra da Unidade de dose.
const DOSE = '(\\d[\\d.]*(?:,\\d+)?(?: [13]/[24])?|[13]/[24])(?: \\([^)]*\\))? (\\S+)';
const DO_ITEM_COMUM = new RegExp(`^${DOSE} por via (.+?), (.+)$`);
const DA_ETAPA = new RegExp(`^${DOSE}(?: por via (.+?))?, (.+), por (\\d+) (\\S+)$`);
const DO_TURNO = new RegExp(`^${DOSE}(?: por via (.+?))? (pela manhã|à tarde|à noite)$`);
const TURNOS = { 'pela manhã': 'manha', 'à tarde': 'tarde', 'à noite': 'noite' };
const UNIDADES_DA_DURACAO = { dia: 'dia', dias: 'dia', semana: 'semana', semanas: 'semana', mês: 'mes', meses: 'mes' };
const CODIGO_DA_VIA = new Map(VIAS_DE_ADMINISTRACAO.map((_, codigo) => [viaNaFrase(codigo), codigo]));
const SINTOMA = new Map(Object.entries(CONDICOES_SE_NECESSARIO).map(([sintoma, texto]) => [texto, sintoma]));

// O trecho da Posologia entre a Via de administração e a duração, como a Montagem o escreve.
const POSOLOGIAS = [
  [/^dose única$/, () => ({ tipo: 'dose_unica' })],
  [/^(\d+) vez(?:es)? ao dia$/, (n) => ({ tipo: 'vezes_ao_dia', vezes: Number(n) })],
  [/^a cada (\d+) horas?$/, (n) => ({ tipo: 'intervalo_horas', horas: Number(n) })],
  [/^(\d+) vez(?:es)? por semana$/, (n) => ({ tipo: 'vezes_por_semana', vezes: Number(n) })],
  [/^(\d+) vez(?:es)? por mês$/, (n) => ({ tipo: 'vezes_por_mes', vezes: Number(n) })],
  [/^em dias alternados$/, () => ({ tipo: 'dias_alternados', aCadaDias: 2 })],
  [/^a cada (\d+) dias$/, (n) => ({ tipo: 'dias_alternados', aCadaDias: Number(n) })],
  [/^se (.+?), no mínimo a cada (\d+) horas?(?:, no máximo (\d+) vez(?:es)? ao dia)?$/, (condicao, horas, maximo) => ({
    tipo: 'se_necessario', sintoma: SINTOMA.get(condicao), horas: Number(horas), maximoPorDia: maximo ? Number(maximo) : null,
  })],
];
function posologiaDe(texto) {
  for (const [forma, ler] of POSOLOGIAS) {
    const m = texto.match(forma);
    if (m) return ler(...m.slice(1));
  }
  return null;
}

// O valor da Dose em texto, como se digita, sem os pontos de milhar, que a Montagem recusaria como ambíguos.
const valorDe = (escrito) => escrito.replace(/\./g, '');

// A Dose e a Posologia da Frase: { valor, palavra, via, posologia, usoContinuo?, duracao? }, ou null se não casa com a
// forma que a Montagem escreve. valor é null quando cada Turno ou Etapa tem a sua Dose.
function lerDoseEPosologia(texto) {
  if (texto.includes('; depois ')) {
    const etapas = texto.split('; depois ').map((trecho) => trecho.match(DA_ETAPA));
    if (etapas.some((m) => !m)) return null;
    return {
      valor: null,
      palavra: etapas[0][2],
      via: CODIGO_DA_VIA.get(etapas[0][3]),
      posologia: {
        tipo: 'etapas',
        etapas: etapas.map(([, dose, , , posologia, valor, unidade]) => ({
          dose: valorDe(dose), posologia: posologiaDe(posologia), duracao: { valor: Number(valor), unidade: UNIDADES_DA_DURACAO[unidade] },
        })),
      },
    };
  }
  let resto = texto;
  const extra = {};
  const duracao = resto.match(/^(.+), por (\d+) (dias?|semanas?|mês|meses)$/);
  if (resto.endsWith(', uso contínuo')) {
    extra.usoContinuo = true;
    resto = resto.slice(0, -', uso contínuo'.length);
  } else if (duracao) {
    extra.duracao = { valor: Number(duracao[2]), unidade: UNIDADES_DA_DURACAO[duracao[3]] };
    resto = duracao[1];
  }
  if (/(pela manhã|à tarde|à noite)$/.test(resto)) {
    const turnos = resto.split(/(?:, | e )(?=\d)/).map((trecho) => trecho.match(DO_TURNO));
    if (turnos.some((m) => !m)) return null;
    const posologia = { tipo: 'por_turno' };
    for (const [, dose, , , turno] of turnos) posologia[TURNOS[turno]] = valorDe(dose);
    return { valor: null, palavra: turnos[0][2], via: CODIGO_DA_VIA.get(turnos[0][3]), posologia, ...extra };
  }
  const m = resto.match(DO_ITEM_COMUM);
  const posologia = m && posologiaDe(m[4]);
  return posologia && { valor: valorDe(m[1]), palavra: m[2], via: CODIGO_DA_VIA.get(m[3]), posologia, ...extra };
}

// A Unidade cuja palavra, no singular ou no plural, está na Frase.
const unidadeDa = (unidades, palavra) => unidades.find((u) => u === palavra || plural(u) === palavra);

// A Quantidade do texto como Ajuste manual. Nas Etapas, a Frase só traz a soma: cada Etapa menos a última fica com a
// sugerida dela, ou 1, e a última com o resto (decisão do usuário de 16/11/2026, etapa 08). A partilha não muda a Frase.
function comQuantidade(item, montado, quantidade) {
  if (item.posologia.tipo !== 'etapas') return { ...item, quantidadeDispensar: String(quantidade) };
  const { etapas } = item.posologia;
  const antes = etapas.slice(0, -1).map((_, i) => montado.quantidadesSugeridas?.[i]?.sugerida ?? 1);
  const ultima = quantidade - antes.reduce((soma, q) => soma + q, 0);
  if (ultima < 1) return null;
  const quantidades = [...antes, ultima];
  return { ...item, posologia: { ...item.posologia, etapas: etapas.map((e, i) => ({ ...e, quantidadeDispensar: String(quantidades[i]) })) } };
}

// ponytail: teto da busca do Período de dispensação (ticket 20). Uma Quantidade que cobre mais de um ano não volta, e o
// Prescritor a digita de novo.
const PERIODO_MAXIMO = 365;

// Uma linha de item sob o seu título, com a justificativa da linha seguinte ou undefined: { item } ou { motivo }.
function reconhecer(frase, justificativa, titulo, entrada, produtosPorNome) {
  // O nome é o primeiro trecho antes de um ". " que é nome de Produto: há nomes com ". " dentro, como "Aesculus
  // hippocastanum L. (castanha da índia) 100 mg — cápsula".
  const nome = [...frase.matchAll(/\. /g)].map((m) => frase.slice(0, m.index)).find((n) => produtosPorNome.has(n));
  if (nome === undefined && titulo !== SIMPLES) return { motivo: 'Produto não encontrado' };
  const textoLivre = nome === undefined ? frase.match(NOME_DO_TEXTO_LIVRE)?.[1] : null;
  const falha = nome === undefined ? 'Produto não encontrado' : 'Frase diferente';
  const nomeLido = nome ?? textoLivre;
  const lida = nomeLido && frase.slice(nomeLido.length + 2).match(RESTO);
  const doseEPosologia = lida && lerDoseEPosologia(lida[1]);
  if (!doseEPosologia || doseEPosologia.via === undefined) return { motivo: falha };
  const [, , quantidade, palavraDaQuantidade, recomendacoes] = lida;
  const { valor, palavra, via, posologia, usoContinuo, duracao } = doseEPosologia;

  const comoItem = (base, unidade) => ({
    ...base,
    dose: valor === null ? { unidade } : { valor, unidade },
    viaAdministracao: via,
    posologia,
    ...(usoContinuo && { usoContinuo }),
    ...(duracao && { duracao }),
    ...(recomendacoes && { recomendacoes }),
    ...(justificativa && { justificativa }),
  });
  const candidatos = nome !== undefined
    ? produtosPorNome.get(nome).flatMap((p) => {
      const unidade = unidadeDa(unidadesDeDose(p), palavra);
      return unidade ? [comoItem({ produto: p.codigo }, unidade)] : [];
    })
    : [[unidadeDa(UNIDADES_DE_DOSE_DO_TEXTO_LIVRE, palavra), unidadeDa(UNIDADES_DE_FORNECIMENTO_DO_TEXTO_LIVRE, palavraDaQuantidade)]]
      .filter(([unidade, fornecimento]) => unidade && fornecimento)
      .map(([unidade, unidadeFornecimento]) => comoItem({ textoLivre, unidadeFornecimento }, unidade));

  // A prova, em passadas pelos candidatos, na ordem: na 1ª, com a Quantidade a dispensar sugerida; na 2ª, com a do
  // texto, como Ajuste manual. Assim, o frasco cuja sugerida já dá a Quantidade vence o outro ajustado à mão. A
  // justificativa conta na prova: a Montagem só a guarda acima do limite de tratamento, e sem ela a Receita é bloqueada.
  let deOutroTipo = false;
  let outraJustificativa = false;
  const montar = (item) => [item, montarReceita({ ...entrada, itens: [item] }).itens[0]];
  const passa = ([, montado]) => {
    if (montado.frase !== frase) return false;
    if (montado.tipoDeReceita !== titulo) deOutroTipo = true;
    else if ((montado.justificativa ?? null) !== (justificativa ?? null)) outraJustificativa = true;
    else return true;
    return false;
  };
  // A 3ª, só no Uso contínuo com justificativa (ticket 20): o Período de dispensação não está na Frase, e o padrão pode
  // deixar o tratamento dentro do limite. Vale o menor Período acima do padrão cuja sugerida dá a Quantidade do texto e
  // que ainda exige a justificativa. A sugerida só cresce com o Período: a busca para quando ela passa da do texto.
  const comPeriodo = ([c, montado]) => {
    for (let dias = montado.periodoDispensacaoPadrao + 1; dias <= PERIODO_MAXIMO; dias += 1) {
      const tentativa = montar({ ...c, periodoDispensacao: String(dias) });
      if (passa(tentativa)) return tentativa;
      // Passou da Quantidade do texto, ou o item tem erro e não tem sugerida.
      if (!(tentativa[1].quantidadeDispensarSugerida <= total)) return null;
    }
    return null;
  };
  const primeira = candidatos.map(montar);
  const total = Number(valorDe(quantidade));
  const [item] = primeira.find(passa)
    ?? primeira.map(([c, montado]) => comQuantidade(c, montado, total)).filter(Boolean).map(montar).find(passa)
    ?? (usoContinuo && justificativa ? primeira.map(comPeriodo).find(Boolean) : null)
    ?? [];
  if (item) return { item };
  return { motivo: deOutroTipo ? 'mudou de Tipo de receita' : outraJustificativa ? 'justificativa diferente' : falha };
}

// O texto colado, linha a linha: { itens, naoReconhecidas }. Só contam as linhas de item ("n. …"), cada uma sob o último
// título de Receita acima dela; as outras são ignoradas, e por isso dá para colar a evolução inteira. entrada é a da
// montarReceita, e o entrada.itens é ignorado.
export function renovar(texto, entrada) {
  // Na ordem da busca, com os disponíveis na rede antes: entre Produtos com o mesmo nome, vale o primeiro que passa.
  const produtosPorNome = new Map();
  for (const p of buscarProdutos(entrada.catalogo, '')) {
    const nome = nomeDoProduto(p);
    produtosPorNome.set(nome, [...(produtosPorNome.get(nome) ?? []), p]);
  }
  const itens = [];
  const naoReconhecidas = [];
  let titulo = null;
  const linhas = texto.split('\n').map((l) => l.trim());
  for (const [i, linha] of linhas.entries()) {
    if (NOMES_DOS_TIPOS_DE_RECEITA.includes(linha)) {
      titulo = linha;
      continue;
    }
    // Um editor pode trocar o espaço depois do número por tab ou por mais de um espaço.
    const frase = linha.match(/^\d+\.\s+(.+)$/)?.[1];
    if (!frase) continue;
    // A justificativa só vale na linha logo depois do item, e entra na prova dele.
    const justificativa = linhas[i + 1]?.match(/^Justificativa: (.+)$/)?.[1];
    const lida = titulo ? reconhecer(frase, justificativa, titulo, entrada, produtosPorNome) : { motivo: 'fora de um título de Receita' };
    if (lida.item) itens.push(lida.item);
    else naoReconhecidas.push({ texto: linha, motivo: lida.motivo });
  }
  return { itens, naoReconhecidas };
}
