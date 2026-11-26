// O impresso compacto (spec da Fase 2, seção 4): as folhas que a prévia mostra e a impressão imprime, feitas das
// Receitas que a Montagem devolve. Só desenha. A única regra daqui é a das folhas, porque depende da altura medida no
// papel (ADR 0006): a repartição da Via em folhas e a troca para 1 Via por folha da Receita que não cabe na meia folha.
import { repartirEmFolhas } from './src/folhas.js';
import { quantidadeEmDestaque, nomeDosItens } from './src/texto.js';

// A altura útil da folha no papel, a do @media print de estilo.css, em px de CSS (96 por polegada).
const mm = (n) => (n * 96) / 25.4;
const ALTURA_DA_FOLHA = { retrato: mm(296.5), paisagem: mm(209.5) };

function elemento(tag, classe, ...filhos) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  el.append(...filhos);
  return el;
}

const negrito = (texto) => elemento('b', '', texto);

// O que tem data-so="inicio" sai só na 1ª folha da Via, e o que tem data-so="fim", só na última.
function so(parte, el) {
  el.dataset.so = parte;
  return el;
}

// As partes separadas por " · ", sem as que faltam: o campo opcional que falta simplesmente não sai.
function linha(classe, partes, tag = 'p') {
  const el = elemento(tag, classe);
  partes.filter(Boolean).forEach((parte, i) => el.append(...(i ? [' · ', parte] : [parte])));
  return el;
}

// Um bloco que a farmácia preenche, como a identificação do comprador: o título e uma linha em branco por campo. O bloco
// com mais de 2 campos os põe em duas colunas.
const blocoEmBranco = ({ titulo, campos }) => elemento('section', campos.length > 2 ? 'bloco-em-branco em-colunas' : 'bloco-em-branco',
  elemento('h4', '', titulo),
  elemento('dl', '', ...campos.flatMap((campo) => [elemento('dt', '', campo), elemento('dd')])));

// Um item em 2 linhas: o Produto, o uso e a Quantidade; embaixo, com recuo, a Dose, a Posologia e as recomendações. A
// justificativa do tratamento acima do limite vai numa 3ª linha, em cada Via.
const itemDaReceita = ({ numero, uso, partes, justificativa }) => elemento('li', 'item',
  elemento('p', 'cab', elemento('span', '', `${numero}. ${partes.medicamento} · uso ${uso}`), negrito(quantidadeEmDestaque(partes.quantidadeImpressa))),
  elemento('p', 'pos', [`${partes.doseEPosologia}.`, partes.recomendacoes].filter(Boolean).join(' ')),
  ...(justificativa ? [elemento('p', 'pos', `Justificativa: ${justificativa}`)] : []));

// O bloco de uma Via, sem brasão nem logo, igual com 1 e com 2 Vias por folha.
function blocoDaVia(receita, via) {
  const { cabecalho, paciente, assinatura, marca } = receita;
  const bloco = elemento('article', 'via');
  bloco.setAttribute('aria-label', [receita.tipo, via.rotulo].filter(Boolean).join(', '));
  if (marca) {
    const fundo = elemento('p', 'marca-fundo', marca);
    fundo.setAttribute('aria-hidden', 'true');
    bloco.append(fundo);
  }
  const doPaciente = linha('', [
    paciente.nome && negrito(paciente.nome),
    paciente.cpf && `CPF ${paciente.cpf}`,
    paciente.cns && `CNS ${paciente.cns}`,
    // "10/05/1960 – 66 anos", como no iSaúde.
    [paciente.nascimento, paciente.idade].filter(Boolean).join(' – '),
    paciente.sexo,
    paciente.contato,
  ]);
  doPaciente.prepend(negrito('Paciente:'), ' ');
  bloco.append(
    so('inicio', elemento('header', 'cabecalho',
      // O nome da unidade fecha as linhas institucionais e abre a linha seguinte: sai só nesta.
      linha('institucional', cabecalho.institucional.filter((l) => l !== cabecalho.unidade)),
      linha('', [cabecalho.unidade, `CNES ${cabecalho.cnes}`, cabecalho.endereco, cabecalho.telefone]))),
    linha('titulo', [receita.tipo, via.rotulo], 'h3'),
    // O endereço sai sempre, mesmo em branco: falta só fora do Modo demonstração, com alerta, para completar à mão.
    so('inicio', elemento('section', 'paciente', doPaciente, elemento('p', '', negrito('Endereço:'), ' ', paciente.endereco))),
    elemento('ol', 'itens', ...receita.itens.map(itemDaReceita)),
    elemento('footer', '',
      so('fim', elemento('div', 'assinatura',
        linha('', [negrito(assinatura.nome), assinatura.registro]),
        ...(assinatura.cargo ? [elemento('p', '', assinatura.cargo)] : []),
        elemento('p', '', assinatura.localEData))),
      ...(receita.camposEmBranco.length ? [so('fim', elemento('div', 'em-branco', ...receita.camposEmBranco.map(blocoEmBranco)))] : []),
      ...(marca ? [so('fim', elemento('p', 'marca', marca))] : []),
      // O rodapé de toda folha: o nome do paciente e "Folha {n} de {m}", contando as folhas desta Via.
      linha('rodape', [paciente.nome, elemento('span', 'contagem')])),
  );
  return bloco;
}

