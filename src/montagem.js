// Montagem da Receita: uma função pura, sem tela, rede ou armazenamento.
import { porExtenso, numero, contagem, contagemNaReceita, plural, sabeEscrever, artigo, juntar } from './texto.js';
import { semAcento, LIQUIDO_ORAL, farmacos, nomeDoProduto, VIAS_DE_ADMINISTRACAO } from './produto.js';
import { dataExiste, dataBrasileira, MESES, somarDias, emDias, datasMensais, diasEntre, idade } from './datas.js';

const MARCA = 'EXEMPLO – SEM VALOR COMO RECEITA';

// A Receita de antimicrobiano vale 10 dias (IN Anvisa 360/2025, art. 1º, § 2º), e 90 dias em Uso contínuo.
const VALIDADE_DO_ANTIMICROBIANO = 10;
const VALIDADE_DO_ANTIMICROBIANO_EM_USO_CONTINUO = 90;

// Em Uso contínuo, a Receita de antimicrobiano e a de agonista de GLP-1 indicam a quantidade para cada 30 dias (RDC
// 471/2021, art. 9º).
const DISPENSACAO_EM_USO_CONTINUO = 30;

// A Receita de agonista de GLP-1 vale 90 dias, em uso comum ou em Uso contínuo (IN Anvisa 360/2025, art. 2º, § 1º).
const VALIDADE_DO_GLP1 = 90;

// A Receita de Controle Especial vale 30 dias (Portaria 344/1998, art. 52, § 1º; Portaria 6/1999, art. 85, § 1º).
const VALIDADE_DO_CONTROLE_ESPECIAL = 30;

// Limite de tratamento da Receita de Controle Especial (Portaria 344/1998, art. 59): 60 dias, ou 6 meses para
// anticonvulsivante e antiparkinsoniano, contados como a duração, com o mês no calendário a partir do início. Acima
// dele, justificativa com o CID nas 2 Vias (art. 59, parágrafo único, e art. 60). A norma não cita os adendos, e o
// limite vale também para eles (decisão do ticket 13).
const LIMITE_DE_TRATAMENTO = { valor: 60, unidade: 'dia' };
const LIMITE_DO_ANTICONVULSIVANTE_OU_ANTIPARKINSONIANO = { valor: 6, unidade: 'mes' };

// Período de dispensação padrão do item de Uso contínuo, quando o Prescritor não diz outro (decisão do usuário de
// 11/11/2026, ticket 27): 180 dias na Receita simples, e 60 na Receita de Controle Especial, os 60 dias do Limite de
// tratamento, também para o anticonvulsivante e o antiparkinsoniano. O antimicrobiano e o agonista de GLP-1 ficam nos
// 30 dias de DISPENSACAO_EM_USO_CONTINUO.
const PERIODO_DA_RECEITA_SIMPLES = 180;
const PERIODO_DO_CONTROLE_ESPECIAL = 60;

// Tipos de receita (spec, Classificação e separação). Cada um diz:
// - vias: o rótulo de cada Via, ou null quando a Via não tem rótulo;
// - cpf: se o bloco do paciente traz o CPF, que é exigido e, sem ele, bloqueia a Receita;
// - camposEmBranco: os blocos que a farmácia preenche, cada um com o título e os campos;
// - validade: a Validade em dias, ou null, conforme a Receita tenha ou não item de Uso contínuo;
// - dispensacaoFixa: no tipo que, em Uso contínuo, se receita para cada 30 dias, o que ele receita, para a mensagem de
//   erro do Período de dispensação ("O antimicrobiano"); nos outros, null;
// - periodoPadrao: no tipo sem dispensacaoFixa, quantos dias de uso a Quantidade a dispensar cobre num item de Uso
//   contínuo, quando o Prescritor não diz outro.
// O nome de cada tipo é o que a tela, o impresso e o Texto para colar mostram: "Receituário…", por decisão do usuário de
// 26/11/2026. Os comentários continuam com o termo das normas e da spec, "Receita simples", "Receita de Controle
// Especial". O nome é também a identidade do tipo: é o valor de tipoDeReceita no item em texto livre e o título que a
// Renovação lê. Ao trocá-lo, acrescente o nome antigo ao TIPO_DO_TITULO da renovacao.js.
const SIMPLES ='Receituário simples';
const ANTIMICROBIANO = 'Receituário de antimicrobiano';
const GLP1 = 'Receituário de agonista de GLP-1';
const CONTROLE_ESPECIAL = 'Receituário de Controle Especial';
// RDC 471/2021, art. 6º, parágrafo único: 2 Vias, com idade e sexo do paciente; art. 10: a farmácia retém a 2ª Via, e a
// 1ª volta ao paciente, o inverso da Receita de Controle Especial. Os rótulos seguem os dizeres da Receita de Controle
// Especial (Portaria 344, art. 52), trocados de Via (decisão do ticket 11). Vale para a Receita de antimicrobiano e,
// na redação da RDC 973/2025, para a de agonista de GLP-1 (Anvisa, Perguntas e Respostas GLP-1, pergunta 4).
const MODELO_DA_RDC471 = {
  vias: ['1ª via – Orientação ao paciente', '2ª via – Retenção da farmácia ou drogaria'],
  cpf: false,
  camposEmBranco: [],
};
const TIPOS_DE_RECEITA = {
  // A Validade da Receita simples só existe com Uso contínuo, e só é impressa se a configuração a traz: a norma não a
  // fixa, e a validade local ainda é uma pergunta pendente da spec.
  [SIMPLES]: {
    vias: [null],
    cpf: false,
    camposEmBranco: [],
    validade: (continua, configuracao) => (continua ? configuracao.validadeReceitaSimplesUsoContinuoDias ?? null : null),
    dispensacaoFixa: null,
    periodoPadrao: PERIODO_DA_RECEITA_SIMPLES,
  },
  [ANTIMICROBIANO]: {
    ...MODELO_DA_RDC471,
    validade: (continua) => (continua ? VALIDADE_DO_ANTIMICROBIANO_EM_USO_CONTINUO : VALIDADE_DO_ANTIMICROBIANO),
    dispensacaoFixa: 'O antimicrobiano',
  },
  // A Validade é outra, e por isso o Tipo de receita é outro (decisão do usuário de 08/11/2026, ticket 20). Em Uso
  // contínuo, como o antimicrobiano (Anvisa, Perguntas e Respostas GLP-1, pergunta 6).
  [GLP1]: {
    ...MODELO_DA_RDC471,
    validade: () => VALIDADE_DO_GLP1,
    dispensacaoFixa: 'O agonista de GLP-1',
  },
  // Portaria 344/1998, art. 52: 2 Vias, com os dizeres "1ª via - Retenção da Farmácia ou Drogaria" e "2ª via - Orientação
  // ao Paciente"; art. 55, b (redação da RDC 1.000/2025): nome completo e CPF do paciente. Portaria 6/1999, art. 85, c: a
  // identificação do comprador e do fornecedor, preenchida pela farmácia. Os campos seguem os do comprador da
  // Notificação de Receita (Portaria 344, art. 36, i) e os do modelo antigo da Anvisa; o modelo versão 2 não foi
  // conferido (ticket 12).
  [CONTROLE_ESPECIAL]: {
    vias: ['1ª via – Retenção da farmácia ou drogaria', '2ª via – Orientação ao paciente'],
    cpf: true,
    camposEmBranco: [
      { titulo: 'Identificação do comprador', campos: ['Nome', 'CPF ou passaporte', 'Endereço', 'Cidade e UF', 'Telefone'] },
      { titulo: 'Identificação do fornecedor', campos: ['Assinatura do farmacêutico', 'Data'] },
    ],
    validade: () => VALIDADE_DO_CONTROLE_ESPECIAL,
    dispensacaoFixa: null,
    periodoPadrao: PERIODO_DO_CONTROLE_ESPECIAL,
  },
};

// Os títulos das Receitas no Texto para colar, que a Renovação reconhece.
export const NOMES_DOS_TIPOS_DE_RECEITA = Object.keys(TIPOS_DE_RECEITA);

// As listas da Portaria 344 que vão para a Receita de Controle Especial, além dos adendos que mandam para ela, como o do
// fenobarbital na B1 (Portaria 344, Anexo I, Atualização nº 101). No complemento curado, "adendo": true quer dizer que
// o Produto cai num desses adendos.
const LISTAS_DO_CONTROLE_ESPECIAL = new Set(['C1', 'C5']);
const doControleEspecial = (produto) => Boolean(produto?.portaria344)
  && (LISTAS_DO_CONTROLE_ESPECIAL.has(produto.portaria344.lista) || produto.portaria344.adendo === true);

// As listas da Portaria 344 que exigem Notificação de Receita, fora dos adendos, com a Notificação de cada uma. O projeto
// não a emite: o item é bloqueado (Portaria 344, arts. 35, 40, 45 e 50; RDC 58/2007, art. 1º, § 2º; RDC 11/2011).
const NOTIFICACOES = {
  A1: 'Notificação de Receita A',
  A2: 'Notificação de Receita A',
  A3: 'Notificação de Receita A',
  B1: 'Notificação de Receita B',
  B2: 'Notificação de Receita B2',
  C2: 'Notificação de Receita Especial',
  C3: 'Notificação de Receita de Talidomida',
};
export const notificacao = (produto) => (produto?.portaria344 && !produto.portaria344.adendo
  ? NOTIFICACOES[produto.portaria344.lista] ?? null : null);

// O Tipo de receita de um item, pela Classificação regulatória do Produto no catálogo. O item que exige Notificação de
// Receita não tem Tipo de receita (null) e não sai em nenhuma Receita. O controlado vem antes do antimicrobiano e do
// agonista de GLP-1, porque nunca vai com eles. Mundo fechado (ADR 0005): o Produto fora das listas vai para a Receita
// simples, sem alerta. O texto livre vai para o Tipo de receita que o Prescritor escolhe (tipoEscolhido), com alerta.
const TIPO_DA_IN360 = { antimicrobiano: ANTIMICROBIANO, glp1: GLP1 };
const tipoDeReceita = (produto) => (notificacao(produto) ? null : doControleEspecial(produto) ? CONTROLE_ESPECIAL
  : TIPO_DA_IN360[produto?.in360] ?? SIMPLES);

// O Tipo de receita do item em texto livre é o que o Prescritor escolhe, porque o catálogo não sabe a Classificação
// regulatória dele. Sem escolha, como no item que a Renovação lia antes de haver a escolha, é a Receita simples; a
// escolha que não é um Tipo de receita dá erro no item, que fica na Receita simples até ser corrigido.
const tipoEscolhido = (item) => (NOMES_DOS_TIPOS_DE_RECEITA.includes(item.tipoDeReceita) ? item.tipoDeReceita : SIMPLES);

// O que o catálogo diz dos fármacos escritos num texto livre, para alertar quando o Tipo de receita escolhido difere
// dele. É uma conferência pelo nome, palavra por palavra e sem acento: não acha nome comercial nem erro de digitação, e
// por isso só alerta, sem bloquear. Cada entrada é uma combinação de fármacos do catálogo, com as chaves cercadas de
// espaços, os nomes e as classes: o Tipo de receita, ou a Notificação de Receita, de cada Produto dela.
const emPalavras = (texto) => ` ${semAcento(texto).replace(/[^a-z0-9]+/g, ' ').trim()} `;
const FARMACOS_DO_CATALOGO = new WeakMap();
function farmacosDoCatalogo(catalogo) {
  if (!FARMACOS_DO_CATALOGO.has(catalogo)) {
    const porCombinacao = new Map();
    for (const p of catalogo) {
      const componentes = (p.principioAtivo ? farmacos(p.principioAtivo) : [])
        .map((f) => ({ chave: emPalavras(f.chave), nome: f.nome })).filter((f) => f.chave.trim());
      if (!componentes.length) continue;
      const id = componentes.map((f) => f.chave).sort().join('+');
      if (!porCombinacao.has(id)) {
        porCombinacao.set(id, { chaves: componentes.map((f) => f.chave), nomes: componentes.map((f) => f.nome), classes: new Set() });
      }
      porCombinacao.get(id).classes.add(notificacao(p) ?? tipoDeReceita(p));
    }
    FARMACOS_DO_CATALOGO.set(catalogo, [...porCombinacao.values()]);
  }
  return FARMACOS_DO_CATALOGO.get(catalogo);
}

