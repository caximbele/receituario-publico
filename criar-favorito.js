// A página "Criar o favorito" (spec da Fase 3, seção 2): mostra o que falta e, com tudo preenchido, o link do Favorito
// com o Prescritor e as unidades dentro. Nada do que é digitado sai da memória da página.
import { linkDoFavorito } from './favorito.js';
import { dadosQueFaltam } from './src/montagem.js';
import { semAcento } from './src/produto.js';

const $ = (id) => document.getElementById(id);
const valor = (id) => $(id).value.trim();
// Como o Favorito compara: sem acentos, maiúsculas e espaços repetidos.
const normalizar = (nome) => semAcento(nome).replace(/\s+/g, ' ');

function lerUnidade(quadro) {
  const campo = (chave) => `unidades[${quadro.dataset.unidade}].${chave}`;
  const unidade = Object.fromEntries(['nome', 'cnes', 'endereco', 'telefone', 'municipio', 'uf'].map((c) => [c, valor(campo(c))]));
  unidade.cabecalho = $(campo('cabecalho')).value.split('\n').map((linha) => linha.trim()).filter(Boolean);
  return { nomeNoIsaude: valor(campo('nomeNoIsaude')), unidade };
}

// O `config` do Favorito. Toda chave do Prescritor e da unidade vai como texto, o cargo inclusive: a página do
// Receituário recusa a mensagem com uma chave que não é texto.
const lerConfig = () => ({
  endereco: new URL('index.html', location.href).href,
  nomeNoIsaude: valor('prescritor.nomeNoIsaude'),
  prescritor: Object.fromEntries(['nome', 'conselho', 'numero', 'uf', 'cargo'].map((c) => [c, valor(`prescritor.${c}`)])),
  unidades: [...$('unidades').children].map(lerUnidade),
});

// O que a Montagem exige, e o que o Favorito precisa para conferir: um nome no iSaúde vazio nunca bate, e com dois
// nomes iguais ele escolheria sempre a primeira unidade.
function oQueFalta({ nomeNoIsaude, prescritor, unidades }) {
  const exigidos = (dono, entrada) => dadosQueFaltam({ prescritor: {}, unidade: {}, demonstracao: true, ...entrada })
    .filter(({ campo }) => campo.startsWith(dono)).map(({ mensagem }) => mensagem);
  const nomes = unidades.map((u) => normalizar(u.nomeNoIsaude)).filter(Boolean);
  return [
    ...exigidos('prescritor.', { prescritor }),
    ...(nomeNoIsaude ? [] : ['Falta o nome do Prescritor no iSaúde.']),
    ...unidades.flatMap((u, i) => [
      ...exigidos('unidade.', { unidade: u.unidade }),
      ...(u.nomeNoIsaude ? [] : ['Falta o nome da unidade no iSaúde.']),
    ].map((mensagem) => mensagem.replace(/\.$/, ` (unidade ${i + 1}).`))),
    ...(new Set(nomes).size < nomes.length ? ['Duas unidades com o mesmo nome no iSaúde.'] : []),
  ];
}

function atualizar() {
  [...$('unidades').children].forEach((quadro, i) => { quadro.querySelector('legend').textContent = `Unidade ${i + 1}`; });
  const config = lerConfig();
  const faltam = oQueFalta(config);
  // Só redesenha quando a lista muda: o leitor de tela relê a região a cada troca.
  const texto = faltam.join('\n') || 'Nada falta. O link do favorito está abaixo.';
  if ($('faltam').dataset.texto !== texto) {
    $('faltam').dataset.texto = texto;
    const lista = document.createElement('ul');
    lista.replaceChildren(...faltam.map((mensagem) => Object.assign(document.createElement('li'), { textContent: mensagem })));
    const nada = Object.assign(document.createElement('p'), { textContent: texto });
    $('faltam').replaceChildren(faltam.length ? lista : nada);
  }
  $('bloco-link').hidden = faltam.length > 0;
  if (faltam.length) $('link-favorito').removeAttribute('href');
  else $('link-favorito').href = linkDoFavorito(config);
  $('endereco').textContent = config.endereco;
}

let proxima = 0;
function acrescentarUnidade() {
  const i = proxima++;
  $('unidades').insertAdjacentHTML('beforeend', $('modelo-unidade').innerHTML.replaceAll('{i}', String(i)));
  const quadro = $('unidades').lastElementChild;
  const tirar = quadro.querySelector('.tirar');
  // A 1ª unidade fica sempre.
  if (i === 0) tirar.parentElement.remove();
  else tirar.addEventListener('click', () => {
    quadro.remove();
    $('acrescentar-unidade').focus();
    atualizar();
  });
  atualizar();
  return quadro;
}

$('dados').addEventListener('input', atualizar);
$('acrescentar-unidade').addEventListener('click', () => acrescentarUnidade().querySelector('input').focus());
acrescentarUnidade();
