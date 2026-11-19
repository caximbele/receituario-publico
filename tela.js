// A tela do Receituário, em JavaScript puro (spec da Fase 2, seção 2). Ela guarda a lista de itens e as linhas coladas
// que não voltaram, chama a Montagem da Receita a cada mudança e redesenha o formulário, a lista e a barra. Nenhuma
// regra de cálculo, Frase ou separação fica aqui: elas estão em src/. Nada do paciente sai da memória: sem armazenamento do navegador, sem URL e sem arquivo.
import {
  montarReceita, unidadesDeDose, viasPermitidas, temDuracao, notificacao, CONDICOES_SE_NECESSARIO, TODAS_AS_VIAS,
  UNIDADES_DE_DOSE_DO_TEXTO_LIVRE, UNIDADES_DE_FORNECIMENTO_DO_TEXTO_LIVRE,
} from './src/montagem.js';
import { VIAS_DE_ADMINISTRACAO } from './src/produto.js';
import { buscarProdutos, descreverProduto } from './src/busca.js';
import { idade } from './src/datas.js';
import { textoParaColar } from './src/texto-para-colar.js';
import { renovar } from './src/renovacao.js';
import { folhasDoImpresso } from './impresso.js';
import { nomeDosItens } from './src/texto.js';
import { ORIGEM_DO_ISAUDE, doIsaude, lerMensagem } from './src/mensagem.js';
import catalogo from './dados/catalogo.js';
import configuracao from './dados/configuracao.js';
import demonstracao from './dados/demonstracao.js';

const $ = (id) => document.getElementById(id);
const form = $('item');
const campoProduto = $('produto');
const listaDeProdutos = $('lista-produtos');

function hoje() {
  const d = new Date();
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0')).join('-');
}

function paragrafo(classe, texto) {
  const p = document.createElement('p');
  p.className = classe;
  p.textContent = texto;
  return p;
}

// Os botões de uma linha da lista, como "editar" e "tirar": [ação, rótulo para o leitor de tela].
function acoes(posicao, ...botoes) {
  const p = document.createElement('p');
  p.className = 'acoes';
  for (const [acao, rotulo] of botoes) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'botao';
    botao.dataset.acao = acao;
    botao.dataset.posicao = String(posicao);
    botao.textContent = acao;
    botao.setAttribute('aria-label', rotulo);
    p.append(botao, ' ');
  }
  return p;
}

const contagem = (n, um, varios) => (n === 1 ? `1 ${um}` : `${n} ${varios}`);
// "Bloqueio (itens 2 e 3): Receita de Controle Especial exige CPF."
const textoDoBloqueio = ({ itens: posicoes, mensagem }) => `Bloqueio (${nomeDosItens(posicoes)}): ${mensagem}`;

// O que o Favorito mandou, já conferido por lerMensagem: { paciente, prescritor, unidade, lidoEm }, ou null.
let recebido = null;

// O único lugar de onde vêm o paciente, o Prescritor e a unidade: do Favorito, pelo postMessage, ou, com a página
// aberta direto, da demonstração, com o paciente fictício escolhido no topo.
function atendimento() {
  if (recebido) return { ...recebido, demonstracao: false };
  const paciente = demonstracao.pacientes.find((p) => p.id === $('paciente-ficticio').value) ?? {};
  return { paciente, prescritor: demonstracao.prescritor, unidade: demonstracao.unidade, demonstracao: true };
}

// A lista de itens, no formato da entrada da montarReceita: a única coisa que a tela guarda.
const itens = [];
let editando = null; // a posição do item que está no formulário, ou null para um item novo
let escolhido = null; // o Produto escolhido na busca
// O erro de um campo só aparece depois que ele muda, ou depois que se tenta acrescentar o item.
const tocados = new Set();
let tentou = false;
// As linhas coladas em Renovar que não voltaram, { texto, motivo }, até o Prescritor descartá-las.
const naoReconhecidas = [];
// O último texto copiado: o "Copiado" sai quando o Texto para colar da lista deixa de ser ele.
let copiado = null;

const montar = (lista) => montarReceita({ ...atendimento(), itens: lista, emissao: hoje(), catalogo, configuracao });