// As combinações do catálogo escritas no texto livre cuja classe não é o Tipo de receita escolhido. A combinação vale
// mais que os componentes dela: "paracetamol + codeína" não é conferido como codeína sozinha. O fármaco que o catálogo
// só tem na Receita simples não conta quando o texto traz outro com regra própria, para o paracetamol da combinação não
// contestar a Receita de Controle Especial.
function divergenciasDoCatalogo(textoLivre, tipo, catalogo) {
  if (!Array.isArray(catalogo)) return [];
  const texto = emPalavras(textoLivre);
  const escritas = farmacosDoCatalogo(catalogo).filter((e) => e.chaves.every((c) => texto.includes(c)));
  const contida = (e) => escritas.some((o) => o.chaves.length > e.chaves.length && e.chaves.every((c) => o.chaves.includes(c)));
  const maiores = escritas.filter((e) => !contida(e));
  const comRegra = maiores.filter((e) => !(e.classes.size === 1 && e.classes.has(SIMPLES)));
  return (comRegra.length ? comRegra : maiores).filter((e) => !e.classes.has(tipo));
}

// "No catálogo, clonazepam exige Notificação de Receita B. Confira…": o trecho do alerta do texto livre, ou null se o
// catálogo não contesta a escolha.
function oQueOCatalogoDiz(divergencias) {
  if (!divergencias.length) return null;
  const frases = divergencias.map(({ nomes, classes }) => {
    const varios = nomes.length > 1;
    const tipos = [...classes].filter((c) => NOMES_DOS_TIPOS_DE_RECEITA.includes(c));
    const notificacoes = [...classes].filter((c) => !tipos.includes(c));
    const diz = [
      ...(tipos.length ? [`${varios ? 'vão' : 'vai'} no ${tipos.join(' ou no ')}`] : []),
      ...(notificacoes.length ? [`${varios ? 'exigem' : 'exige'} ${notificacoes.join(' ou ')}`] : []),
    ].join(' ou ');
    return `${juntar(nomes.map(noMeioDaFrase))} ${diz}`;
  });
  const comNotificacao = divergencias.some(({ classes }) => [...classes].some((c) => !NOMES_DOS_TIPOS_DE_RECEITA.includes(c)));
  return `No catálogo, ${frases.join('; ')}. ${comNotificacao
    ? 'Confira se este medicamento pode sair neste Receituário: a página não emite Notificação de Receita.'
    : 'Confira o Tipo de receituário.'}`;
}

// O Período de dispensação padrão do item, pelo Tipo de receita dele. O item que exige Notificação de Receita não sai
// em Receita nenhuma (o tipo é null) e fica com o da Receita simples.
function periodoDeDispensacaoPadrao(nomeDoTipo) {
  const tipo = TIPOS_DE_RECEITA[nomeDoTipo] ?? TIPOS_DE_RECEITA[SIMPLES];
  return tipo.dispensacaoFixa ? DISPENSACAO_EM_USO_CONTINUO : tipo.periodoPadrao;
}

// Unidades de dose por forma (spec). A forma do CATMAT é lida sem acento e em minúsculas, porque ele escreve a mesma
// forma de vários jeitos ("Comprimido revestido" e "Comp rev"; "Solução oral" e "Sol oral (fr)"). Vale a primeira regra
// que casa: "Pomada oftálmica" é pomada, e "Pó para suspensão injetável" é injetável. Não há colher: o tamanho varia.
// semConversao marca as formas sem conversão confiável, que sugerem 1 Unidade de fornecimento. conteudoEm, quando
// existe, limita a regra aos Produtos cuja Unidade de fornecimento tem o conteúdo nessa unidade.
const FORMAS = [
  { forma: /^(creme|pomada|gel|locao|xampu|solucao topica)\b/, unidades: ['aplicação'], semConversao: true },
  { forma: /inj|^amp\b|^carpule\b/, unidades: ['ml', 'ampola', 'frasco-ampola', 'UI'] },
  { forma: /^comp(rimido)?\b/, unidades: ['comprimido'] },
  { forma: /^cap(sula)?\b/, unidades: ['cápsula'] },
  { forma: /^dragea\b/, unidades: ['drágea'] },
  // comGotas: com o fator da lista de gotas (ticket 28), a gota vem primeiro.
  { forma: LIQUIDO_ORAL, unidades: ['ml', 'gota'], comGotas: ['gota', 'ml'] },
  // Pó para suspensão oral: a Dose é em ml da suspensão reconstituída.
  { forma: /^po para suspensao$/, unidades: ['ml'] },
  { forma: /^(aerossol|aer|spray nasal|po para inalacao)\b/, unidades: ['jato', 'dose'] },
  // Solução e suspensão nasais em frasco de doses são sprays, como o aerossol (decisão do ticket 06). Em frasco de ml,
  // ou sem conteúdo, são gotas nasais, na regra seguinte.
  { forma: /^(solucao|suspensao|sol|susp) nasal\b/, conteudoEm: 'doses', unidades: ['jato', 'dose'] },
  // Colírio e gotas otológicas ou nasais.
  { forma: /^(solucao|suspensao|emulsao|sol|susp) (oftalmica|oto-oftalmica|otologica|nasal|oft)\b/, unidades: ['gota'], semConversao: true },
  { forma: /^adesivo\b/, unidades: ['adesivo'] },
  { forma: /^supositorio\b/, unidades: ['supositório'] },
  { forma: /^ovulo\b/, unidades: ['óvulo'] },
  // "Solução", sem mais nada, como o soro fisiológico em frasco: a Dose em ml.
  { forma: /^solucao$/, unidades: ['ml'] },
];
// O sachê e o envelope não são forma no CATMAT, e sim Unidade de fornecimento ("Granulado", "Pó", "Pó para solução"):
// a Dose é o próprio sachê ou envelope.
const SACHE = { unidades: ['sachê'] };
const ENVELOPE = { unidades: ['envelope'] };

const regraDaForma = (produto) => {
  const forma = semAcento(produto.forma);
  const casa = (r) => r.forma.test(forma) && (!r.conteudoEm || r.conteudoEm === produto.fornecimento.unidade);
  return FORMAS.find(casa) ?? { sachê: SACHE, envelope: ENVELOPE }[produto.fornecimento.tipo] ?? null;
};
export const unidadesDeDose = (produto) => {
  const regra = regraDaForma(produto);
  return (produto.gotasPorMl && regra?.comGotas) || regra?.unidades || [];
};

// Item em texto livre (decisões do ticket 10): medicamento fora do catálogo, sem Produto. Sem forma, ele aceita todas as
// Unidades de dose, e sem Unidade de fornecimento no CATMAT, o Prescritor a escolhe entre as que a frase sabe escrever.
export const UNIDADES_DE_DOSE_DO_TEXTO_LIVRE = [...new Set([...FORMAS, SACHE, ENVELOPE].flatMap((r) => r.unidades))];
export const UNIDADES_DE_FORNECIMENTO_DO_TEXTO_LIVRE = [
  'comprimido', 'cápsula', 'drágea', 'frasco', 'ampola', 'frasco-ampola', 'bisnaga', 'tubo', 'pote', 'sachê', 'envelope',
  'adesivo', 'supositório', 'óvulo', 'flaconete', 'carpule', 'seringa', 'unidade',
];

// Como cada Unidade de dose se divide (decisão de 06/11/2026): o comprimido em meios e quartos; o ml em qualquer
// decimal; a UI em meias, a menor marca das seringas e canetas de insulina (decisão do ticket 07); as demais (gota,
// jato, cápsula, ampola…) só inteiras.
// parte é a menor fração aceita (0 = qualquer decimal), e erro, a mensagem quando a Dose não cai nela.
const DIVISOES = {
  comprimido: { parte: 0.25, erro: 'O comprimido só se divide em meios e quartos: escreva ¼, ½, ¾ ou 1 ½.' },
  ml: { parte: 0 },
  UI: { parte: 0.5, erro: 'A UI só se divide em meias: escreva um número inteiro ou com ,5, como 7,5.' },
};
function erroDeDivisao(dose, unidade) {
  const { parte, erro } = DIVISOES[unidade] ?? { parte: 1 };
  if (!parte || Number.isInteger(dose / parte)) return null;
  return erro ?? `A Dose em ${plural(unidade)} precisa ser um número inteiro.`;
}

// Unidade-base de cada Unidade de dose (spec, Conversão): a palavra da conta e a unidade do conteúdo no CATMAT
// ("Frasco 20 ml", "Frasco 200 doses").
const BASES = {
  ml: { palavra: 'ml', conteudo: 'ml' },
  gota: { palavra: 'ml', conteudo: 'ml' },
  UI: { palavra: 'ml', conteudo: 'ml' },
  jato: { palavra: 'dose', conteudo: 'doses' },
  dose: { palavra: 'dose', conteudo: 'doses' },
};

// UI por ml tiradas da concentração do Produto: "100 UI/ml" → 100, "10.000 UI/ml" → 10000, também depois das
// porcentagens de uma mistura ("70 % + 30 % 100 UI/ml"). Sem UI por ml ("1000 UI", "5000/0,25 UI/ml"), null.
function uiPorMl(concentracao) {
  const m = concentracao.match(/(?:^|% )(\d[\d.]*(?:,\d+)?) UI\/ml$/);
  return m ? Number(m[1].replace(/\./g, '').replace(',', '.')) : null;
}
// Unidades de dose que são a própria Unidade de fornecimento quando o Produto não tem conteúdo (spec, "Produto sem
// conteúdo"): o comprimido em "cartela" e o adesivo em "unidade", sem conteúdo, saem em comprimidos e adesivos.
const PROPRIAS = new Set(['comprimido', 'cápsula', 'drágea', 'adesivo', 'supositório', 'óvulo', 'sachê']);

// Como a Dose desta Unidade vira Unidades de fornecimento, ou null se não vira: base = Quantidade total ÷ porBase
// (as gotas por ml, as UI por ml, ou 1), e Quantidade a dispensar = base ÷ porFornecimento (o conteúdo, ou 1),
// arredondada para cima e contada na palavra `fornecimento`, que a Receita precisa saber escrever. validade é a do
// Produto depois de aberto, em dias, ou null.
function conversao({ fornecimento: { tipo, conteudo, unidade: medida }, concentracao, gotasPorMl, validadeAbertoDias }, unidade) {
  const validade = validadeAbertoDias ?? null;
  // A própria unidade, contada uma a uma: "1 ampola" de uma ampola de 2 ml, "1 comprimido" de uma cartela.
  if (unidade === tipo || (conteudo === null && PROPRIAS.has(unidade))) {
    return { palavra: unidade, porBase: 1, porFornecimento: 1, fornecimento: unidade, validade };
  }
  const base = BASES[unidade];
  const porBase = unidade === 'gota' ? gotasPorMl : unidade === 'UI' ? uiPorMl(concentracao) : 1;
  if (base?.conteudo !== medida || !porBase || !sabeEscrever(tipo)) return null;
  return { palavra: base.palavra, porBase, porFornecimento: conteudo, fornecimento: tipo, validade };
}

// toFixed tira o resíduo do ponto flutuante (2,2 × 100 = 220,00000000000003) antes de arredondar para cima.
const semResiduo = (n) => Number(n.toFixed(6));

// A Quantidade total na unidade-base (480 gotas = 24 ml) e em Unidades de fornecimento, arredondada para cima, com a
// sobra na unidade-base. Com validade depois de aberto, a Quantidade a dispensar é o maior entre a da conta e os dias
// de uso ÷ a validade, arredondado para cima (spec): ao menos uma Unidade de fornecimento por período de validade.
function emFornecimento({ porBase, porFornecimento, validade }, total, dias) {
  const emBase = semResiduo(total / porBase);
  const pelaConta = Math.ceil(semResiduo(emBase / porFornecimento));
  const pelaValidade = validade && dias ? Math.ceil(dias / validade) : 0;
  const dispensar = Math.max(pelaConta, pelaValidade);
  return { emBase, pelaConta, pelaValidade, dispensar, sobra: semResiduo(dispensar * porFornecimento - emBase) };
}