// Uma folha com os blocos das Vias: retrato com uma Via, paisagem com duas lado a lado.
function folha(blocos) {
  return elemento('div', blocos.length > 1 ? 'folha paisagem' : 'folha', ...blocos);
}

// O bloco da Via numa das folhas dela: o início só na que começa no 1º item, os itens de "de" até antes de "ate" e o fim
// só na última. A marca d'água, o Tipo de receita, o rótulo e o rodapé saem em todas.
function blocoNaFolha(bloco, [de, ate], ultima, contagem = 'Folha 1 de 1') {
  const copia = bloco.cloneNode(true);
  const fora = [
    ...(de > 0 ? copia.querySelectorAll('[data-so="inicio"]') : []),
    ...(ultima ? [] : copia.querySelectorAll('[data-so="fim"]')),
    ...[...copia.querySelector('.itens').children].filter((_, k) => k < de || k >= ate),
  ];
  for (const el of fora) el.remove();
  copia.querySelector('.contagem').textContent = contagem;
  return copia;
}

// Mede os blocos numa folha fora da vista, no tamanho do papel e sem a borda da prévia, que numa janela estreita se
// espreme.
function cabemNaFolha(blocos) {
  const medida = folha(blocos);
  medida.classList.add('medida');
  document.body.append(medida);
  const altura = medida.getBoundingClientRect().height;
  medida.remove();
  return altura <= ALTURA_DA_FOLHA[blocos.length > 1 ? 'paisagem' : 'retrato'];
}

// As folhas das Receitas com as Vias por folha escolhidas (ADR 0006): cada Via nas suas folhas A4 retrato, ou as 2 Vias
// da Receita lado a lado numa folha A4 paisagem. A Receita simples, de uma Via só, sai sempre na folha retrato. Os
// avisos dizem que Receita não coube com 2 Vias por folha.
export function folhasDoImpresso(receitas, viasPorFolha) {
  const avisos = [];
  const folhas = receitas.flatMap((receita) => {
    const blocos = receita.vias.map((via) => blocoDaVia(receita, via));
    const total = receita.itens.length;
    if (viasPorFolha === 2 && blocos.length === 2) {
      const ladoALado = blocos.map((bloco) => blocoNaFolha(bloco, [0, total], true));
      if (cabemNaFolha(ladoALado)) return [folha(ladoALado)];
      avisos.push(`Alerta (${receita.tipo}, ${nomeDosItens(receita.itens.map((i) => i.item))}): Itens demais para 2 Vias por folha: este Receituário sai com 1 Via por folha.`);
    }
    // Cada Via continua nas folhas seguintes, sem partir um item, contadas por Via.
    return blocos.flatMap((bloco) => {
      const faixas = repartirEmFolhas(total, (de, ate, ultima) => cabemNaFolha([blocoNaFolha(bloco, [de, ate], ultima)]));
      return faixas.map((faixa, i) => folha([blocoNaFolha(bloco, faixa, i === faixas.length - 1, `Folha ${i + 1} de ${faixas.length}`)]));
    });
  });
  return { folhas, avisos };
}