// Os parâmetros de cada tipo de Posologia: o nome na Montagem → o id do campo. Cada tipo tem os seus campos, escondidos
// quando o tipo é outro, e por isso o Tab só passa pelos campos do tipo escolhido. A fracionada é a Posologia por Turno
// sem o Turno escolhido, com a Dose de cada Turno.
const PARAMETROS = {
  vezes_ao_dia: { vezes: 'vezes' },
  intervalo_horas: { horas: 'horas' },
  por_turno: { turno: 'turno' },
  fracionada: { manha: 'dose-manha', tarde: 'dose-tarde', noite: 'dose-noite' },
  vezes_por_semana: { vezes: 'vezes-semana' },
  vezes_por_mes: { vezes: 'vezes-mes' },
  dias_alternados: { aCadaDias: 'aCadaDias' },
  se_necessario: { sintoma: 'sintoma', horas: 'horas-minimas', maximoPorDia: 'maximoPorDia' },
  dose_unica: {},
  etapas: {},
};
// O número de cada Posologia da Etapa vai num campo só, "etapas[i].numero": o nome dele na Montagem e o rótulo.
const NUMERO_DA_ETAPA = {
  vezes_ao_dia: ['vezes', 'Vezes ao dia'],
  intervalo_horas: ['horas', 'A cada quantas horas'],
  vezes_por_semana: ['vezes', 'Vezes por semana'],
  vezes_por_mes: ['vezes', 'Vezes por mês'],
  dias_alternados: ['aCadaDias', 'A cada quantos dias'],
};
// shortcut: o item com mais Etapas, que só a Renovação traria, perde as de depois da 6ª ao ser editado; aumentar aqui.
const MAXIMO_DE_ETAPAS = 6;
const idDoCampo = (campo) => PARAMETROS[$('posologia').value][campo] ?? campo.replace(/\.(vezes|horas|aCadaDias)$/, '.numero');
const etapa = (i, campo) => $(`etapas[${i}].${campo}`);
const quantasEtapas = () => Number($('numero-de-etapas').value);
const foraDoCatalogo = () => $('foraDoCatalogo').checked;
// O Medicamento é a busca, ou o texto, fora do catálogo.
const focarMedicamento = () => (foraDoCatalogo() ? $('textoLivre') : campoProduto).focus();