// " de 20 ml": o conteúdo da Unidade de fornecimento, quando o CATMAT o informa.
const deConteudo = ({ conteudo, unidade }) => (conteudo === null ? '' : ` de ${numero(conteudo)} ${unidade}`);

// Como sai a Quantidade a dispensar sugerida do Produto, qualquer que seja a Unidade de dose:
// - 'conta': alguma Unidade de dose da forma vira Unidades de fornecimento (conversao);
// - 'sugereUma': forma sem conversão confiável (creme, pomada, gel, colírio, gotas otológicas ou nasais);
// - 'manual': nenhuma vira, porque o conteúdo falta ou está em outra unidade (g, mg, o ml de um spray); não há
//   sugestão, e o Prescritor informa a Quantidade a dispensar.
// null: a frase não sabe escrever a Unidade de fornecimento, e o Produto ainda não pode ser receitado.
function comoSugerir(produto, unidades) {
  const { semConversao } = regraDaForma(produto);
  if (!semConversao && unidades.some((u) => conversao(produto, u))) return 'conta';
  if (!sabeEscrever(produto.fornecimento.tipo)) return null;
  return semConversao ? 'sugereUma' : 'manual';
}

// Erro da Unidade de dose escolhida, quando outra Unidade de dose da forma serviria.
function erroDaUnidade(produto, unidade, modo) {
  const naoSeCalcula = `Este Produto não se calcula em ${plural(unidade)}: escolha outra Unidade de dose.`;
  // Sem conversão nenhuma, serve a Unidade de dose que mede ou conta a própria Dose (ml, gota, jato, comprimido…), e não
  // a que nomeia outro recipiente: "1 ampola" de um Produto entregue em frasco.
  if (modo === 'manual') return BASES[unidade] || PROPRIAS.has(unidade) ? null : naoSeCalcula;
  if (modo !== 'conta' || conversao(produto, unidade)) return null;
  if (unidade === 'gota' && !produto.gotasPorMl) return 'Este Produto não está na lista curada de gotas: receite em ml.';
  // Só manda receitar em ml quando o ml se calcula: no frasco-ampola sem conteúdo, nem um nem outro.
  if (unidade === 'UI' && !uiPorMl(produto.concentracao) && conversao(produto, 'ml')) {
    return 'A concentração deste Produto não diz as UI por ml: receite em ml.';
  }
  return naoSeCalcula;
}

// A Quantidade a dispensar sugerida, contada na palavra `fornecimento`, e os passos da conta depois da Quantidade
// total: " = 24 ml → 2 frascos de 20 ml". A unidade-base só aparece quando muda a palavra; a seta, quando muda a
// palavra ou o número. A validade depois de aberto só aparece quando aumenta a Quantidade a dispensar: "; 30 dias ÷
// 28 dias de validade depois de aberto → 2 frascos-ampola de 10 ml". Sem conversão confiável, a sugestão é 1, e sem
// conversão nenhuma, não há sugestão.
// No uso eventual do "se necessário" (ticket 23), o Produto multidose, que passa por uma unidade-base até um recipiente
// de várias Doses, sugere 1 Unidade de fornecimento, ou o que a validade depois de aberto exigir, e o teto da conta fica
// em `teto`: " = 40 ml → teto de 2 frascos de 20 ml; uso eventual → 1 frasco de 20 ml". Fora dele, ou quando o teto
// não passa disso, `teto` é null e nada muda.
// ponytail: multidose é o frasco (e as variantes, como frasco-ampola) e o carpule; a ampola, a seringa e o flaconete
// são dose única. O frasco-ampola de dose única (antibiótico) entraria, mas não se receita "se necessário".
const MULTIDOSE = /^(frasco|carpule)/;
function sugerir(modo, produto, unidade, total, dias, eventual = false) {
  const { tipo } = produto.fornecimento;
  const conteudo = deConteudo(produto.fornecimento);
  if (modo === 'sugereUma') return { sugerida: 1, fornecimento: tipo, passos: ` → ${contagem(1, tipo)}${conteudo}`, teto: null };
  if (modo === 'manual') return { sugerida: null, fornecimento: tipo, passos: '', teto: null };
  const c = conversao(produto, unidade);
  const { emBase, pelaConta, pelaValidade, dispensar } = emFornecimento(c, total, dias);
  const base = c.palavra === unidade ? '' : ` = ${contagem(emBase, c.palavra)}`;
  const pelaValidadeNaConta = (n) => `; ${contagem(dias, 'dia')} ÷ ${contagem(c.validade, 'dia')} de validade depois de aberto → ${contagem(n, c.fornecimento)}${conteudo}`;
  const minimo = Math.max(1, pelaValidade);
  if (eventual && c.palavra !== c.fornecimento && MULTIDOSE.test(c.fornecimento) && pelaConta > minimo) {
    return {
      sugerida: minimo,
      fornecimento: c.fornecimento,
      passos: `${base} → teto de ${contagem(pelaConta, c.fornecimento)}${conteudo}; uso eventual → ${contagem(1, c.fornecimento)}${conteudo}`
        + (minimo > 1 ? pelaValidadeNaConta(minimo) : ''),
      teto: pelaConta,
    };
  }
  return {
    sugerida: dispensar,
    fornecimento: c.fornecimento,
    passos: base
      + (c.palavra === c.fornecimento && pelaConta === emBase ? '' : ` → ${contagem(pelaConta, c.fornecimento)}${conteudo}`)
      + (dispensar === pelaConta ? '' : pelaValidadeNaConta(dispensar)),
    teto: null,
  };
}

// O alerta do tratamento acima do limite da Receita de Controle Especial, ou null. tratamento traz os dias de
// tratamento (a duração, o Período de dispensação no Uso contínuo ou a soma das Etapas) e o texto deles ("90 dias",
// "7 meses"); a dose única não tem tratamento. A Quantidade a dispensar digitada não entra: acima da sugerida, ela tem o
// alerta do dobro.
function alertaDoLimite(produto, tratamento, inicio) {
  if (!tratamento) return null;
  // O texto livre não tem Produto: fica no limite de 60 dias, o mais rígido, mesmo sendo um anticonvulsivante.
  const anticonvulsivante = produto?.anticonvulsivanteOuAntiparkinsoniano === true;
  const limite = anticonvulsivante ? LIMITE_DO_ANTICONVULSIVANTE_OU_ANTIPARKINSONIANO : LIMITE_DE_TRATAMENTO;
  if (tratamento.dias <= emDias(limite, inicio)) return null;
  return {
    campo: 'justificativa',
    mensagem: `O tratamento de ${tratamento.texto} passa do limite de ${contagem(limite.valor, limite.unidade)} do Receituário de Controle `
      + `Especial${anticonvulsivante ? ' para anticonvulsivante e antiparkinsoniano' : ''}: justifique com o CID. `
      + 'A justificativa sai impressa nas 2 Vias.',
  };
}

// Inteiro digitado, como a Quantidade a dispensar e o Período de dispensação: null se em branco, NaN se não for um
// inteiro de 1 para cima.
function inteiroDigitado(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto) return null;
  return /^\d+$/.test(texto) && Number(texto) >= 1 ? Number(texto) : NaN;
}

// Sugestão de outra apresentação (spec): entre os Produtos com o mesmo princípio ativo, concentração e forma, os que
// servem melhor que o escolhido, com menos Unidades de fornecimento ou, com as mesmas, menos sobra. Os disponíveis na
// rede vêm primeiro; depois, o que dá menos Unidades de fornecimento e, no empate, menos sobra. É só uma sugestão: a
// escolha é do Prescritor. Cada Produto respeita a sua validade depois de aberto, quando o complemento curado a traz.
// Se o escolhido tem validade, fica de fora quem não a tem no complemento, porque a conta dele a ignoraria: a NPH, 10 UI
// à noite por 60 dias, dá 3 frascos-ampola pela validade, e o carpule sairia "2 carpules", abertos 30 dias cada.
function outraApresentacao(produto, unidade, total, dias, catalogo) {
  const avaliar = (p) => {
    const c = conversao(p, unidade);
    return c && { produto: p, fornecimento: c.fornecimento, validade: c.validade, ...emFornecimento(c, total, dias) };
  };
  const escolhido = avaliar(produto);
  const comparavel = (a) => a && (!escolhido.validade || a.validade);
  const serveMelhor = (a) => a.dispensar < escolhido.dispensar || (a.dispensar === escolhido.dispensar && a.sobra < escolhido.sobra);
  const mesmoMedicamento = (p) => p.principioAtivo === produto.principioAtivo && p.concentracao === produto.concentracao
    && semAcento(p.forma) === semAcento(produto.forma);
  const [melhor] = catalogo
    .filter((p) => p.codigo !== produto.codigo && mesmoMedicamento(p))
    .map(avaliar)
    .filter((a) => comparavel(a) && serveMelhor(a))
    .sort((a, b) => b.produto.disponivelNaRede - a.produto.disponivelNaRede || a.dispensar - b.dispensar || a.sobra - b.sobra);
  if (!melhor) return null;
  const { produto: { codigo, disponivelNaRede, fornecimento }, dispensar } = melhor;
  return {
    produto: codigo,
    quantidadeDispensar: dispensar,
    disponivelNaRede,
    texto: `Com ${artigo(fornecimento.tipo)} ${fornecimento.tipo}${deConteudo(fornecimento)}: ${contagem(dispensar, melhor.fornecimento)}.`,
  };
}

// Vias de administração permitidas. Decisão do ticket 02: Produto fora do complemento curado não tem restrição, porque
// o catálogo não sabe as Vias dele.
export const TODAS_AS_VIAS = VIAS_DE_ADMINISTRACAO.map((_, codigo) => codigo);
export const viasPermitidas = (produto) => produto.viasAdministracao ?? TODAS_AS_VIAS;

// O verbo da Via de administração, com duas exceções pela Unidade de dose: "aplicação" sempre pede "Aplicar", como na
// pomada oftálmica e no creme vaginal, e a gota na nasal pede "Pingar".
const NASAL = 19;
function verbo(via, unidade) {
  if (unidade === 'aplicação') return 'Aplicar';
  if (via === NASAL && unidade === 'gota') return 'Pingar';
  return VIAS_DE_ADMINISTRACAO[via].verbo;
}

// A Via de administração depois de "por via": "Inalatória por via oral" (código 10) vira "inalatória oral", para a
// frase não dizer "por via" duas vezes.
export const viaNaFrase = (codigo) => VIAS_DE_ADMINISTRACAO[codigo].nome.toLowerCase().replace(' por via ', ' ');

// Meio da conta quando as Tomadas não saem de "vezes × dias": "5 vezes (a cada 36 horas em 7 dias)".
const tomadasEm = (tomadas, regra, dias) => `${contagem(tomadas, 'vez')} (${regra} em ${contagem(dias, 'dia')})`;

// Condições do "se necessário" (spec), com o trecho da frase: "se dor". Não são as condições de uso: as duas podem vir
// juntas.
export const CONDICOES_SE_NECESSARIO = {
  dor: 'dor',
  febre: 'febre',
  falta_de_ar: 'falta de ar',
  nauseas_ou_vomitos: 'náuseas ou vômitos',
};

// Quantas vezes cabem num dia com este intervalo mínimo: a cada 4 horas, 6 (horas 0, 4… 20); a cada 5 horas, 5.
const vezesNoDia = (horas) => Math.ceil(24 / horas);
// Quantas Tomadas o intervalo mínimo permite na duração, como no intervalo de horas: a cada 48 horas por 6 dias, 3.
const vezesNoIntervalo = (horas, dias) => Math.ceil((dias * 24) / horas);

// Tipos de Posologia. Cada um diz:
// - parametros: para cada campo, o mínimo (ou as opcoes, para um código) e o que falta informar; o opcional pode vir
//   em branco e vale null;
// - texto: o trecho da frase ("2 vezes ao dia");
// - tomadas: quantas Tomadas caem no intervalo semiaberto [início, início + duração), com a 1ª no início;
// - conta, opcional: o meio da conta escrita. Sem ela, ou quando ela devolve null, a conta mostra as Tomadas com o
//   trecho da frase, como em "5 vezes (a cada 36 horas em 7 dias)";
// - validar e alerta, opcionais: o erro ou o alerta que os parâmetros dão juntos, como { campo, mensagem };
// - nota, opcional: a nota da Quantidade a dispensar sugerida pela conta;
// - porTurno, em vez de parametros, tomadas e conta: cada Turno tem a sua Dose, e não se contam Tomadas;
// - porEtapa, idem: cada Etapa tem Dose, Posologia e duração próprias.
const POSOLOGIAS = {
  // Sem duração: numa Tomada só, a frase não tem o que dizer dela.
  dose_unica: {
    semDuracao: true,
    texto: () => 'dose única',
    tomadas: () => 1,
    conta: () => '1 vez (dose única)',
  },
  vezes_ao_dia: {
    parametros: [{ campo: 'vezes', minimo: 1, falta: 'quantas vezes ao dia' }],
    texto: ({ vezes }) => `${contagem(vezes, 'vez')} ao dia`,
    tomadas: ({ vezes }, dias) => vezes * dias,
    conta: ({ vezes }, dias) => `${contagem(vezes, 'vez')} × ${contagem(dias, 'dia')}`,
  },
  intervalo_horas: {
    parametros: [{ campo: 'horas', minimo: 1, falta: 'o intervalo em horas' }],
    texto: ({ horas }) => `a cada ${contagem(horas, 'hora')}`,
    // Arredonda para cima, decisão de 06/11/2026: a cada 48 horas por 1 dia é a Tomada da hora 0.
    tomadas: ({ horas }, dias) => Math.ceil((dias * 24) / horas),
    // Intervalo que divide o dia sai como "vezes ao dia", como na spec ("40 gotas × 4 vezes × 3 dias").
    conta: ({ horas }, dias) => (24 % horas ? null : `${contagem(24 / horas, 'vez')} × ${contagem(dias, 'dia')}`),
  },
  vezes_por_semana: {
    parametros: [{ campo: 'vezes', minimo: 1, falta: 'quantas vezes por semana' }],
    texto: ({ vezes }) => `${contagem(vezes, 'vez')} por semana`,
    // Tomadas espaçadas por igual na semana, arredondando para cima (decisão de 06/11/2026): 1 vez por semana em
    // 30 dias são os dias 0, 7, 14, 21 e 28; 2 vezes em 30 dias são 9, como segunda e quinta.
    tomadas: ({ vezes }, dias) => Math.ceil((vezes * dias) / 7),
  },
  vezes_por_mes: {
    parametros: [{ campo: 'vezes', minimo: 1, falta: 'quantas vezes por mês' }],
    texto: ({ vezes }) => `${contagem(vezes, 'vez')} por mês`,
    // O mês não tem tamanho fixo: contam as datas mensais no intervalo, cada uma com as suas vezes.
    tomadas: ({ vezes }, dias, inicio) => vezes * datasMensais(inicio, dias),
  },
  // "Dias alternados" é 1 vez a cada n dias, e n = 2 é dia sim, dia não.
  dias_alternados: {
    parametros: [{ campo: 'aCadaDias', minimo: 2, falta: 'a cada quantos dias, 2 ou mais' }],
    texto: ({ aCadaDias }) => (aCadaDias === 2 ? 'em dias alternados' : `a cada ${contagem(aCadaDias, 'dia')}`),
    tomadas: ({ aCadaDias }, dias) => Math.ceil(dias / aCadaDias),
    // Na conta, sempre "a cada n dias", mesmo quando a frase diz "em dias alternados".
    conta: ({ aCadaDias }, dias, tomadas) => tomadasEm(tomadas, `a cada ${contagem(aCadaDias, 'dia')}`, dias),
  },
  // "Se necessário" (decisões do ticket 09): a condição, o intervalo mínimo e, opcional, o máximo por dia, contado em
  // vezes, como as Tomadas ("no máximo 4 vezes ao dia" de 2 jatos são 8 jatos). A Quantidade total é um teto, o máximo
  // por dia × dias, sem passar das Tomadas que o intervalo mínimo permite na duração (a cada 48 horas, no máximo 1 vez
  // ao dia, por 6 dias são 3, e não 6). Sem o máximo, o teto vem só do intervalo mínimo, e há alerta.
  // O campo da condição é "sintoma", e não "condicao", para não se confundir com a condição de uso do item, que pode
  // vir junto e tem o seu próprio campo na tela.
  se_necessario: {
    parametros: [
      // As opções saem do mapa, separadas por vírgula: a última já traz o seu "ou" ("náuseas ou vômitos").
      { campo: 'sintoma', opcoes: CONDICOES_SE_NECESSARIO, falta: `a condição do "se necessário": ${Object.values(CONDICOES_SE_NECESSARIO).join(', ')}` },
      { campo: 'horas', minimo: 1, falta: 'o intervalo mínimo em horas' },
      { campo: 'maximoPorDia', minimo: 1, opcional: true, falta: 'o máximo de vezes por dia, 1 ou mais, ou deixe em branco' },
    ],
    texto: ({ sintoma, horas, maximoPorDia }) => `se ${CONDICOES_SE_NECESSARIO[sintoma]}, no mínimo a cada ${contagem(horas, 'hora')}`
      + (maximoPorDia ? `, no máximo ${contagem(maximoPorDia, 'vez')} ao dia` : ''),
    tomadas: ({ horas, maximoPorDia }, dias) => Math.min(maximoPorDia ? maximoPorDia * dias : Infinity, vezesNoIntervalo(horas, dias)),
    // "no máximo 4 vezes × 5 dias" quando o máximo por dia limita, ou o intervalo divide o dia; senão, as Tomadas que o
    // intervalo permite: "3 vezes (no mínimo a cada 48 horas em 6 dias)".
    conta: ({ horas, maximoPorDia }, dias, tomadas) => {
      const porDia = maximoPorDia ?? (24 % horas ? null : 24 / horas);
      return porDia && porDia * dias === tomadas ? `no máximo ${contagem(porDia, 'vez')} × ${contagem(dias, 'dia')}`
        : tomadasEm(tomadas, `no mínimo a cada ${contagem(horas, 'hora')}`, dias);
    },
    validar: ({ horas, maximoPorDia }) => (maximoPorDia > vezesNoDia(horas) ? {
      campo: 'maximoPorDia',
      mensagem: `O máximo por dia (${contagem(maximoPorDia, 'vez')}) não cabe no intervalo mínimo de ${contagem(horas, 'hora')}, `
        + `que permite até ${contagem(vezesNoDia(horas), 'vez')} ao dia.`,
    } : null),
    alerta: ({ horas, maximoPorDia }) => (maximoPorDia === null && Number.isInteger(horas) && horas >= 1 ? {
      campo: 'maximoPorDia',
      mensagem: `Sem o máximo por dia: a Quantidade a dispensar estima o máximo pelo intervalo mínimo (${contagem(vezesNoDia(horas), 'vez')} ao dia).`,
    } : null),
    nota: 'estimativa máxima',
    // Uso eventual (ticket 23): no frasco multidose, a sugerida é 1, e o teto fica na conta e na nota.
    eventual: true,
  },
  // A Quantidade total é a soma das Doses por Turno × dias.
  por_turno: { porTurno: true },
  // Esquema em Etapas (decisões do ticket 09): cada Etapa tem Dose, Posologia e duração próprias, e começa quando a
  // anterior termina. Não é de Uso contínuo, porque cada Etapa tem a sua duração.
  etapas: { porEtapa: true },
};

// Os tipos de Posologia de uma Etapa: os que contam Tomadas numa duração, com uma Dose só.
const TIPOS_DA_ETAPA = ['vezes_ao_dia', 'intervalo_horas', 'vezes_por_semana', 'vezes_por_mes', 'dias_alternados'];

// A tela esconde a duração e o Uso contínuo dos tipos de Posologia que não os usam, e a Dose do item dos que a pedem
// por Turno ou por Etapa.
export const temDuracao = (tipo) => !POSOLOGIAS[tipo]?.semDuracao && !POSOLOGIAS[tipo]?.porEtapa;
export const temDosePorTurno = (tipo) => Boolean(POSOLOGIAS[tipo]?.porTurno);
export const temEtapas = (tipo) => Boolean(POSOLOGIAS[tipo]?.porEtapa);

// Os parâmetros digitados de um tipo de Posologia, conferidos. erro(campo, mensagem) recebe cada erro.
function lerPosologia(regras, digitada, erro) {
  const posologia = { tipo: digitada.tipo };
  for (const { campo, minimo, opcoes, opcional, falta } of regras.parametros ?? []) {
    const texto = String(digitada[campo] ?? '').trim();
    posologia[campo] = opcoes ? texto : opcional && !texto ? null : Number(texto);
    const valido = opcoes ? Object.hasOwn(opcoes, texto)
      : posologia[campo] === null || (Number.isInteger(posologia[campo]) && posologia[campo] >= minimo);
    if (!valido) erro(campo, `Posologia incompleta: informe ${falta}.`);
  }
  const juntos = regras.validar?.(posologia);
  if (juntos) erro(juntos.campo, juntos.mensagem);
  return posologia;
}

// As unidades da duração.
const UNIDADES_DE_DURACAO = ['dia', 'semana', 'mes'];

// A duração digitada, ou null se não for um inteiro de 1 para cima numa unidade conhecida.
function lerDuracao(digitada) {
  const duracao = { valor: Number(digitada?.valor), unidade: digitada?.unidade };
  return Number.isInteger(duracao.valor) && duracao.valor >= 1 && UNIDADES_DE_DURACAO.includes(duracao.unidade) ? duracao : null;
}

// Turnos (spec): manhã, tarde e noite, na ordem do dia, com o trecho da frase. "Ao deitar" é noite.
const TURNOS_NA_FRASE = { manha: 'pela manhã', tarde: 'à tarde', noite: 'à noite' };

// Frações da Dose: só ½, ¼ e ¾, as partes em que se divide um comprimido, escritas também com barra.
const FRACOES = { '½': 0.5, '¼': 0.25, '¾': 0.75, '1/2': 0.5, '1/4': 0.25, '3/4': 0.75 };

// "5.000", "05.000" e "1234.500": depois de um inteiro diferente de zero, o ponto seguido de 3 dígitos pode ser milhar,
// e a Dose é recusada (decisão de 06/11/2026). "0.125" passa, porque não pode ser milhar.
const PONTO_AMBIGUO = /^-?\s*\d*[1-9]\d*\.\d{3}$/;

// Valor da Dose digitada: "0,5", "0.5" (o ponto é sempre o separador decimal), "½", "1/2", "1 ½", "1½" e "1 1/2".
// Depois do inteiro, a fração com barra pede espaço, porque "11/2" seria ambíguo. O sinal de menos é lido, para que
// a Dose negativa caia no erro de "maior que zero". Devolve null se vazia e NaN se não for reconhecida.
function valorDaDose(texto) {
  if (!texto) return null;
  const sinal = texto.startsWith('-') ? -1 : 1;
  const semSinal = texto.replace(/^-\s*/, '').replace(/\s*\/\s*/g, '/');
  if (/^\d*[.,]?\d+$/.test(semSinal)) return sinal * Number(semSinal.replace(',', '.'));
  const [, inteiro = 0, fracao] = semSinal.match(/^(?:(\d+)\s*)?([½¼¾])$/) ?? semSinal.match(/^(?:(\d+)\s+)?(\d+\/\d+)$/) ?? [];
  return FRACOES[fracao] ? sinal * (Number(inteiro) + FRACOES[fracao]) : NaN;
}