// Duas linhas: de quem é a Receita e, depois, quando foi lida, quem prescreve e em que unidade.
function mostrarTopo() {
  const { paciente, prescritor, unidade, lidoEm, demonstracao: demo } = atendimento();
  const { nome, conselho, numero, uf } = prescritor;
  const hora = lidoEm && new Date(lidoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const linha = (partes) => partes.filter(Boolean).join(' · ');
  $('topo-paciente').textContent = linha([paciente.nome || 'Paciente sem nome', idade(paciente.nascimento, hoje()), paciente.cns && `CNS ${paciente.cns}`]);
  $('topo-atendimento').textContent = linha([
    hora && `Lido do iSaúde às ${hora}`,
    [nome, conselho && numero && uf && `${conselho}-${uf} ${numero}`].filter(Boolean).join(', '),
    unidade.nome,
  ]);
  $('selo').hidden = !demo;
  $('bloco-paciente-ficticio').hidden = !demo;
}

// Escolhido o Produto, a Unidade de dose e a Via de administração vêm preenchidas quando há uma só opção. Com mais de
// uma, ficam em branco: uma Unidade de dose errada, como gota no lugar de ml, é uma Dose errada.
function preencherOpcoes(select, opcoes) {
  const branco = opcoes.length === 1 ? [] : [new Option('Escolha', '')];
  select.replaceChildren(...branco, ...opcoes.map(([valor, texto]) => new Option(texto, valor)));
}

// Fora do catálogo, todas as Unidades de dose e Vias de administração.
function opcoesDoProduto() {
  const livre = foraDoCatalogo();
  const unidades = livre ? UNIDADES_DE_DOSE_DO_TEXTO_LIVRE : escolhido ? unidadesDeDose(escolhido) : [];
  const vias = livre ? TODAS_AS_VIAS : escolhido ? viasPermitidas(escolhido) : [];
  preencherOpcoes($('unidade'), unidades.map((u) => [u, u]));
  preencherOpcoes($('viaAdministracao'), vias.map((v) => [v, VIAS_DE_ADMINISTRACAO[v].nome]));
}

// Mostra só os campos do tipo de Posologia escolhido e das Etapas em uso. A dose única não tem duração nem Uso
// contínuo, e o Uso contínuo troca a duração pelo Período de dispensação. Na fracionada e nas Etapas, a Dose do item
// não entra, e nas Etapas, nem a Quantidade a dispensar do item.
function mostrarCampos() {
  const tipo = $('posologia').value;
  const continuo = $('usoContinuo').checked;
  const comDuracao = temDuracao(tipo);
  const livre = foraDoCatalogo();
  for (const el of form.querySelectorAll('[data-posologia]')) el.hidden = el.dataset.posologia !== tipo;
  for (const opcao of $('posologia').options) opcao.disabled = continuo && !temDuracao(opcao.value);
  $('bloco-uso-continuo').hidden = !comDuracao;
  $('atalhos-duracao').hidden = !comDuracao;
  $('bloco-duracao').hidden = !comDuracao || continuo;
  $('bloco-periodo').hidden = !comDuracao || !continuo;
  $('bloco-dose').hidden = tipo === 'fracionada' || tipo === 'etapas';
  $('bloco-quantidade').hidden = tipo === 'etapas';
  $('bloco-produto').hidden = livre;
  $('bloco-texto-livre').hidden = !livre;
  $('bloco-fornecimento').hidden = !livre;
  [...$('etapas').children].forEach((el, i) => {
    el.hidden = i >= quantasEtapas();
    el.querySelector('label[for$=".numero"]').textContent = NUMERO_DA_ETAPA[etapa(i, 'posologia').value][1];
  });
}

// As Etapas em uso, no formato da Montagem.
function etapasDigitadas() {
  return Array.from({ length: quantasEtapas() }, (_, i) => {
    const valor = (campo) => etapa(i, campo).value;
    const tipo = valor('posologia');
    return {
      dose: valor('dose'),
      posologia: { tipo, [NUMERO_DA_ETAPA[tipo][0]]: valor('numero') },
      duracao: { valor: valor('duracao'), unidade: valor('duracao-unidade') },
      quantidadeDispensar: valor('quantidadeDispensar'),
    };
  });
}

// O item do formulário, no formato da entrada da montarReceita. O Período de dispensação e a Quantidade a dispensar
// em branco valem o padrão e a sugerida; o número digitado é o Ajuste manual.
function rascunho() {
  const tipo = $('posologia').value;
  return {
    ...(foraDoCatalogo()
      ? { textoLivre: $('textoLivre').value, unidadeFornecimento: $('unidadeFornecimento').value }
      : { produto: escolhido?.codigo ?? '' }),
    dose: { valor: $('dose').value, unidade: $('unidade').value },
    viaAdministracao: $('viaAdministracao').value === '' ? null : Number($('viaAdministracao').value),
    posologia: {
      tipo: tipo === 'fracionada' ? 'por_turno' : tipo,
      ...Object.fromEntries(Object.entries(PARAMETROS[tipo]).map(([campo, id]) => [campo, $(id).value])),
      ...(tipo === 'etapas' ? { etapas: etapasDigitadas() } : {}),
    },
    usoContinuo: $('usoContinuo').checked,
    duracao: { valor: $('duracao').value, unidade: $('duracao-unidade').value },
    periodoDispensacao: $('periodoDispensacao').value,
    quantidadeDispensar: $('quantidadeDispensar').value,
    recomendacoes: $('recomendacoes').value,
    inicio: $('inicio').value,
    justificativa: $('justificativa').value,
  };
}

// Põe no formulário um item da lista, para editá-lo.
function preencher(item) {
  form.reset();
  const valor = (v) => (v === undefined || v === null ? '' : String(v));
  $('foraDoCatalogo').checked = item.textoLivre !== undefined && item.textoLivre !== null;
  $('textoLivre').value = valor(item.textoLivre);
  $('unidadeFornecimento').value = valor(item.unidadeFornecimento);
  escolhido = catalogo.find((p) => p.codigo === item.produto) ?? null;
  campoProduto.value = escolhido ? descreverProduto(escolhido).rotulo : '';
  opcoesDoProduto();
  $('dose').value = valor(item.dose?.valor);
  $('unidade').value = valor(item.dose?.unidade);
  $('viaAdministracao').value = valor(item.viaAdministracao);
  const { posologia } = item;
  const tipo = posologia.tipo === 'por_turno' && !Object.hasOwn(posologia, 'turno') ? 'fracionada' : posologia.tipo;
  $('posologia').value = tipo;
  for (const [campo, id] of Object.entries(PARAMETROS[tipo] ?? {})) $(id).value = valor(posologia[campo]);
  const etapas = (posologia.etapas ?? []).slice(0, MAXIMO_DE_ETAPAS);
  if (etapas.length >= 2) $('numero-de-etapas').value = String(etapas.length);
  etapas.forEach((e, i) => {
    etapa(i, 'dose').value = valor(e.dose);
    etapa(i, 'posologia').value = e.posologia.tipo;
    etapa(i, 'numero').value = valor(e.posologia[NUMERO_DA_ETAPA[e.posologia.tipo][0]]);
    etapa(i, 'duracao').value = valor(e.duracao?.valor);
    etapa(i, 'duracao-unidade').value = e.duracao?.unidade ?? 'dia';
    etapa(i, 'quantidadeDispensar').value = valor(e.quantidadeDispensar);
  });
  $('usoContinuo').checked = Boolean(item.usoContinuo);
  $('duracao').value = valor(item.duracao?.valor);
  $('duracao-unidade').value = item.duracao?.unidade ?? 'dia';
  for (const id of ['periodoDispensacao', 'quantidadeDispensar', 'recomendacoes', 'inicio', 'justificativa']) $(id).value = valor(item[id]);
}

// As mensagens do item, cada uma no campo dela: os erros (só dos campos tocados), a interpretação da Dose, os alertas
// e os bloqueios. O que não é de nenhum campo vai embaixo do formulário.
function mostrarMensagens(item, gerais, bloqueios) {
  const porCaixa = new Map([...form.querySelectorAll('.msgs')].map((el) => [el, []]));
  // O bloqueio sem campo é o da Notificação de Receita, que é do Produto.
  const caixa = (campo) => $(`msgs-${idDoCampo(campo ?? 'produto')}`) ?? $('msgs-geral');
  const por = (campo, classe, texto) => porCaixa.get(caixa(campo)).push([classe, texto]);
  for (const e of item.erros) if (tentou || tocados.has(idDoCampo(e.campo))) por(e.campo, 'erro', `Erro: ${e.mensagem}`);
  // Na fracionada e nas Etapas, a Dose do item está escondida, e a interpretação das Doses vai na Posologia.
  if (item.dose) por($('bloco-dose').hidden ? 'posologia' : 'dose', 'ajuda', `Interpretação: ${item.dose.interpretacao}`);
  for (const a of item.alertas) por(a.campo, 'alerta', `Alerta: ${a.mensagem}`);
  for (const a of gerais) porCaixa.get($('msgs-geral')).push(['alerta', `Alerta: ${a.mensagem}`]);
  for (const b of bloqueios) por(b.campo, 'erro', `Bloqueio: ${b.mensagem}`);
  for (const [el, mensagens] of porCaixa) {
    el.replaceChildren(...mensagens.map(([classe, texto]) => paragrafo(classe, texto)));
    $(el.id.replace('msgs-', ''))?.setAttribute('aria-invalid', String(mensagens.some(([classe]) => classe === 'erro')));
  }
}

// As Frases numeradas, na ordem de entrada, cada uma com o alerta e o bloqueio dela, em texto, e os botões.
function mostrarLista({ itens: montados, alertas, bloqueios }) {
  $('itens').replaceChildren(...montados.map((item, i) => {
    const doItem = (lista) => lista.filter((x) => x.itens.includes(i));
    const li = document.createElement('li');
    if (i === editando) li.className = 'em-edicao';
    li.append(
      paragrafo('frase', `${item.frase ?? 'Item incompleto: use editar para corrigi-lo.'}${i === editando ? ' (em edição no formulário)' : ''}`),
      ...item.erros.map((e) => paragrafo('erro', `Erro: ${e.mensagem}`)),
      ...[...item.alertas, ...doItem(alertas)].map((a) => paragrafo('alerta', `Alerta: ${a.mensagem}`)),
      ...doItem(bloqueios).map((b) => paragrafo('erro', `Bloqueio: ${b.mensagem}`)),
    );
    li.append(acoes(i, ['editar', `Editar o item ${i + 1}`], ['tirar', `Tirar o item ${i + 1}`]));
    return li;
  }));
  $('sem-itens').hidden = montados.length > 0;
}

// Por que Imprimir e Copiar texto estão desligados, ou '' quando não estão. Com um bloqueio, não há impresso nem texto.
function desligados({ receitas, bloqueios }) {
  if (bloqueios.length) return 'Imprimir e Copiar texto ficam desligados enquanto houver bloqueio.';
  return receitas.length ? '' : 'Imprimir e Copiar texto ficam desligados: não há item na lista.';
}

// A barra: as Receitas que vão sair, os alertas e os bloqueios da lista inteira e das Receitas, e os botões.
function mostrarBarra(resultado) {
  const { receitas, alertas, bloqueios } = resultado;
  $('receitas-que-saem').textContent = receitas.length
    ? `Saem: ${receitas.map((r) => `${r.tipo}, ${contagem(r.itens.length, 'item', 'itens')}`).join(' · ')}.`
    : 'Nenhuma Receita sai.';
  $('avisos-da-barra').replaceChildren(
    ...alertas.map((a) => paragrafo('alerta', `Alerta: ${a.mensagem}`)),
    ...bloqueios.map((b) => paragrafo('erro', textoDoBloqueio(b))),
  );
  const motivo = desligados(resultado);
  $('imprimir').disabled = Boolean(motivo);
  $('copiar').disabled = Boolean(motivo);
  $('motivo-desligado').textContent = motivo;
  if (copiado !== null && textoParaColar(resultado) !== copiado) {
    copiado = null;
    $('copiado').textContent = '';
  }
}

// As linhas coladas que não voltaram, cada uma com o motivo, o texto e "descartar".
function mostrarNaoReconhecidas() {
  $('nao-reconhecidas').replaceChildren(...naoReconhecidas.map(({ texto, motivo }, i) => {
    const li = document.createElement('li');
    li.append(paragrafo('alerta', `Não voltou: ${motivo}.`), paragrafo('', texto), acoes(i, ['descartar', `Descartar a linha ${i + 1} que não voltou`]));
    return li;
  }));
}

const viasPorFolha = () => Number($('vias-por-folha').value);

function atualizar() {
  mostrarCampos();
  // O item do formulário vai no lugar dele na lista, porque o alerta de princípio ativo repetido depende dos outros.
  const posicao = editando ?? itens.length;
  const comOItem = montar(itens.toSpliced(posicao, editando === null ? 0 : 1, rascunho()));
  const item = comOItem.itens[posicao];
  const doItem = (lista) => lista.filter((x) => x.itens.includes(posicao));
  mostrarMensagens(item, doItem(comOItem.alertas), doItem(comOItem.bloqueios));
  $('bloco-justificativa').hidden = !item.alertas.some((a) => a.campo === 'justificativa');
  $('periodoDispensacao').placeholder = item.periodoDispensacaoPadrao ?? '';
  // A sugerida de cada Quantidade a dispensar, a do item ou a de cada Etapa, vai no campo dela.
  for (const el of form.querySelectorAll('[id$="quantidadeDispensar"]')) el.placeholder = '';
  for (const q of item.quantidadesSugeridas ?? []) $(q.campo).placeholder = q.sugerida ?? '';
  const ajuda = [item.conta && `Conta: ${item.conta}`, item.notaDaQuantidade, item.outraApresentacao?.texto].filter(Boolean).join(' · ');
  $('ajuda-quantidade').textContent = ajuda;
  $('conta-etapas').textContent = ajuda;
  // Só muda quando a Frase muda, para o leitor de tela não a repetir a cada tecla.
  const frase = item.frase ?? '';
  if ($('frase').textContent !== frase) $('frase').textContent = frase;
  $('titulo-item').textContent = editando === null ? 'Novo item' : `Editando o item ${editando + 1}`;
  $('salvar').textContent = editando === null ? 'Adicionar (Enter)' : 'Gravar (Enter)';
  $('limpar').textContent = editando === null ? 'Limpar (Esc)' : 'Cancelar (Esc)';
  const resultado = montar(itens);
  mostrarLista(resultado);
  mostrarBarra(resultado);
}

// Limpa o formulário para um item novo; na edição, o item da lista fica como estava. O cursor volta ao Medicamento.
function limpar() {
  editando = null;
  tentou = false;
  tocados.clear();
  form.reset();
  escolhido = null;
  fecharBusca();
  opcoesDoProduto();
  atualizar();
  focarMedicamento();
}

// Acrescenta o item ou grava a edição. O item com erro não entra: os erros aparecem, e o foco vai para o primeiro. O
// bloqueio não impede: ele aparece na linha do item.
function salvar() {
  const entrada = rascunho();
  const [{ erros }] = montar([entrada]).itens;
  if (erros.length) {
    tentou = true;
    atualizar();
    ($(idDoCampo(erros[0].campo)) ?? campoProduto).focus();
    return;
  }
  if (editando === null) itens.push(entrada);
  else itens[editando] = entrada;
  limpar();
}

function editar(posicao) {
  editando = posicao;
  tentou = false;
  tocados.clear();
  preencher(itens[posicao]);
  atualizar();
  focarMedicamento();
}

// Tirar o item em edição deixa o formulário com ele, como um item novo, que pode ser acrescentado de volta.
function tirar(posicao) {
  itens.splice(posicao, 1);
  if (editando === posicao) editando = null;
  else if (editando !== null && posicao < editando) editando -= 1;
  atualizar();
  focarMedicamento();
}

// O atalho preenche os campos, que continuam editáveis, e põe o cursor no campo preenchido. O "se necessário" só
// escolhe o tipo: a condição fica com o Prescritor.
function usarAtalho({ posologiaAtalho, campo, valor }) {
  if (posologiaAtalho) $('posologia').value = posologiaAtalho;
  if (campo === 'usoContinuo') $('usoContinuo').checked = true;
  else if (valor !== undefined) $(campo).value = valor;
  if (campo === 'duracao') {
    $('duracao-unidade').value = 'dia';
    $('usoContinuo').checked = false;
  }
  atualizar();
  $(campo).focus();
}

// A busca do Medicamento, no padrão ARIA de combobox: a lista abre a partir de 3 letras, com até 15 Produtos, os
// disponíveis na rede primeiro. As setas percorrem a lista, Enter escolhe, Esc fecha, e o clique também escolhe. O
// foco fica no campo, e o Produto em foco é o aria-activedescendant. Mexer no texto desfaz a escolha, para que o texto
// nunca fique diferente do Produto do item.
const MINIMO_DE_LETRAS = 3;
const MAXIMO_DE_RESULTADOS = 15;
let mostrados = [];
let ativo = -1;

function opcao(texto) {
  const li = document.createElement('li');
  li.setAttribute('role', 'option');
  li.append(texto);
  return li;
}

function abrirBusca() {
  const consulta = campoProduto.value.trim();
  if (consulta.length < MINIMO_DE_LETRAS) {
    fecharBusca();
    return;
  }
  const achados = buscarProdutos(catalogo, consulta);
  mostrados = achados.slice(0, MAXIMO_DE_RESULTADOS);
  const opcoes = mostrados.map((produto, i) => {
    const { rotulo, descricao } = descreverProduto(produto);
    const exige = notificacao(produto);
    const li = opcao(rotulo);
    li.id = `opcao-produto-${i}`;
    li.dataset.indice = String(i);
    li.setAttribute('aria-selected', 'false');
    li.append(paragrafo('descricao', [descricao, exige && `exige ${exige}`].filter(Boolean).join(' · ')));
    return li;
  });
  const produtos = (n) => (n === 1 ? '1 Produto' : `${n.toLocaleString('pt-BR')} Produtos`);
  const restantes = achados.length - mostrados.length;
  // A linha de aviso, que não se escolhe, e a contagem do leitor de tela.
  let aviso = null;
  let resumo = `${produtos(achados.length)} ${achados.length === 1 ? 'encontrado' : 'encontrados'}`;
  if (!achados.length) {
    aviso = 'Nenhum Produto encontrado';
    resumo = aviso;
  } else if (restantes) {
    aviso = `Mais ${produtos(restantes)}; digite mais do nome`;
    resumo = `${mostrados.length} de ${produtos(achados.length)}`;
  }
  if (aviso) {
    const li = opcao(aviso);
    li.className = 'sem-escolha';
    li.setAttribute('aria-disabled', 'true');
    opcoes.push(li);
  }
  listaDeProdutos.replaceChildren(...opcoes);
  listaDeProdutos.hidden = false;
  campoProduto.setAttribute('aria-expanded', 'true');
  ativar(-1);
  $('resumo-busca').textContent = resumo;
}

function fecharBusca() {
  listaDeProdutos.hidden = true;
  listaDeProdutos.replaceChildren();
  campoProduto.setAttribute('aria-expanded', 'false');
  campoProduto.removeAttribute('aria-activedescendant');
  $('resumo-busca').textContent = '';
  mostrados = [];
  ativo = -1;
}

// -1 é nenhum Produto em foco.
function ativar(indice) {
  ativo = indice;
  for (const li of listaDeProdutos.querySelectorAll('[data-indice]')) {
    const este = Number(li.dataset.indice) === indice;
    li.setAttribute('aria-selected', String(este));
    if (este) li.scrollIntoView({ block: 'nearest' });
  }
  if (indice < 0) campoProduto.removeAttribute('aria-activedescendant');
  else campoProduto.setAttribute('aria-activedescendant', `opcao-produto-${indice}`);
}

function escolherProduto(produto) {
  escolhido = produto;
  campoProduto.value = descreverProduto(produto).rotulo;
  fecharBusca();
  opcoesDoProduto();
  atualizar();
}

campoProduto.addEventListener('input', () => {
  if (escolhido) {
    escolhido = null;
    opcoesDoProduto();
  }
  abrirBusca();
});

// As setas vão do campo, sem Produto em foco, até o último e voltam ao campo. Com a lista aberta, Enter e Esc são dela;
// o formulário só os recebe com ela fechada.
campoProduto.addEventListener('keydown', (evento) => {
  const aberta = !listaDeProdutos.hidden;
  const ultimo = mostrados.length - 1;
  switch (evento.key) {
    case 'ArrowDown':
    case 'ArrowUp':
      evento.preventDefault();
      if (!aberta) abrirBusca();
      else if (mostrados.length && evento.key === 'ArrowDown') ativar(ativo === ultimo ? -1 : ativo + 1);
      else if (mostrados.length) ativar(ativo === -1 ? ultimo : ativo - 1);
      break;
    case 'Enter':
      if (!aberta) break;
      evento.preventDefault();
      if (ativo >= 0) escolherProduto(mostrados[ativo]);
      break;
    case 'Tab':
      if (aberta && ativo >= 0) escolherProduto(mostrados[ativo]);
      break;
    case 'Escape':
      if (!aberta) break;
      evento.preventDefault();
      fecharBusca();
      break;
    default:
  }
});
campoProduto.addEventListener('blur', fecharBusca);
// O clique na lista não tira o foco do campo, para o blur não a fechar antes do clique.
listaDeProdutos.addEventListener('mousedown', (evento) => evento.preventDefault());
listaDeProdutos.addEventListener('mouseover', ({ target }) => {
  const li = target.closest('[data-indice]');
  if (li) ativar(Number(li.dataset.indice));
});
listaDeProdutos.addEventListener('click', ({ target }) => {
  const li = target.closest('[data-indice]');
  if (li) escolherProduto(mostrados[Number(li.dataset.indice)]);
});

form.addEventListener('submit', (evento) => evento.preventDefault());
form.addEventListener('input', atualizar);
form.addEventListener('change', ({ target }) => {
  // O erro do Medicamento só aparece ao tentar acrescentar: enquanto o Prescritor busca, o campo fica sem Produto.
  if (target !== campoProduto) tocados.add(target.id);
  atualizar();
});
// Enter adiciona o item, ou grava a edição; Esc limpa o formulário, ou cancela a edição. Num botão, Enter é dele.
form.addEventListener('keydown', (evento) => {
  if (evento.defaultPrevented || evento.isComposing) return;
  if (evento.key === 'Enter' && !(evento.target instanceof HTMLButtonElement)) {
    evento.preventDefault();
    salvar();
  } else if (evento.key === 'Escape') {
    evento.preventDefault();
    limpar();
  }
});
for (const botao of form.querySelectorAll('.atalhos button')) botao.addEventListener('click', () => usarAtalho(botao.dataset));
$('salvar').addEventListener('click', salvar);
$('limpar').addEventListener('click', limpar);
$('itens').addEventListener('click', ({ target }) => {
  const botao = target.closest('button[data-acao]');
  if (botao?.dataset.acao === 'editar') editar(Number(botao.dataset.posicao));
  if (botao?.dataset.acao === 'tirar') tirar(Number(botao.dataset.posicao));
});
$('paciente-ficticio').addEventListener('change', () => {
  mostrarTopo();
  atualizar();
});
// A caixa troca a busca pelo texto livre, e as opções de Unidade de dose e de Via de administração com ela.
$('foraDoCatalogo').addEventListener('change', () => {
  opcoesDoProduto();
  atualizar();
  focarMedicamento();
});

// Renovar: os itens reconhecidos entram no fim da lista, e as linhas que não voltaram ficam no bloco, com o motivo. O
// campo é limpo depois de lido, para o mesmo texto não entrar duas vezes sem querer.
$('renovar').addEventListener('click', () => {
  const lido = renovar($('texto-renovar').value, { ...atendimento(), emissao: hoje(), catalogo, configuracao });
  itens.push(...lido.itens);
  naoReconhecidas.push(...lido.naoReconhecidas);
  $('texto-renovar').value = '';
  const entraram = lido.itens.length ? `${contagem(lido.itens.length, 'item entrou', 'itens entraram')} na lista.` : '';
  const ficaram = lido.naoReconhecidas.length ? `${contagem(lido.naoReconhecidas.length, 'linha não voltou', 'linhas não voltaram')}: veja abaixo.` : '';
  $('resultado-renovar').textContent = [entraram, ficaram].filter(Boolean).join(' ') || 'Nenhuma linha de item no texto colado.';
  mostrarNaoReconhecidas();
  atualizar();
});
// Descartada a linha, o foco vai para o "descartar" da linha seguinte, ou para o campo, se não sobrar nenhuma.
$('nao-reconhecidas').addEventListener('click', ({ target }) => {
  const botao = target.closest('button[data-acao="descartar"]');
  if (!botao) return;
  const posicao = Number(botao.dataset.posicao);
  naoReconhecidas.splice(posicao, 1);
  mostrarNaoReconhecidas();
  const botoes = $('nao-reconhecidas').querySelectorAll('button');
  (botoes[Math.min(posicao, botoes.length - 1)] ?? $('texto-renovar')).focus();
});

$('ver-previa').addEventListener('click', () => {
  const resultado = montar(itens);
  const { folhas, avisos } = folhasDoImpresso(resultado.receitas, viasPorFolha());
  $('avisos-previa').replaceChildren(
    ...resultado.bloqueios.map((b) => paragrafo('erro', textoDoBloqueio(b))),
    ...avisos.map((a) => paragrafo('alerta', a)),
  );
  $('folhas-previa').replaceChildren(...(folhas.length ? folhas : [paragrafo('vazio', 'Nenhuma Receita sai.')]));
  $('previa').showModal();
});
$('fechar-previa').addEventListener('click', () => $('previa').close());
$('imprimir').addEventListener('click', () => window.print());
// O papel leva as folhas da prévia, postas antes de imprimir, também no Ctrl+P. Com um bloqueio, não leva nenhuma.
window.addEventListener('beforeprint', () => {
  const resultado = montar(itens);
  $('impressao').replaceChildren(...(desligados(resultado) ? [] : folhasDoImpresso(resultado.receitas, viasPorFolha()).folhas));
});
$('copiar').addEventListener('click', async () => {
  const texto = textoParaColar(montar(itens));
  try {
    await navigator.clipboard.writeText(texto);
    copiado = texto;
    $('copiado').textContent = 'Copiado: cole na Receita manual do iSaúde.';
  } catch {
    copiado = null;
    $('copiado').textContent = 'Não foi possível copiar: o navegador não deixou usar a área de transferência.';
  }
});
// Nada é gravado: com itens na lista, fechar a página os perde, e o navegador pergunta antes.
window.addEventListener('beforeunload', (evento) => {
  if (itens.length) evento.preventDefault();
});

$('etapas').innerHTML = Array.from({ length: MAXIMO_DE_ETAPAS }, (_, i) => $('modelo-etapa').innerHTML
  .replaceAll('{i}', String(i)).replaceAll('{n}', String(i + 1))).join('');
preencherOpcoes($('sintoma'), Object.entries(CONDICOES_SE_NECESSARIO));
preencherOpcoes($('unidadeFornecimento'), UNIDADES_DE_FORNECIMENTO_DO_TEXTO_LIVRE.map((u) => [u, u]));
$('paciente-ficticio').replaceChildren(...demonstracao.pacientes.map((p) => new Option(p.nome, p.id)));
// A data de início em branco é a de emissão, e o calendário não oferece datas anteriores à de hoje.
$('inicio').min = hoje();

// Aberta direto, sem window.opener, a página é a demonstração. Aberta pelo Favorito, ela pede os dados à tela do
// iSaúde e espera; sem eles, vai para o erro e nunca cai na demonstração. O formulário e a barra só aparecem com os
// dados.
const PRAZO = 30000;
const NAO_CHEGARAM = 'Os dados do iSaúde não chegaram. Clique de novo no favorito.';
// O F5 apaga tudo, e a página não pede os dados de novo: a tela do iSaúde pode já estar em outro paciente.
const RECARREGADA = 'A página foi recarregada e apagou os dados. Clique de novo no favorito.';

function mostrarEstado(texto, erro = false) {
  $('estado').textContent = texto;
  $('estado').classList.toggle('erro', erro);
}

function comecar() {
  mostrarEstado('');
  $('principal').hidden = false;
  $('barra').hidden = false;
  mostrarTopo();
  opcoesDoProduto();
  atualizar();
  focarMedicamento();
}

// Só a 1ª mensagem da janela que abriu a página e da origem do iSaúde conta. Depois dela, ou do prazo, nenhuma.
function esperar() {
  mostrarEstado('Esperando os dados do iSaúde…');
  const parar = (lido) => {
    clearTimeout(prazo);
    window.removeEventListener('message', receber);
    if (lido.erro) mostrarEstado(lido.erro, true);
    else {
      recebido = lido;
      comecar();
    }
  };
  const receber = (evento) => {
    if (doIsaude(evento, window.opener)) parar(lerMensagem(evento.data));
  };
  const prazo = setTimeout(parar, PRAZO, { erro: NAO_CHEGARAM });
  window.addEventListener('message', receber);
  window.opener.postMessage({ tipo: 'pronto' }, ORIGEM_DO_ISAUDE);
}

if (!window.opener) comecar();
else if (performance.getEntriesByType('navigation')[0]?.type === 'reload') mostrarEstado(RECARREGADA, true);
else esperar();