// A Dose como a Montagem a entendeu, para a tela mostrar antes de acrescentar o item: "½ = 0,5 comprimido". O texto
// digitado só se repete quando difere do número no formato brasileiro: "0,5 comprimido". Sem Unidade de dose válida,
// só o número.
function doseEntendida(texto, valor, unidade) {
  const lida = unidade ? contagem(valor, unidade) : numero(valor);
  return { valor, interpretacao: texto === numero(valor) ? lida : `${texto} = ${lida}` };
}

// Uma Dose digitada: o valor, a Dose entendida e o erro, se houver. unidade é a Unidade de dose, se ela serve à forma
// do Produto, ou null; erroSemValor é o erro da Dose em branco, zero ou negativa.
function lerDose(texto, unidade, erroSemValor) {
  const ambigua = PONTO_AMBIGUO.test(texto);
  const valor = ambigua ? NaN : valorDaDose(texto);
  const positiva = valor > 0;
  return {
    valor,
    entendida: positiva ? doseEntendida(texto, valor, unidade) : null,
    erro: ambigua ? 'Dose ambígua: o ponto seguido de 3 dígitos pode ser milhar. Escreva sem ponto (5000) ou com vírgula (1,5).'
      : Number.isNaN(valor) ? 'Dose não reconhecida: escreva como 0,5, ½, ¼, ¾, 1/2 ou 1 ½.'
      : !positiva ? erroSemValor
      : unidade ? erroDeDivisao(valor, unidade) : null,
  };
}

// As Doses por Turno digitadas, na ordem do dia. O Turno em branco não é usado.
function lerTurnos(posologia, unidade) {
  return Object.keys(TURNOS_NA_FRASE)
    .map((turno) => ({ turno, texto: String(posologia[turno] ?? '').trim() }))
    .filter(({ texto }) => texto)
    .map(({ turno, texto }) => ({
      turno,
      ...lerDose(texto, unidade, 'A Dose precisa ser maior que zero; deixe em branco o Turno sem Dose.'),
    }));
}

// Cada Dose por Turno, como `escrever` a escreve, seguida do seu Turno: "10 UI pela manhã e 6 UI à noite".
const comTurnos = (turnos, escrever) => juntar(turnos.map((t, i) => `${escrever(t, i)} ${TURNOS_NA_FRASE[t.turno]}`));

// As Doses por Turno entendidas, para a tela: "½ = 0,5 comprimido pela manhã e 1 comprimido à noite". Não há uma Dose
// só, por isso o valor é null.
function turnosEntendidos(turnos) {
  const lidos = turnos.filter((t) => t.entendida);
  return lidos.length ? { valor: null, interpretacao: comTurnos(lidos, (t) => t.entendida.interpretacao) } : null;
}

// As Etapas digitadas, na ordem, cada uma com a Dose, a Posologia, a duração, a Quantidade a dispensar digitada e os
// erros dela, no campo "etapas[i].dose" e afins. A Dose de cada Etapa é lida como a Dose do item, na Unidade de dose
// dele. A Quantidade a dispensar se digita por Etapa, porque cada Etapa tem a sua, que o Prescritor ajusta; sem
// conversão nenhuma, ela é obrigatória, e faltaQuantidade é o erro de quando ela falta: "…: informe a Quantidade a dispensar".
function lerEtapas(etapas, unidade, faltaQuantidade) {
  return (Array.isArray(etapas) ? etapas : []).map((etapa, i) => {
    const erros = [];
    const erro = (campo, mensagem) => erros.push({ campo: `etapas[${i}].${campo}`, mensagem });
    const dose = lerDose(String(etapa?.dose ?? '').trim(), unidade, 'Informe a Dose da Etapa, maior que zero.');
    if (dose.erro) erro('dose', dose.erro);
    const regras = TIPOS_DA_ETAPA.includes(etapa?.posologia?.tipo) ? POSOLOGIAS[etapa.posologia.tipo] : null;
    if (!regras) {
      erro('posologia', 'Escolha o tipo de Posologia da Etapa: vezes ao dia, intervalo de horas, vezes por semana, vezes por mês ou dias alternados.');
    }
    const posologia = regras && lerPosologia(regras, etapa.posologia, erro);
    const duracao = lerDuracao(etapa?.duracao);
    if (!duracao) erro('duracao', 'Informe a duração da Etapa.');
    const digitada = inteiroDigitado(etapa?.quantidadeDispensar);
    if (Number.isNaN(digitada)) erro('quantidadeDispensar', 'A Quantidade a dispensar precisa ser um número inteiro, 1 ou mais.');
    else if (faltaQuantidade && digitada === null) erro('quantidadeDispensar', `${faltaQuantidade} da Etapa.`);
    return { dose, regras, posologia, duracao, digitada, erros };
  });
}

// As Doses das Etapas entendidas, para a tela: "Etapa 1: 2 comprimidos; Etapa 2: ½ = 0,5 comprimido".
function etapasEntendidas(etapas) {
  const lidas = etapas.flatMap((e, i) => (e.dose.entendida ? [`Etapa ${i + 1}: ${e.dose.entendida.interpretacao}`] : []));
  return lidas.length ? { valor: null, interpretacao: lidas.join('; ') } : null;
}

export function montarReceita(entrada) {
  // O Emitente vem do atendimento (a Fase 3 o lê do iSaúde) ou da demonstração; sem ele, não há Receita.
  if (!entrada.prescritor) throw new Error('Falta o Prescritor.');
  if (!entrada.unidade) throw new Error('Falta a unidade.');
  // Sem valor padrão: esquecê-lo não pode tirar a marca da Receita de dados fictícios, nem pô-la na de verdade.
  if (typeof entrada.demonstracao !== 'boolean') throw new Error('Falta dizer se é o Modo demonstração: demonstracao: true ou false.');
  if (typeof entrada.emissao !== 'string' || !dataExiste(entrada.emissao)) throw new Error('Data de emissão inválida: passe aaaa-mm-dd.');
  const montados = entrada.itens.map((item, posicao) => ({ posicao, ...montarItem(item, entrada) }));
  const validos = montados.filter((m) => !m.resultado.erros.length);
  // O dado que falta e o endereço do paciente valem para todos os itens sem erro, os que iriam para alguma Receita.
  const posicoes = validos.map((m) => m.posicao);
  const faltam = posicoes.length ? dadosQueFaltam(entrada).map((bloqueio) => ({ itens: posicoes, ...bloqueio })) : [];
  const semEndereco = posicoes.length && !entrada.demonstracao && !preenchido(entrada.paciente?.endereco)
    ? [{ itens: posicoes, mensagem: 'Falta o endereço do paciente: complete-o à mão na Receita.' }]
    : [];
  const itens = montados.map((m) => m.resultado);
  // Os alertas que dependem da lista inteira.
  const alertas = [...principiosRepetidos(montados), ...semEndereco];
  // Sem o dado, não há Receita para conferir: os bloqueios do CPF e da justificativa esperam que ele seja completado.
  if (faltam.length) return { itens, alertas, receitas: [], bloqueios: [...faltam, ...bloquearNotificacoes(validos)] };
  // Uma Receita por Tipo de receita, ou mais, quando o tipo as separa. A bloqueada não sai: vai para os bloqueios, com
  // o motivo.
  const semCpf = bloquearSemCpf(separarReceitas(validos, entrada));
  const semJustificativa = bloquearSemJustificativa(semCpf.receitas, validos);
  return {
    itens,
    alertas,
    receitas: semJustificativa.receitas,
    bloqueios: [...semCpf.bloqueios, ...semJustificativa.bloqueios, ...bloquearNotificacoes(validos)],
  };
}

const preenchido = (valor) => String(valor ?? '').trim() !== '';

// O dado exigido que falta, em branco ou só com espaços, bloqueia a Receita, com o campo e a mensagem: nada sai
// impresso como "undefined" (Lei 5.991/1973, art. 35, II e III; Portaria 344/1998, art. 55, a). O nome do paciente só
// é exigido fora do Modo demonstração.
const DADOS_EXIGIDOS = {
  'prescritor.nome': 'Falta o nome do Prescritor.',
  'prescritor.conselho': 'Falta o conselho do Prescritor.',
  'prescritor.numero': 'Falta o número no conselho do Prescritor.',
  'prescritor.uf': 'Falta a UF do conselho do Prescritor.',
  'unidade.nome': 'Falta o nome da unidade.',
  // Portaria 6/1999, art. 85, a: o endereço do emitente com o CNPJ ou o CNES (decisão do usuário de 16/11/2026).
  'unidade.cnes': 'Falta o CNES da unidade.',
  'unidade.endereco': 'Falta o endereço da unidade.',
  'unidade.telefone': 'Falta o telefone da unidade.',
  'unidade.municipio': 'Falta o município da unidade.',
  'unidade.uf': 'Falta a UF da unidade.',
  'unidade.cabecalho': 'Falta o cabeçalho da unidade.',
  'paciente.nome': 'Falta o nome do paciente.',
};

// A página "Criar o favorito" também a usa, para exigir do Favorito o que a Montagem exige.
export function dadosQueFaltam(entrada) {
  return Object.entries(DADOS_EXIGIDOS)
    .filter(([caminho]) => {
      if (caminho === 'paciente.nome' && entrada.demonstracao) return false;
      const [dono, chave] = caminho.split('.');
      const valor = entrada[dono]?.[chave];
      // O cabeçalho é uma lista de linhas, e basta uma preenchida.
      return caminho === 'unidade.cabecalho' ? !(Array.isArray(valor) && valor.some(preenchido)) : !preenchido(valor);
    })
    // O campo do paciente é "nome", como o "cpf" do bloqueio do CPF; os outros levam o dono, porque "nome" e "uf" se
    // repetiriam.
    .map(([caminho, mensagem]) => ({ campo: caminho.replace('paciente.', ''), mensagem }));
}

// "metformina", mas "NPH": a 1ª letra vai para minúscula, salvo numa sigla.
const noMeioDaFrase = (nome) => (/^\p{Lu}{2}/u.test(nome) ? nome : nome[0].toLowerCase() + nome.slice(1));

// Alerta de princípio ativo repetido (spec, Validação): um por fármaco que aparece em mais de um item, na ordem em que
// aparece. Contam os itens com Produto, mesmo com erro, para a tela avisar enquanto o item é digitado; o texto livre
// fica de fora, porque não se sabe o princípio ativo dele (decisão do ticket 10).
function principiosRepetidos(montados) {
  const porFarmaco = new Map();
  for (const { posicao, produto } of montados) {
    for (const { chave, nome } of produto?.principioAtivo ? farmacos(produto.principioAtivo) : []) {
      if (!porFarmaco.has(chave)) porFarmaco.set(chave, { nome, itens: [] });
      const { itens } = porFarmaco.get(chave);
      if (itens.at(-1) !== posicao) itens.push(posicao);
    }
  }
  return [...porFarmaco.values()].filter(({ itens }) => itens.length > 1).map(({ nome, itens }) => ({
    itens,
    mensagem: `Princípio ativo repetido: ${noMeioDaFrase(nome)} nos itens ${juntar(itens.map((i) => String(i + 1)))}.`,
  }));
}

// Os tetos da Dose por Tomada (spec da Fase 3, 4.1; tetos do usuário de 16/11/2026): acima deles, um alerta, e a Receita
// sai. A gota e o ml dependem da Via de administração: a gota no nariz, no olho e no ouvido (19, 20 e 21) tem o teto de
// 4, e por outra Via, o da oral; o ml tem o da oral (0) e o de toda Via parenteral, e por outra Via não tem teto. A UI só
// tem teto na insulina (decisão do usuário de 19/11/2026), e a aplicação, nenhum.
const VIAS_DA_GOTA_CONTADA = [19, 20, 21];
const VIAS_PARENTERAIS = [1, 7, 11, 12, 13, 14, 15, 17, 23];
const TETOS_DA_DOSE = {
  comprimido: 4, cápsula: 4, drágea: 4, jato: 4, dose: 4,
  gota: (via) => (VIAS_DA_GOTA_CONTADA.includes(via) ? 4 : 60),
  ml: (via) => (via === 0 ? 30 : VIAS_PARENTERAIS.includes(via) ? 10 : null),
  UI: (_via, insulina) => (insulina ? 100 : null),
  ampola: 2, 'frasco-ampola': 2, sachê: 2, envelope: 2, supositório: 2, óvulo: 2, adesivo: 2,
};
function tetoDaDose(unidade, viaAdministracao, insulina) {
  const teto = TETOS_DA_DOSE[unidade] ?? null;
  return typeof teto === 'function' ? teto(viaAdministracao, insulina) : teto;
}

// O texto livre digitado, sem espaços nem ponto final nas pontas, ou '' se em branco.
const textoLivreDe = (item) => String(item.textoLivre ?? '').trim().replace(/\s*\.+$/, '');

function montarItem(item, { catalogo, emissao, configuracao }) {
  const erros = [];
  const alertas = [];
  const erro = (campo, mensagem) => erros.push({ campo, mensagem });

  // O item com a chave textoLivre é de texto livre, mesmo com o texto em branco, e o Produto não vale. Ele não tem
  // Produto: sem forma, sem conversão e sem as Vias de administração do complemento curado. A Unidade de fornecimento é a escolhida pelo
  // Prescritor, sem conteúdo.
  const emTextoLivre = item.textoLivre !== undefined && item.textoLivre !== null;
  const textoLivre = emTextoLivre ? textoLivreDe(item) : '';
  const produto = emTextoLivre ? null : catalogo.find((p) => p.codigo === item.produto);
  const tipo = emTextoLivre ? tipoEscolhido(item) : tipoDeReceita(produto);
  // O padrão do Período de dispensação vai também no item com erro, para a tela preencher o campo desde o início.
  const periodoPadrao = periodoDeDispensacaoPadrao(tipo);
  const comErros = (dose = null) => ({ produto, resultado: { dose, periodoDispensacaoPadrao: periodoPadrao, erros, alertas } });
  // Sem a chave, o texto livre é da Receita simples; com ela, precisa ser um Tipo de receita.
  const comEscolha = emTextoLivre && item.tipoDeReceita !== undefined && item.tipoDeReceita !== null;
  const escolhaInvalida = comEscolha && tipo !== item.tipoDeReceita;
  if (escolhaInvalida) erro('tipoDeReceita', 'Escolha o Tipo de receituário.');
  if (emTextoLivre && !textoLivre) {
    erro('textoLivre', 'Escreva o medicamento.');
    return comErros();
  }
  if (!textoLivre && !produto) {
    erro('produto', 'Escolha um Produto da lista.');
    return comErros();
  }
  const fornecimentoDoItem = textoLivre ? { tipo: item.unidadeFornecimento, conteudo: null, unidade: null } : produto.fornecimento;
  // Fora da REMUME o Produto pode ser receitado, para o paciente comprar, sem alerta: a busca já diz quando está na
  // rede (decisão do usuário de 11/11/2026).
  // O texto livre não tem princípio ativo conhecido: vai para o Tipo de receita que o Prescritor escolheu, e a escolha
  // pode estar errada (decisão do ticket 13, e a escolha, do usuário, de 26/11/2026). Na Receita de Controle Especial,
  // ele pode ser de uma lista que exige Notificação de Receita, que a página não reconhece no texto. O Produto fora das
  // listas não ganha alerta: o mundo é fechado (ticket 18). Quando o texto traz um fármaco que o catálogo põe em outro
  // Tipo de receita, ou numa Notificação de Receita, o alerta diz qual. Com a escolha inválida, o erro já diz o que fazer.
  if (textoLivre && !escolhaInvalida) {
    const confira = oQueOCatalogoDiz(divergenciasDoCatalogo(textoLivre, tipo, catalogo))
      ?? (tipo === SIMPLES ? 'Confira se é antimicrobiano ou controlado.'
        : tipo === CONTROLE_ESPECIAL ? 'Confira se ele não exige Notificação de Receita, que esta página não emite.'
        : 'Confira se o Tipo de receituário está certo.');
    alertas.push({
      campo: 'tipoDeReceita',
      mensagem: `Item em texto livre, sem classificação regulatória: ele vai para o ${tipo}${comEscolha ? ', o Tipo de receituário escolhido' : ''}. ${confira}`,
    });
  }
  const unidades = textoLivre ? UNIDADES_DE_DOSE_DO_TEXTO_LIVRE : unidadesDeDose(produto);
  const modo = textoLivre ? 'manual' : unidades.length ? comoSugerir(produto, unidades) : null;
  const erroProduto = textoLivre ? null
    : !unidades.length ? 'A forma deste Produto não está na tabela de Unidades de dose.'
    : !modo ? `Este Produto ainda não pode ser receitado: a frase não sabe escrever a Unidade de fornecimento "${fornecimentoDoItem.tipo}".`
    : null;
  const erroFornecimento = textoLivre && !UNIDADES_DE_FORNECIMENTO_DO_TEXTO_LIVRE.includes(fornecimentoDoItem.tipo)
    ? 'Escolha a Unidade de fornecimento.' : null;
  // Sem conversão nenhuma, a Quantidade a dispensar é obrigatória.
  const faltaQuantidade = modo !== 'manual' ? null : textoLivre ? 'Item em texto livre: informe a Quantidade a dispensar'
    : 'A Dose deste Produto não se converte em Unidades de fornecimento: informe a Quantidade a dispensar';
  const unidade = item.dose?.unidade;
  const unidadeValida = unidades.includes(unidade);
  const erroUnidade = unidadeValida && produto && !erroProduto ? erroDaUnidade(produto, unidade, modo) : null;
  const permitidas = textoLivre ? TODAS_AS_VIAS : viasPermitidas(produto);
  const viaAdministracao = item.viaAdministracao ?? (permitidas.length === 1 ? permitidas[0] : null);
  const regras = Object.hasOwn(POSOLOGIAS, item.posologia?.tipo) ? POSOLOGIAS[item.posologia.tipo] : null;
  // Na Posologia fracionada e por Etapa, cada Turno ou Etapa tem a sua Dose, e a Dose do item não entra: a tela a guarda
  // para quando o tipo voltar. Dela, só vale a Unidade de dose. Por Turno com o Turno escolhido em `turno`, vale a Dose
  // do item nele, e as Doses por Turno não entram.
  const porTurno = Boolean(regras?.porTurno);
  const porEtapa = Boolean(regras?.porEtapa);
  const turnoEscolhido = porTurno && Object.hasOwn(item.posologia, 'turno');
  const fracionada = porTurno && !turnoEscolhido;
  const turnoValido = turnoEscolhido && Object.hasOwn(TURNOS_NA_FRASE, item.posologia.turno);
  // A Unidade de dose, só se ela serve à forma: sem ela, a Dose entendida mostra só o número.
  const unidadeDaForma = unidadeValida ? unidade : null;
  const doseDoItem = fracionada || porEtapa ? null
    : lerDose(String(item.dose?.valor ?? '').trim(), unidadeDaForma, 'Informe a Dose, maior que zero.');
  const turnos = fracionada ? lerTurnos(item.posologia, unidadeDaForma)
    : turnoValido && !doseDoItem.erro ? [{ turno: item.posologia.turno, valor: doseDoItem.valor }]
    : [];
  const etapas = porEtapa ? lerEtapas(item.posologia.etapas, unidadeDaForma, faltaQuantidade) : [];
  const entendida = fracionada ? turnosEntendidos(turnos) : porEtapa ? etapasEntendidas(etapas) : doseDoItem.entendida;
  const posologia = { tipo: item.posologia?.tipo };
  // Uso contínuo não tem duração: a conta usa o Período de dispensação, que em branco é o padrão do Tipo de receita
  // (ticket 27). A duração digitada antes de marcar o Uso contínuo não entra.
  const usoContinuo = item.usoContinuo === true;
  const periodo = usoContinuo ? inteiroDigitado(item.periodoDispensacao) ?? periodoPadrao : null;
  // O antimicrobiano e o agonista de GLP-1 em Uso contínuo são receitados para cada 30 dias (RDC 471/2021, art. 9º;
  // decisão do ticket 20 para o GLP-1): o Período de dispensação fica nesses 30 dias, e a Quantidade a dispensar é a
  // de cada um deles.
  const dispensacaoFixa = usoContinuo && Boolean(TIPOS_DE_RECEITA[tipo]?.dispensacaoFixa);
  const duracao = { valor: Number(item.duracao?.valor), unidade: item.duracao?.unidade };
  // As recomendações, em texto livre como no iSaúde, vão no fim da frase.
  const recomendacoes = String(item.recomendacoes ?? '').trim();
  const inicio = String(item.inicio ?? '').trim() || emissao;
  // Em Etapas, a Quantidade a dispensar se digita por Etapa, e a do item não entra.
  const digitada = porEtapa ? null : inteiroDigitado(item.quantidadeDispensar);

  if (erroProduto) erro('produto', erroProduto);
  if (erroFornecimento) erro('unidadeFornecimento', erroFornecimento);
  if (doseDoItem?.erro) erro('dose', doseDoItem.erro);
  if (!unidade) erro('unidade', 'Informe a Unidade de dose.');
  else if (!unidadeValida) erro('unidade', 'Unidade de dose incompatível com a forma do Produto.');
  else if (erroUnidade) erro('unidade', erroUnidade);
  if (viaAdministracao === null) erro('viaAdministracao', 'Informe a Via de administração.');
  else if (!permitidas.includes(viaAdministracao)) erro('viaAdministracao', 'Via de administração não permitida para este Produto.');
  if (!regras) erro('posologia', 'Escolha o tipo de Posologia.');
  else if (turnoEscolhido) {
    if (!turnoValido) erro('turno', 'Escolha o Turno.');
  } else if (fracionada) {
    if (!turnos.length) erro('manha', 'Posologia incompleta: informe a Dose de ao menos um Turno.');
    for (const t of turnos) if (t.erro) erro(t.turno, t.erro);
  } else if (porEtapa) {
    for (const e of etapas) erros.push(...e.erros);
    // O erro fica na Dose da Etapa que falta.
    if (etapas.length < 2) erro(`etapas[${etapas.length}].dose`, 'Posologia incompleta: informe ao menos 2 Etapas.');
  } else {
    Object.assign(posologia, lerPosologia(regras, item.posologia, erro));
    const alerta = regras.alerta?.(posologia);
    if (alerta) alertas.push(alerta);
  }
  // Dose única e Uso contínuo se excluem: um é uma Tomada, o outro não termina.
  if (usoContinuo && regras?.semDuracao) erro('usoContinuo', 'Dose única não pode ser de Uso contínuo.');
  else if (usoContinuo && porEtapa) erro('usoContinuo', 'O esquema em Etapas não pode ser de Uso contínuo: cada Etapa tem a sua duração.');
  else if (Number.isNaN(periodo)) erro('periodoDispensacao', 'O Período de dispensação precisa ser um número inteiro de dias, 1 ou mais.');
  else if (dispensacaoFixa && periodo !== DISPENSACAO_EM_USO_CONTINUO) {
    erro('periodoDispensacao', `${TIPOS_DE_RECEITA[tipo].dispensacaoFixa} em Uso contínuo é receitado para cada ${DISPENSACAO_EM_USO_CONTINUO} dias, `
      + `e a Receita vale ${TIPOS_DE_RECEITA[tipo].validade(true)} dias: deixe o Período de dispensação em ${DISPENSACAO_EM_USO_CONTINUO}.`);
  }
  if (!regras?.semDuracao && !porEtapa && !usoContinuo && !lerDuracao(item.duracao)) erro('duracao', 'Informe a duração.');
  // A Receita não receita para o passado: o início não vem antes da emissão.
  if (!dataExiste(inicio)) erro('inicio', 'Data de início inválida: escreva como aaaa-mm-dd.');
  else if (inicio < emissao) erro('inicio', `O início não pode ser antes da emissão (${dataBrasileira(emissao)}).`);
  if (Number.isNaN(digitada)) erro('quantidadeDispensar', 'A Quantidade a dispensar precisa ser um número inteiro, 1 ou mais.');
  else if (faltaQuantidade && digitada === null && !porEtapa) erro('quantidadeDispensar', `${faltaQuantidade}.`);
  if (erros.length) return comErros(entendida);

  // Os tetos da Dose e da Posologia (revisão 1.6) e o início depois da Validade (revisão 1.5): só no item sem erro, que
  // já tem a Dose e a Posologia certas. Primeiro a Dose do item, ou a de cada Turno, ou a Dose e a Posologia de cada
  // Etapa; depois a Posologia do item; por fim, o início.
  const teto = tetoDaDose(unidade, viaAdministracao, semAcento(produto?.principioAtivo ?? textoLivre).includes('insulina'));
  const alertarDose = (campo, valor) => {
    if (teto !== null && valor > teto) alertas.push({ campo, mensagem: `A Dose de ${contagem(valor, unidade)} passa de ${teto} por Tomada: confira.` });
  };
  // 6 vezes ao dia é de 4 em 4 horas: os dois tetos são o mesmo limite. O Se necessário fica de fora, porque o intervalo
  // dele é mínimo.
  const alertarPosologia = ({ tipo: tipoDaPosologia, vezes, horas }, prefixo = '') => {
    if (tipoDaPosologia === 'vezes_ao_dia' && vezes > 6) {
      alertas.push({ campo: `${prefixo}vezes`, mensagem: `A Posologia de ${contagem(vezes, 'vez')} ao dia passa de 6 vezes ao dia: confira.` });
    }
    if (tipoDaPosologia === 'intervalo_horas' && horas < 4) {
      alertas.push({ campo: `${prefixo}horas`, mensagem: `O intervalo de ${contagem(horas, 'hora')} é menor que 4 horas: confira.` });
    }
  };
  if (porEtapa) {
    etapas.forEach((e, i) => {
      alertarDose(`etapas[${i}].dose`, e.dose.valor);
      alertarPosologia(e.posologia, `etapas[${i}].`);
    });
  } else {
    if (fracionada) for (const t of turnos) alertarDose(t.turno, t.valor);
    else alertarDose('dose', doseDoItem.valor);
    alertarPosologia(posologia);
  }
  // A Validade conta como no Código Civil, art. 132: exclui o dia da emissão e inclui o último. A Notificação não tem
  // Tipo de receita, e a Receita simples sem Uso contínuo não tem Validade: sem alerta.
  const validade = TIPOS_DE_RECEITA[tipo]?.validade(usoContinuo, configuracao) ?? null;
  if (validade !== null && diasEntre(emissao, inicio) > validade) {
    alertas.push({
      campo: 'inicio',
      mensagem: `O início, ${dataBrasileira(inicio)}, cai depois do fim da Validade do ${tipo} (${contagem(validade, 'dia')} da emissão): `
        + 'o paciente não conseguiria aviá-lo quando fosse começar.',
    });
  }

  // "…, 2 vezes ao dia, por 30 dias." ou "…, 1 vez ao dia, uso contínuo.".
  const contexto = {
    // Sem conversão, a conta só usa a Unidade de fornecimento do Produto, que no texto livre é a escolhida.
    produto: produto ?? { fornecimento: fornecimentoDoItem },
    unidade,
    modo,
    porVia: `por via ${viaNaFrase(viaAdministracao)}`,
  };
  const calculo = porEtapa ? calcularEtapas(etapas, inicio, contexto)
    : calcularPosologia({ regras, posologia, dose: doseDoItem?.valor, turnos, usoContinuo, periodo, duracao, inicio, digitada }, contexto);
  const { total, sugerida, dispensar, fornecimento } = calculo;
  // "frascos de 20 ml": a Unidade de fornecimento com o conteúdo, quando o CATMAT o informa.
  const comConteudo = (texto) => `${texto}${deConteudo(fornecimentoDoItem)}`;
  // Só a Receita de Controle Especial pede a quantidade também por extenso (Portaria 344, art. 52, § 1º, e art. 55, c).
  const quantidadeImpressa = comConteudo(contagemNaReceita(dispensar, fornecimento, tipo === CONTROLE_ESPECIAL))
    + (dispensacaoFixa ? ` para cada ${contagem(DISPENSACAO_EM_USO_CONTINUO, 'dia')}` : '');
  // "Muito acima" da sugerida é mais que o dobro (decisão do ticket 06): pega a Quantidade total digitada no lugar das
  // Unidades de fornecimento, como os 105 "frascos" do iSaúde, e deixa arredondar para cima ou somar um frasco. Em
  // Etapas, vale para cada Etapa, no campo dela, porque cada uma tem a sua. No uso eventual do frasco
  // multidose (ticket 23), o dobro conta sobre o teto: digitar o teto não é "muito acima".
  for (const q of calculo.digitaveis) {
    const referencia = q.teto ?? q.sugerida;
    if (referencia !== null && q.dispensar > 2 * referencia) {
      const deQue = q.teto ? 'do teto do "se necessário"' : 'da sugerida';
      alertas.push({
        campo: q.campo,
        mensagem: `A Quantidade a dispensar${q.daEtapa} passa do dobro ${deQue} (${comConteudo(contagem(referencia, fornecimento))}).`,
      });
    }
  }
  // Acima do limite de tratamento, a justificativa digitada vai para a Receita; sem ela, a Receita é bloqueada
  // (bloquearSemJustificativa). Dentro do limite, ela não entra.
  const alertaLimite = tipo === CONTROLE_ESPECIAL ? alertaDoLimite(produto, calculo.tratamento, inicio) : null;
  if (alertaLimite) alertas.push(alertaLimite);
  const justificativa = alertaLimite ? String(item.justificativa ?? '').trim() : null;
  // As partes da frase, que o quadro do item imprime separadas (ticket 24). No texto livre, o texto toma o lugar do
  // princípio ativo, da concentração e da forma.
  const partes = {
    medicamento: textoLivre || nomeDoProduto(produto),
    doseEPosologia: `${verbo(viaAdministracao, unidade)} ${calculo.doseEPosologia}`,
    quantidadeImpressa,
    recomendacoes: recomendacoes || null,
  };
  const frase = `${partes.medicamento}. ${partes.doseEPosologia}. Quantidade: ${partes.quantidadeImpressa}.`
    + `${partes.recomendacoes ? ` ${partes.recomendacoes}` : ''}`;

  return {
    produto,
    usoContinuo,
    tipoDeReceita: tipo,
    resultado: {
      tipoDeReceita: tipo,
      // A Notificação de Receita que o item exige, ou null.
      notificacao: notificacao(produto),
      dose: entendida,
      quantidadeTotal: total,
      quantidadeDispensar: dispensar,
      quantidadeDispensarSugerida: sugerida,
      // A sugerida de cada campo de Quantidade a dispensar, o do item ou o de cada Etapa, para a tela preenchê-lo.
      quantidadesSugeridas: calculo.digitaveis.map((d) => ({ campo: d.campo, sugerida: d.sugerida })),
      // O Período de dispensação que vale quando o Prescritor não digita outro, para a tela preencher o campo.
      periodoDispensacaoPadrao: periodoPadrao,
      ajusteManual: calculo.ajusteManual,
      unidadeFornecimento: fornecimento,
      extenso: porExtenso(dispensar, fornecimento),
      quantidadeImpressa,
      // Por que a sugerida não é uma conta exata: sem conversão confiável, ou o teto do "se necessário", que no uso
      // eventual do frasco multidose fica acima da sugerida (ticket 23).
      notaDaQuantidade: modo === 'sugereUma' ? 'ajuste conforme a área/uso'
        : modo !== 'conta' ? null
        : calculo.teto ? `uso eventual: o teto é ${contagem(calculo.teto, fornecimento)}`
        : regras.nota ?? null,
      conta: calculo.conta,
      frase,
      partes,
      justificativa,
      uso: VIAS_DE_ADMINISTRACAO[viaAdministracao].uso,
      // Em Etapas, cada Etapa arredonda a sua Quantidade a dispensar, e a conta de outra apresentação não se compara.
      // No uso eventual (ticket 23), todo frasco sugere 1, e comparar o teto entre apresentações contradiria a sugerida.
      outraApresentacao: modo === 'conta' && !porEtapa && !calculo.teto
        ? outraApresentacao(produto, unidade, total, calculo.dias, catalogo) : null,
      erros,
      alertas,
    },
  };
}

// "2 comprimidos × 1 vez × 5 dias": a Dose e as Tomadas, como o tipo de Posologia as escreve na conta.
const contaDaDose = (dose, unidade, regras, posologia, dias, tomadas) => `${contagem(dose, unidade)} × `
  + `${regras.conta?.(posologia, dias, tomadas) ?? tomadasEm(tomadas, regras.texto(posologia), dias)}`;

// A conta de uma Posologia sem Etapas: os dias, a Quantidade total, a sugerida e a digitada, a conta escrita, o trecho
// da frase entre o verbo e a Quantidade.
function calcularPosologia({ regras, posologia, dose, turnos, usoContinuo, periodo, duracao, inicio, digitada }, contexto) {
  const { produto, unidade, modo, porVia } = contexto;
  const porTurno = Boolean(regras.porTurno);
  // Os dias da conta e o trecho da frase: sem duração na dose única; o Período de dispensação no Uso contínuo, com
  // "uso contínuo" no lugar da duração; nos demais, a duração digitada.
  const { dias, duracaoNaFrase } = regras.semDuracao ? { dias: null, duracaoNaFrase: '' }
    : usoContinuo ? { dias: periodo, duracaoNaFrase: ', uso contínuo' }
    : { dias: emDias(duracao, inicio), duracaoNaFrase: `, por ${contagem(duracao.valor, duracao.unidade)}` };
  const tomadas = porTurno ? null : regras.tomadas(posologia, dias, inicio);
  // Quantidade total na Unidade de dose; a sugerida vem dela, e a digitada, quando há, a substitui. Por Turno, não se
  // contam Tomadas: é a soma das Doses por Turno × dias.
  const total = semResiduo(porTurno ? turnos.reduce((soma, t) => soma + t.valor, 0) * dias : dose * tomadas);
  const { sugerida, fornecimento, passos, teto } = sugerir(modo, produto, unidade, total, dias, regras.eventual);
  const dispensar = digitada ?? sugerida;

  // A conta mostra cada passo da sugerida: "40 gotas × 4 vezes × 3 dias = 480 gotas = 24 ml → 2 frascos de 20 ml".
  // Por Turno: "(10 UI + 6 UI) × 30 dias = 480 UI".
  const dosesPorTurno = turnos.map((t) => contagem(t.valor, unidade));
  const inicioDaConta = porTurno
    ? `${dosesPorTurno.length > 1 ? `(${dosesPorTurno.join(' + ')})` : dosesPorTurno[0]} × ${contagem(dias, 'dia')}`
    : contaDaDose(dose, unidade, regras, posologia, dias, tomadas);
  // Por Turno, a Via de administração vem depois da 1ª Dose: "Aplicar 10 (dez) UI por via subcutânea pela manhã e
  // 6 (seis) UI à noite".
  const doseEPosologia = porTurno
    ? comTurnos(turnos, (t, i) => `${contagemNaReceita(t.valor, unidade)}${i ? '' : ` ${porVia}`}`)
    : `${contagemNaReceita(dose, unidade)} ${porVia}, ${regras.texto(posologia)}`;
  return {
    dias,
    // Os dias de tratamento, para o limite da Receita de Controle Especial, e o texto deles.
    tratamento: dias === null ? null
      : { dias, texto: usoContinuo ? contagem(dias, 'dia') : contagem(duracao.valor, duracao.unidade) },
    total,
    sugerida,
    dispensar,
    // Ajuste manual: a Quantidade a dispensar digitada difere da sugerida.
    ajusteManual: dispensar !== sugerida,
    fornecimento,
    // O teto do uso eventual (ticket 23), ou null.
    teto,
    // A Quantidade a dispensar que o Prescritor digita, e o campo dela.
    digitaveis: [{ campo: 'quantidadeDispensar', daEtapa: '', dispensar, sugerida, teto }],
    conta: `${inicioDaConta} = ${contagem(total, unidade)}${passos}`,
    doseEPosologia: `${doseEPosologia}${duracaoNaFrase}`,
  };
}

// A conta do esquema em Etapas. Cada Etapa começa quando a anterior termina e tem a sua conta, como uma Posologia
// sozinha: a Quantidade total é a soma das Etapas, e a Quantidade a dispensar, a soma das de cada Etapa, cada uma
// arredondada para cima (10 + 5 + 3 = 18), porque cada Etapa tem a sua, que o Prescritor ajusta. A conta escreve cada Etapa e,
// quando todas têm sugerida, a soma: "Etapa 1: …; Etapa 2: …. Total: 10 + 5 + 3 = 18 comprimidos". A frase descreve
// cada Etapa na ordem, com a Via de administração depois da 1ª Dose: "Tomar 2 (dois)
// comprimidos por via oral, 1 vez ao dia, por 5 dias; depois 1 (um) comprimido, 1 vez ao dia, por 5 dias".
function calcularEtapas(etapas, inicio, { produto, unidade, modo, porVia }) {
  let comeco = inicio;
  const trechos = etapas.map(({ dose: { valor: dose }, regras, posologia, duracao, digitada }, i) => {
    const dias = emDias(duracao, comeco);
    const tomadas = regras.tomadas(posologia, dias, comeco);
    const total = semResiduo(dose * tomadas);
    const { sugerida, fornecimento, passos } = sugerir(modo, produto, unidade, total, dias);
    const dispensar = digitada ?? sugerida;
    const trecho = {
      total,
      sugerida,
      dispensar,
      fornecimento,
      conta: `Etapa ${i + 1}: ${contaDaDose(dose, unidade, regras, posologia, dias, tomadas)} = ${contagem(total, unidade)}${passos}`,
      frase: `${i ? 'depois ' : ''}${contagemNaReceita(dose, unidade)}${i ? '' : ` ${porVia}`}, ${regras.texto(posologia)}`
        + `, por ${contagem(duracao.valor, duracao.unidade)}`,
    };
    comeco = somarDias(comeco, dias);
    return trecho;
  });
  const somar = (campo) => trechos.reduce((soma, t) => soma + t[campo], 0);
  const sugeridas = trechos.map((t) => t.sugerida);
  const sugerida = sugeridas.includes(null) ? null : somar('sugerida');
  const { fornecimento } = trechos[0];
  const soma = sugerida === null ? ''
    : `. Total: ${sugeridas.map(numero).join(' + ')} = ${contagem(sugerida, fornecimento)}${deConteudo(produto.fornecimento)}`;
  const diasDasEtapas = diasEntre(inicio, comeco);
  return {
    dias: null,
    tratamento: { dias: diasDasEtapas, texto: contagem(diasDasEtapas, 'dia') },
    total: semResiduo(somar('total')),
    sugerida,
    dispensar: somar('dispensar'),
    ajusteManual: trechos.some((t) => t.dispensar !== t.sugerida),
    fornecimento,
    digitaveis: trechos.map(({ dispensar: d, sugerida: s }, i) => ({
      campo: `etapas[${i}].quantidadeDispensar`, daEtapa: ` da Etapa ${i + 1}`, dispensar: d, sugerida: s,
    })),
    conta: trechos.map((t) => t.conta).join('; ') + soma,
    doseEPosologia: trechos.map((t) => t.frase).join('; '),
  };
}

// No máximo 3 itens da lista C1 por Receita de Controle Especial (Portaria 344/1998, art. 57). A norma conta
// substâncias; aqui contam os itens, o que só é mais rígido (decisão do ticket 12).
const LISTA_C1 = 'C1';
const MAXIMO_DE_C1_POR_RECEITA = 3;

// Os itens de Controle Especial, divididos em Receitas: os da C1 de 3 em 3, na ordem da lista, e os da C5 e dos adendos,
// sem limite na norma, na 1ª (o limite deles é uma pergunta pendente da spec). O texto livre, sem Produto, não diz a
// lista: conta como da C1, o que só é mais rígido.
function receitasDeControleEspecial(montados) {
  const c1 = montados.filter((m) => (m.produto?.portaria344.lista ?? LISTA_C1) === LISTA_C1);
  const outros = montados.filter((m) => !c1.includes(m));
  const receitas = [];
  for (let i = 0; i < c1.length; i += MAXIMO_DE_C1_POR_RECEITA) receitas.push(c1.slice(i, i + MAXIMO_DE_C1_POR_RECEITA));
  if (!receitas.length) return outros.length ? [outros] : [];
  // Na ordem da lista: os outros entram na 1ª Receita, cada um no lugar dele.
  receitas[0] = montados.filter((m) => receitas[0].includes(m) || outros.includes(m));
  return receitas;
}

// A Receita que traz o CPF do paciente não sai sem ele (Portaria 344/1998, art. 55, b). O bloqueio é da Receita, e não
// dos itens, que continuam sem erro. As Receitas bloqueadas pelo mesmo motivo dão um bloqueio só, com as
// posições dos itens de todas em itens, a partir de 0, e o campo do paciente que falta, para a tela mostrar o motivo
// junto dele.
function bloquearSemCpf(receitas) {
  const semCpf = receitas.filter((r) => TIPOS_DE_RECEITA[r.tipo].cpf && !r.paciente.cpf);
  const itens = semCpf.flatMap((r) => r.itens.map((i) => i.item)).sort((a, b) => a - b);
  return {
    receitas: receitas.filter((r) => !semCpf.includes(r)),
    bloqueios: itens.length ? [{ itens, campo: 'cpf', mensagem: `${semCpf[0].tipo} exige CPF.` }] : [],
  };
}

// Acima do limite de tratamento, a Receita de Controle Especial não sai sem a justificativa com o CID (Portaria
// 344/1998, art. 59, parágrafo único; decisão do usuário no ticket 13). Cada item sem ela dá um bloqueio, no campo dele,
// e a Receita que o leva sai das Receitas. Como no bloqueio do CPF, o item continua sem erro. A
// justificativa em branco é '', e a que não se pede é null.
function bloquearSemJustificativa(receitas, validos) {
  const semJustificativa = validos.filter((m) => m.resultado.justificativa === '').map((m) => m.posicao);
  return {
    receitas: receitas.filter((r) => !r.itens.some((i) => semJustificativa.includes(i.item))),
    bloqueios: semJustificativa.map((posicao) => ({
      itens: [posicao],
      campo: 'justificativa',
      mensagem: `${CONTROLE_ESPECIAL} acima do limite de tratamento exige justificativa com o CID.`,
    })),
  };
}

// O item que exige Notificação de Receita não sai em nenhuma Receita: ela vem em talão numerado pela Vigilância
// Sanitária (Portaria 344, arts. 40 e 45), e cada uma dá um bloqueio, porque leva 1 substância (art. 35, § 7º). Como no
// bloqueio do CPF, o item continua sem erro.
function bloquearNotificacoes(validos) {
  return validos.filter((m) => m.resultado.notificacao).map(({ posicao, produto, resultado }) => ({
    itens: [posicao],
    // O bloqueio é do próprio item, e não falta campo do paciente.
    campo: null,
    mensagem: `${produto.principioAtivo} ${produto.concentracao} exige ${resultado.notificacao}, em talão numerado pela Vigilância Sanitária.`,
  }));
}

// O CPF do paciente como foi digitado, sem espaços nas pontas, ou '' se em branco.
const cpfDe = (paciente) => String(paciente.cpf ?? '').trim();

// Separação (spec, Classificação e separação): a Receita simples com os itens comuns, a Receita de antimicrobiano só com
// os antimicrobianos, a Receita de agonista de GLP-1 só com os GLP-1 e a Receita de Controle Especial só com os
// controlados, nesta ordem. O GLP-1 não vai na Receita de antimicrobiano, que tem outra Validade (ticket 20). Os
// antimicrobianos em uso comum e em Uso contínuo vão em Receitas separadas, de 10 e de 90 dias (decisão do ticket 11):
// numa Receita só de 90 dias, o de uso comum poderia ser aviado depois dos 10 dias da norma (IN 360, art. 1º, § 2º;
// RDC 471, art. 13). Os controlados vão em quantas Receitas de Controle Especial o limite da C1 pedir. Cada Receita
// numera os seus itens a partir de 1, e "item" é a posição dele em itens, a partir de 0.
function separarReceitas(validos, { emissao, paciente = {}, prescritor, unidade, configuracao, demonstracao }) {
  if (!validos.length) return [];
  // O Emitente, sem os códigos internos do iSaúde. O endereço e o telefone são exigidos na Receita de Controle Especial
  // (Portaria 344/1998, art. 55) e na de antimicrobiano (RDC 471/2021), e vão em todas, para o molde ser um só. O
  // cargo, opcional, é null quando falta.
  const cabecalho = {
    // As linhas do cabeçalho institucional da unidade, e o nome dela.
    institucional: [...unidade.cabecalho, unidade.nome],
    unidade: unidade.nome,
    cnes: unidade.cnes,
    endereco: unidade.endereco,
    telefone: unidade.telefone,
    profissional: `${prescritor.nome} — ${prescritor.conselho}-${prescritor.uf} ${prescritor.numero}`,
  };
  // A assinatura do iSaúde, com a data de emissão, e não a da impressão (ADR 0004).
  const [ano, mes, dia] = emissao.split('-');
  const assinatura = {
    nome: prescritor.nome,
    cargo: String(prescritor.cargo ?? '').trim() || null,
    registro: `${prescritor.conselho}/${prescritor.uf} - ${prescritor.numero}`,
    localEData: `${unidade.municipio}-${unidade.uf}, ${dia} de ${MESES[mes - 1]} de ${ano}`,
  };
  const nascimento = String(paciente.nascimento ?? '').trim();
  const doTipo = (tipo) => validos.filter((m) => m.tipoDeReceita === tipo);
  const antimicrobianos = doTipo(ANTIMICROBIANO);
  const grupos = [
    { tipo: SIMPLES, montados: doTipo(SIMPLES) },
    { tipo: ANTIMICROBIANO, montados: antimicrobianos.filter((m) => !m.usoContinuo) },
    { tipo: ANTIMICROBIANO, montados: antimicrobianos.filter((m) => m.usoContinuo) },
    { tipo: GLP1, montados: doTipo(GLP1) },
    ...receitasDeControleEspecial(doTipo(CONTROLE_ESPECIAL)).map((montados) => ({ tipo: CONTROLE_ESPECIAL, montados })),
  ];
  return grupos.filter((g) => g.montados.length).map(({ tipo, montados }) => {
    const { vias, cpf, camposEmBranco, validade: validadeDoTipo } = TIPOS_DE_RECEITA[tipo];
    const validade = validadeDoTipo(montados.some((m) => m.usoContinuo), configuracao);
    return {
      tipo,
      vias: vias.map((rotulo, i) => ({ numero: i + 1, rotulo })),
      cabecalho,
      assinatura,
      // O paciente como no iSaúde, em todo tipo (decisão do usuário de 09/11/2026). Os exigidos: nome e endereço em toda
      // Receita (Lei 5.991/1973, art. 35), idade e sexo na de antimicrobiano e na de GLP-1 (RDC 471/2021, art. 6º), e o
      // CPF, só na de Controle Especial (Portaria 344/1998, art. 55, b).
      paciente: {
        nome: paciente.nome ?? '',
        cns: paciente.cns ?? '',
        nascimento: dataExiste(nascimento) ? dataBrasileira(nascimento) : '',
        idade: idade(nascimento, emissao),
        sexo: paciente.sexo ?? '',
        contato: paciente.contato ?? '',
        endereco: paciente.endereco ?? '',
        ...(cpf ? { cpf: cpfDe(paciente) } : {}),
      },
      itens: montados.map((m, i) => ({
        numero: i + 1, item: m.posicao, uso: m.resultado.uso, frase: m.resultado.frase, partes: m.resultado.partes,
        justificativa: m.resultado.justificativa,
      })),
      emissao: dataBrasileira(emissao),
      validade: validade ? contagem(validade, 'dia') : null,
      camposEmBranco,
      marca: demonstracao ? MARCA : null,
    };
  });
}
